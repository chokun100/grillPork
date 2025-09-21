import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/button';
import { Card, CardHeader, CardBody, CardFooter, Badge, Select, SelectItem, Pagination } from '@heroui/react';
import { useAuth } from '@/contexts/AuthContext';
import DefaultLayout from '@/layouts/default';
import { API_BASE_URL } from '@/config/api';
import {
  RectangleStackIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

// Define TypeScript interface for Table data
interface Table {
  id: string;
  code: string;
  name: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
  currentBillId?: string;
  currentBill?: {
    id: string;
    status: string;
    adultCount: number;
    childCount: number;
    openedAt: string;
    totalGross?: number;
  };
  createdAt: string;
  updatedAt: string;
}

const statusBadges = {
  AVAILABLE: { color: "success" as const, label: 'ว่าง' as const },
  OCCUPIED: { color: "warning" as const, label: 'มีลูกค้า' as const },
  RESERVED: { color: "primary" as const, label: 'จองแล้ว' as const },
  MAINTENANCE: { color: "danger" as const, label: 'ซ่อมบำรุง' as const },
} as const;

const statusOptions = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'AVAILABLE', label: 'ว่าง' },
  { key: 'OCCUPIED', label: 'มีลูกค้า' },
  { key: 'RESERVED', label: 'จองแล้ว' },
  { key: 'MAINTENANCE', label: 'ซ่อมบำรุง' },
];

const pageSizeOptions = [
  { key: '10', label: '10' },
  { key: '20', label: '20' },
  { key: '30', label: '30' },
  { key: '40', label: '40' },
  { key: '50', label: '50' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [allTables, setAllTables] = useState<Table[]>([]);
  const [filteredTables, setFilteredTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('AVAILABLE');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch tables data from API
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/tables`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.ok) {
          setAllTables(data.data);
        } else {
          setError(data.error?.message || 'Failed to fetch tables');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  // Filter tables based on status
  useEffect(() => {
    let filtered = allTables;
    
    if (statusFilter !== 'all') {
      filtered = allTables.filter(table => table.status === statusFilter);
    }
    
    setFilteredTables(filtered);
    setCurrentPage(1); // Reset to first page when filter changes
  }, [allTables, statusFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTables.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTables = filteredTables.slice(startIndex, startIndex + pageSize);

  // Calculate counts for summary cards
  const availableCount = allTables.filter(t => t.status === 'AVAILABLE').length;
  const occupiedCount = allTables.filter(t => t.status === 'OCCUPIED').length;
  const maintenanceCount = allTables.filter(t => t.status === 'MAINTENANCE').length;

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircleIcon className="w-5 h-5" />,
          text: 'ว่าง'
        };
      case 'OCCUPIED':
        return {
          color: 'bg-red-100 text-red-800',
          icon: <XCircleIcon className="w-5 h-5" />,
          text: 'มีลูกค้า'
        };
      case 'RESERVED':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: <ClockIcon className="w-5 h-5" />,
          text: 'จองแล้ว'
        };
      case 'MAINTENANCE':
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: <XCircleIcon className="w-5 h-5" />,
          text: 'ซ่อมบำรุง'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: <XCircleIcon className="w-5 h-5" />,
          text: 'ไม่ทราบสถานะ'
        };
    }
  };

  // Handle table card click
  const handleTableClick = (table: Table) => {
    window.location.href = `/tables`;
  };

  // Render loading state
  if (loading) {
    return (
      <DefaultLayout>
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  // Render error state
  if (error) {
    return (
      <DefaultLayout>
        <div className="p-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">แดชบอร์ด</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-content1">
              <span className="text-sm text-foreground/80">ยินดีต้อนรับ, {user?.name}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <h3 className="text-xl font-semibold text-success">โต๊ะว่าง</h3>
            </CardHeader>
            <CardBody className="text-center">
              <p className="text-4xl font-bold text-success">{availableCount}</p>
            </CardBody>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <h3 className="text-xl font-semibold text-warning">โต๊ะใช้งาน</h3>
            </CardHeader>
            <CardBody className="text-center">
              <p className="text-4xl font-bold text-warning">{occupiedCount}</p>
            </CardBody>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <h3 className="text-xl font-semibold text-danger">ซ่อมบำรุง</h3>
            </CardHeader>
            <CardBody className="text-center">
              <p className="text-4xl font-bold text-danger">{maintenanceCount}</p>
            </CardBody>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {statusFilter === 'AVAILABLE' ? 'โต๊ะว่าง' :
                 statusFilter === 'OCCUPIED' ? 'โต๊ะที่มีลูกค้า' :
                 statusFilter === 'RESERVED' ? 'โต๊ะที่จองแล้ว' :
                 statusFilter === 'MAINTENANCE' ? 'โต๊ะซ่อมบำรุง' : 'ทั้งหมด'}
              </h2>
              <p className="text-sm text-foreground/60">พบ {filteredTables.length} โต๊ะ</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                label="สถานะ"
                placeholder="เลือกสถานะ"
                selectedKeys={[statusFilter]}
                onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string)}
                className="min-w-[150px]"
              >
                {statusOptions.map((option) => (
                  <SelectItem key={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label="จำนวนต่อหน้า"
                placeholder="เลือกจำนวน"
                selectedKeys={[pageSize.toString()]}
                onSelectionChange={(keys) => setPageSize(Number(Array.from(keys)[0]))}
                className="min-w-[120px]"
              >
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </CardHeader>
          <CardBody>
            {paginatedTables.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {paginatedTables.map((table) => {
                    const statusInfo = getStatusInfo(table.status);
                    return (
                      <Card
                        key={table.id}
                        isPressable
                        className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                        onClick={() => handleTableClick(table)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start w-full">
                            <div className="flex items-center space-x-2">
                              <RectangleStackIcon className="w-6 h-6 text-blue-500" />
                              <h3 className="text-lg font-semibold">{table.name}</h3>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${statusInfo.color}`}>
                              {statusInfo.icon}
                              <span>{statusInfo.text}</span>
                            </span>
                          </div>
                        </CardHeader>
                        <CardBody>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">รหัส:</span>
                              <span className="text-sm font-medium">{table.code}</span>
                            </div>
                            {table.currentBill && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">บิล:</span>
                                <span className="text-sm font-medium">#{table.currentBill.id.slice(-6)}</span>
                              </div>
                            )}
                            {table.currentBill && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">ลูกค้า:</span>
                                <span className="text-sm font-medium flex items-center">
                                  <UserIcon className="w-4 h-4 mr-1" />
                                  {table.currentBill.adultCount + table.currentBill.childCount}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <Pagination
                      total={totalPages}
                      page={currentPage}
                      onChange={setCurrentPage}
                      color="primary"
                      variant="bordered"
                      showControls
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <XCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบโต๊ะ</h3>
                <p className="mt-1 text-sm text-gray-500">ไม่พบโต๊ะที่ตรงกับเงื่อนไขที่คุณเลือก</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </DefaultLayout>
  );
}
