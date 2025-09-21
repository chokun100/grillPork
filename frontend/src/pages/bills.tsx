import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DefaultLayout from "@/layouts/default";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Card,
  CardBody,
  Input,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
  Pagination,
  PaginationPrevious,
  PaginationNext,
  PaginationItem,
  PaginationEllipsis,
  Select,
  SelectItem,
  Divider,
} from "@heroui/react";
import {
  MagnifyingGlassIcon as SearchIcon,
  DocumentTextIcon,
  EyeIcon,
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";

// Interfaces
interface Bill {
  id: string;
  status: "OPEN" | "CLOSED" | "VOID";
  adultCount: number;
  childCount: number;
  adultPriceGross: number;
  subtotalGross: number;
  vatAmount: number;
  totalGross: number;
  paidAmount: number;
  paymentMethod?: string;
  openedAt: string;
  closedAt?: string;
  table: {
    code: string;
    name: string;
  };
  customer?: {
    name?: string;
    phone?: string;
  };
  openedBy: {
    name: string;
    role: string;
  };
  closedBy?: {
    name: string;
    role: string;
  };
}

interface BillsResponse {
  ok: boolean;
  data: Bill[];
}

const getStatusColor = (status: string): "success" | "warning" | "danger" | "default" => {
  switch (status) {
    case "OPEN":
      return "warning";
    case "CLOSED":
      return "success";
    case "VOID":
      return "danger";
    default:
      return "default";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "OPEN":
      return <ClockIcon className="w-4 h-4" />;
    case "CLOSED":
      return <CheckCircleIcon className="w-4 h-4" />;
    case "VOID":
      return <XCircleIcon className="w-4 h-4" />;
    default:
      return null;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(amount);
};

export default function BillsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const billsPerPage = 10;
  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.customer?.phone || "").includes(searchTerm);
    const matchesStatus = statusFilter === "all" || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * billsPerPage,
    currentPage * billsPerPage
  );

  const totalPages = Math.ceil(filteredBills.length / billsPerPage);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/bills`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: BillsResponse = await response.json();
        if (data.ok) {
          setBills(data.data);
        } else {
          setError(data.error?.message || "Failed to fetch bills");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchBills();
    }
  }, [token]);

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<{ qrBase64: string; payload: string; amount: number; phone: string } | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    onOpen();
  };

  const handleGenerateQR = async (bill: Bill) => {
    if (!bill.customer?.phone) {
      alert('บิลนี้ไม่มีเบอร์โทรลูกค้า กรุณาเพิ่มข้อมูลลูกค้าก่อน');
      return;
    }

    try {
      setGeneratingQR(true);
      const response = await fetch(`${API_BASE_URL}/bills/${bill.id}/qr-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: bill.totalGross - bill.paidAmount
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        setQrData(data.data);
        setShowQRModal(true);
      } else {
        alert(data.error?.message || 'Failed to generate QR code');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setGeneratingQR(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <DefaultLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">จัดการบิล</h1>
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (error) {
    return (
      <DefaultLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">จัดการบิล</h1>
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">จัดการบิล</h1>
          <p className="mt-2 text-gray-600">ดูและจัดการบิลทั้งหมดในระบบ</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardBody className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <Input
                placeholder="ค้นหาบิล รหัสโต๊ะ หรือเบอร์โทร"
                startContent={<SearchIcon className="w-4 h-4" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Select
                label="กรองตามสถานะ"
                selectedKeys={statusFilter}
                onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string || "all")}
                className="max-w-xs"
              >
                <SelectItem key="all">
                  ทุกสถานะ
                </SelectItem>
                <SelectItem key="OPEN">
                  เปิดอยู่
                </SelectItem>
                <SelectItem key="CLOSED">
                  ชำระแล้ว
                </SelectItem>
                <SelectItem key="VOID">
                  ยกเลิก
                </SelectItem>
              </Select>
              <div className="text-sm text-gray-500">
                พบ {filteredBills.length} บิล
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Bills Table */}
        <Card>
          <Table aria-label="Bills table">
            <TableHeader>
              <TableColumn>รหัสบิล</TableColumn>
              <TableColumn>โต๊ะ</TableColumn>
              <TableColumn>ลูกค้า</TableColumn>
              <TableColumn>จำนวนคน</TableColumn>
              <TableColumn>ยอดรวม</TableColumn>
              <TableColumn>ชำระแล้ว</TableColumn>
              <TableColumn>สถานะ</TableColumn>
              <TableColumn>เปิดเมื่อ</TableColumn>
              <TableColumn>การดำเนินการ</TableColumn>
            </TableHeader>
            <TableBody>
              {paginatedBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell>#{bill.id.slice(-6)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{bill.table.name}</p>
                      <p className="text-sm text-gray-500">{bill.table.code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {bill.customer ? (
                      <div>
                        <p className="font-medium">
                          {bill.customer.name || bill.customer.phone}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">ไม่ระบุ</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {bill.adultCount} ผู้ใหญ่, {bill.childCount} เด็ก
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(bill.totalGross)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(bill.paidAmount)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={getStatusColor(bill.status)}
                      startContent={getStatusIcon(bill.status)}
                      size="sm"
                    >
                      {bill.status === "OPEN"
                        ? "เปิดอยู่"
                        : bill.status === "CLOSED"
                        ? "ชำระแล้ว"
                        : "ยกเลิก"}
                    </Chip>
                  </TableCell>
                  <TableCell>{formatDate(bill.openedAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        startContent={<EyeIcon className="w-4 h-4" />}
                        onPress={() => handleViewBill(bill)}
                      >
                        ดูรายละเอียด
                      </Button>
                      {bill.status === 'OPEN' && bill.customer?.phone && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="success"
                          startContent={<QrCodeIcon className="w-4 h-4" />}
                          onPress={() => handleGenerateQR(bill)}
                          isLoading={generatingQR}
                        >
                          PromptPay QR
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredBills.length === 0 && (
            <CardBody className="text-center py-12">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่มีบิล</h3>
              <p className="text-gray-500">ยังไม่มีบิลในระบบ</p>
            </CardBody>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-700">
              แสดงหน้า {currentPage} จาก {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="light"
                isDisabled={currentPage === 1}
                onPress={() => handlePageChange(currentPage - 1)}
                startContent={<ChevronLeftIcon className="w-4 h-4" />}
              >
                ก่อนหน้า
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage > 2 ? currentPage - 2 + i : i + 1;
                return (
                  <Button
                    key={pageNum}
                    size="sm"
                    variant={currentPage === pageNum ? "solid" : "light"}
                    color="primary"
                    onPress={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                size="sm"
                variant="light"
                isDisabled={currentPage === totalPages}
                onPress={() => handlePageChange(currentPage + 1)}
                endContent={<ChevronRightIcon className="w-4 h-4" />}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}

        {/* Bill Details Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="5xl">
          <ModalContent>
            {(onCloseModal: () => void) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <DocumentTextIcon className="w-6 h-6 text-blue-500" />
                    <span className="text-xl font-bold">
                      รายละเอียดบิล #{selectedBill?.id.slice(-6)}
                    </span>
                  </div>
                </ModalHeader>
                <ModalBody>
                  {selectedBill && (
                    <div className="space-y-6">
                      {/* Bill Info */}
                      <Card>
                        <CardBody className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">โต๊ะ</p>
                              <p className="font-medium">{selectedBill.table.name}</p>
                              <p className="text-sm text-gray-500">{selectedBill.table.code}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">สถานะ</p>
                              <Chip
                                color={getStatusColor(selectedBill.status)}
                                startContent={getStatusIcon(selectedBill.status)}
                              >
                                {selectedBill.status === "OPEN"
                                  ? "เปิดอยู่"
                                  : selectedBill.status === "CLOSED"
                                  ? "ชำระแล้ว"
                                  : "ยกเลิก"}
                              </Chip>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">เปิดเมื่อ</p>
                              <p className="font-medium">{formatDate(selectedBill.openedAt)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">เปิดโดย</p>
                              <p className="font-medium">{selectedBill.openedBy.name}</p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      {/* Customer Info */}
                      {selectedBill.customer && (
                        <Card>
                          <CardBody className="p-4">
                            <h3 className="font-medium mb-3">ข้อมูลลูกค้า</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">ชื่อ</p>
                                <p className="font-medium">{selectedBill.customer.name || "ไม่ระบุ"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">เบอร์โทร</p>
                                <p className="font-medium">{selectedBill.customer.phone}</p>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      )}

                      {/* Billing Details */}
                      <Card>
                        <CardBody className="p-4">
                          <h3 className="font-medium mb-4">รายละเอียดการเรียกเก็บเงิน</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">ผู้ใหญ่</span>
                              <span className="font-medium">{selectedBill.adultCount} คน</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">เด็ก</span>
                              <span className="font-medium">{selectedBill.childCount} คน</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">ราคาต่อคน (รวม VAT)</span>
                              <span className="font-medium">{formatCurrency(selectedBill.adultPriceGross)}</span>
                            </div>
                            <Divider />
                            <div className="flex justify-between font-semibold">
                              <span>ยอดรวม</span>
                              <span>{formatCurrency(selectedBill.totalGross)}</span>
                            </div>
                            {selectedBill.paidAmount > 0 && (
                              <>
                                <Divider />
                                <div className="flex justify-between">
                                  <span className="text-gray-600">ชำระแล้ว</span>
                                  <span className="font-medium">{formatCurrency(selectedBill.paidAmount)}</span>
                                </div>
                                <div className="flex justify-between text-green-600 font-semibold">
                                  <span>เงินทอน</span>
                                  <span>
                                    {formatCurrency(selectedBill.paidAmount - selectedBill.totalGross)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </CardBody>
                      </Card>

                      {/* Payment Info */}
                      {selectedBill.paymentMethod && (
                        <Card>
                          <CardBody className="p-4">
                            <h3 className="font-medium mb-3">ข้อมูลการชำระเงิน</h3>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">วิธีการชำระ</span>
                                <span className="font-medium capitalize">{selectedBill.paymentMethod}</span>
                              </div>
                              {selectedBill.closedAt && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">ชำระเมื่อ</span>
                                  <span className="font-medium">{formatDate(selectedBill.closedAt)}</span>
                                </div>
                              )}
                              {selectedBill.closedBy && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">ชำระโดย</span>
                                  <span className="font-medium">{selectedBill.closedBy.name}</span>
                                </div>
                              )}
                            </div>
                          </CardBody>
                        </Card>
                      )}
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onCloseModal}>
                    ปิด
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </DefaultLayout>
  );
}