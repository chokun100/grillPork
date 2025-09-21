import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DefaultLayout from "@/layouts/default";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Divider,
  useDisclosure
} from "@heroui/react";
import {
  RectangleStackIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentDuplicateIcon,
  ArrowRightIcon,
  PlusIcon,
  PhoneIcon,
  UsersIcon,
  CurrencyYenIcon,
  CreditCardIcon,
  QrCodeIcon
} from "@heroicons/react/24/outline";

// Define TypeScript interfaces
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

interface Bill {
  id: string;
  status: "OPEN" | "CLOSED" | "VOID";
  adultCount: number;
  childCount: number;
  adultPriceGross: number;
  discountType: "NONE" | "PERCENT" | "AMOUNT";
  discountValue: number;
  promoApplied?: string;
  loyaltyFreeApplied: boolean;
  subtotalGross: number;
  vatAmount: number;
  totalGross: number;
  paidAmount: number;
  paymentMethod?: string;
  notes?: string;
  openedAt: string;
  closedAt?: string;
  table: {
    code: string;
    name: string;
  };
  customer?: {
    id: string;
    name?: string;
    phone?: string;
    loyaltyStamps: number;
  };
  openedBy: {
    id: string;
    name: string;
    role: string;
  };
  closedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

interface PricingPreview {
  adultPriceGross: number;
  subtotalGross: number;
  vatAmount: number;
  totalGross: number;
}

export default function TablesPage() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [openingBill, setOpeningBill] = useState(false);
  const [updatingBill, setUpdatingBill] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Form states
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [customerPhone, setCustomerPhone] = useState("");
  const [pricingPreview, setPricingPreview] = useState<PricingPreview | null>(null);
  
  // Payment states
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCheckinUrl, setQrCheckinUrl] = useState("");
  
  // Modal states
  const { isOpen: isDetailsModalOpen, onOpen: onDetailsModalOpen, onClose: onDetailsModalClose } = useDisclosure();
  const { isOpen: isConfirmModalOpen, onOpen: onConfirmModalOpen, onClose: onConfirmModalClose } = useDisclosure();

  // Fetch tables data from API
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/tables`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.ok) {
          setTables(data.data);
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

  // Fetch bill details
  const fetchBillDetails = async (billId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bills/${billId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        setBill(data.data);
      } else {
        setError(data.error?.message || 'Failed to fetch bill');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  // Calculate pricing preview
  useEffect(() => {
    const calculatePricing = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.ok) {
          const settings = data.data;
          const subtotalGross = adultCount * settings.adultPriceGross;
          const vatAmount = subtotalGross * (settings.vatRate / 100);
          const totalGross = subtotalGross + vatAmount;
          
          setPricingPreview({
            adultPriceGross: settings.adultPriceGross,
            subtotalGross,
            vatAmount,
            totalGross
          });
        }
      } catch (err) {
        console.error('Failed to calculate pricing:', err);
      }
    };

    if (adultCount > 0) {
      calculatePricing();
    }
  }, [adultCount, childCount]);

  // Handle opening a new bill
  const handleOpenBill = async () => {
    if (!selectedTable) return;
    
    try {
      setOpeningBill(true);
      console.log('Sending request with token:', token);
      const response = await fetch(`${API_BASE_URL}/tables/${selectedTable.id}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adultCount,
          childCount,
          customerPhone: customerPhone || undefined
        })
      });
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Clone the response to read the text
      const responseText = await response.clone().text();
      console.log('Response text:', responseText);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid or expired
          console.error('Authentication failed. Response:', data);
          alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
          logout();
          navigate('/login');
          return;
        }
        // Display more detailed error information
        const errorMessage = data.error?.message || `HTTP error! status: ${response.status}`;
        console.error('API Error:', data);
        alert(`เกิดข้อผิดพลาด: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      if (data.ok) {
        // Refresh tables data
        const tablesResponse = await fetch(`${API_BASE_URL}/tables`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (tablesResponse.ok) {
          const tablesData = await tablesResponse.json();
          if (tablesData.ok) {
            setTables(tablesData.data);
          }
        }
        
        onConfirmModalClose();
        setAdultCount(1);
        setChildCount(0);
        setCustomerPhone("");
      } else {
        setError(data.error?.message || 'Failed to open bill');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setOpeningBill(false);
    }
  };

  // Handle updating bill
  const handleUpdateBill = async () => {
    if (!bill) return;

    try {
      setUpdatingBill(true);
      const response = await fetch(`${API_BASE_URL}/bills/${bill.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adultCount,
          childCount
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        setBill(data.data);
      } else {
        setError(data.error?.message || 'Failed to update bill');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setUpdatingBill(false);
    }
  };

  // Handle payment
  const handlePayment = async () => {
    if (!bill || !paymentAmount) return;

    try {
      setProcessingPayment(true);
      const response = await fetch(`${API_BASE_URL}/bills/${bill.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        // Refresh tables data
        const tablesResponse = await fetch(`${API_BASE_URL}/tables`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (tablesResponse.ok) {
          const tablesData = await tablesResponse.json();
          if (tablesData.ok) {
            setTables(tablesData.data);
          }
        }
        
        // Refresh bill data
        const billResponse = await fetch(`${API_BASE_URL}/bills/${bill.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (billResponse.ok) {
          const billData = await billResponse.json();
          if (billData.ok) {
            setBill(billData.data);
          }
        }
        
        setShowPaymentModal(false);
        setPaymentAmount("");
      } else {
        setError(data.error?.message || 'Failed to process payment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle table card click
  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    
    if (table.status === 'AVAILABLE') {
      // Show confirmation modal for available tables
      onConfirmModalOpen();
    } else {
      // Show details modal for occupied/reserved tables
      onDetailsModalOpen();
      
      // If table has a current bill, fetch bill details
      if (table.currentBillId) {
        fetchBillDetails(table.currentBillId);
      }
    }
  };

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
          color: 'bg-yellow-100 text-yellow-800',
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

  // Get status color for chip
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'success' as const;
      case 'OCCUPIED':
        return 'warning' as const;
      case 'RESERVED':
        return 'primary' as const;
      case 'MAINTENANCE':
        return 'danger' as const;
      case 'OPEN':
        return 'warning' as const;
      case 'CLOSED':
        return 'success' as const;
      case 'VOID':
        return 'danger' as const;
      default:
        return 'default' as const;
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'ว่าง';
      case 'OCCUPIED':
        return 'มีลูกค้า';
      case 'RESERVED':
        return 'จองแล้ว';
      case 'MAINTENANCE':
        return 'ซ่อมบำรุง';
      case 'OPEN':
        return 'เปิดอยู่';
      case 'CLOSED':
        return 'ปิดแล้ว';
      case 'VOID':
        return 'ยกเลิก';
      default:
        return status;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  // Render loading state
  if (loading) {
    return (
      <DefaultLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">จัดการโต๊ะ</h1>
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
          <h1 className="text-2xl font-bold mb-6">จัดการโต๊ะ</h1>
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
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">จัดการโต๊ะ</h1>
          <p className="mt-2 text-gray-600">คลิกที่การ์ดโต๊ะเพื่อดูรายละเอียด</p>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table) => {
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

        {/* Table Details Modal */}
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={onDetailsModalClose}
          size="2xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose: () => void) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <div className="flex items-center space-x-2">
                    <RectangleStackIcon className="w-6 h-6 text-blue-500" />
                    <span className="text-xl font-bold">
                      {selectedTable?.name} ({selectedTable?.code})
                    </span>
                  </div>
                </ModalHeader>
                <ModalBody>
                  {selectedTable && (
                    <div className="space-y-4">
                      {/* Status */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-700 font-medium">สถานะ:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${getStatusInfo(selectedTable.status).color}`}>
                          {getStatusInfo(selectedTable.status).icon}
                          <span>{getStatusInfo(selectedTable.status).text}</span>
                        </span>
                      </div>

                      {/* Bill Management */}
                      {bill ? (
                        <div className="space-y-4">
                          {/* Bill Summary */}
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                              <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                              ข้อมูลบิลปัจจุบัน
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">รหัสบิล:</span>
                                  <span className="font-medium">#{bill.id.slice(-6)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">สถานะ:</span>
                                  <span className="font-medium">{getStatusText(bill.status)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">เปิดโดย:</span>
                                  <span className="font-medium">{bill.openedBy.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">เวลาเปิด:</span>
                                  <span className="font-medium">{formatDate(bill.openedAt)}</span>
                                </div>
                                {bill.closedAt && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">เวลาปิด:</span>
                                    <span className="font-medium">{formatDate(bill.closedAt)}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">ผู้ใหญ่:</span>
                                  <span className="font-medium">{bill.adultCount} คน</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">เด็ก:</span>
                                  <span className="font-medium">{bill.childCount} คน</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">ราคาต่อคน:</span>
                                  <span className="font-medium">{formatCurrency(bill.adultPriceGross)}</span>
                                </div>
                                {bill.customer && (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">ลูกค้า:</span>
                                      <span className="font-medium">
                                        {bill.customer.name || bill.customer.phone}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">แต้มสะสม:</span>
                                      <span className="font-medium">{bill.customer.loyaltyStamps} แต้ม</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bill Actions */}
                          {bill.status === 'OPEN' && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-3">การจัดการบิล</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <Button
                                  color="primary"
                                  variant="flat"
                                  size="sm"
                                  onClick={() => {
                                    setAdultCount(bill.adultCount);
                                    setChildCount(bill.childCount);
                                  }}
                                >
                                  แก้ไขข้อมูล
                                </Button>
                                <Button
                                  color="success"
                                  variant="flat"
                                  size="sm"
                                  onClick={() => {
                                    setPaymentAmount(bill.totalGross.toString());
                                    setShowPaymentModal(true);
                                  }}
                                >
                                  ชำระเงิน
                                </Button>
                                <Button
                                  color="primary"
                                  variant="flat"
                                  size="sm"
                                  onClick={() => setShowQRModal(true)}
                                >
                                  QR Code
                                </Button>
                              </div>
                              
                              {/* Edit Form */}
                              {(adultCount !== bill.adultCount || childCount !== bill.childCount) && (
                                <div className="mt-4 p-4 bg-white rounded-lg border">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <Input
                                      type="number"
                                      label="จำนวนผู้ใหญ่"
                                      value={adultCount.toString()}
                                      onChange={(e) => setAdultCount(parseInt(e.target.value) || 1)}
                                      min="1"
                                      size="sm"
                                    />
                                    <Input
                                      type="number"
                                      label="จำนวนเด็ก"
                                      value={childCount.toString()}
                                      onChange={(e) => setChildCount(parseInt(e.target.value) || 0)}
                                      min="0"
                                      size="sm"
                                    />
                                  </div>
                                  {pricingPreview && (
                                    <div className="bg-gray-50 p-3 rounded-lg space-y-2 mb-4">
                                      <div className="flex justify-between">
                                        <span>ราคาต่อคน:</span>
                                        <span>{formatCurrency(pricingPreview.adultPriceGross)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>รวมก่อน VAT:</span>
                                        <span>{formatCurrency(pricingPreview.subtotalGross)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>VAT (7%):</span>
                                        <span>{formatCurrency(pricingPreview.vatAmount)}</span>
                                      </div>
                                      <Divider />
                                      <div className="flex justify-between font-semibold">
                                        <span>ยอดรวม:</span>
                                        <span>{formatCurrency(pricingPreview.totalGross)}</span>
                                      </div>
                                    </div>
                                  )}
                                  <Button
                                    color="primary"
                                    onClick={handleUpdateBill}
                                    isLoading={updatingBill}
                                    className="w-full"
                                    size="sm"
                                  >
                                    อัปเดตข้อมูล
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bill History */}
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-3">ประวัติการชำระเงิน</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">ยอดรวม:</span>
                                <span className="font-medium">{formatCurrency(bill.totalGross)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">วิธีการชำระเงิน:</span>
                                <span className="font-medium">
                                  {bill.paymentMethod || 'ยังไม่ได้ชำระ'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">จำนวนเงินที่ชำระ:</span>
                                <span className="font-medium">
                                  {bill.paidAmount > 0 ? formatCurrency(bill.paidAmount) : '-'}
                                </span>
                              </div>
                              {bill.promoApplied && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">โปรโมชั่น:</span>
                                  <span className="text-green-600 font-medium">ใช้งานแล้ว</span>
                                </div>
                              )}
                              {bill.loyaltyFreeApplied && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">แลกแต้ม:</span>
                                  <span className="text-green-600 font-medium">ใช้งานแล้ว</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-green-900 mb-2">โต๊ะว่าง</h4>
                          <p className="text-sm text-green-700 mb-4">โต๊ะนี้พร้อมสำหรับรับลูกค้าใหม่</p>
                          <Button
                            color="success"
                            variant="flat"
                            startContent={<PlusIcon className="w-4 h-4" />}
                            onClick={() => {
                              onDetailsModalClose();
                              onConfirmModalOpen();
                            }}
                          >
                            เปิดบิลใหม่
                          </Button>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-500 block">สร้างเมื่อ:</span>
                          <span className="font-medium">{formatDate(selectedTable.createdAt)}</span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-500 block">อัปเดตล่าสุด:</span>
                          <span className="font-medium">{formatDate(selectedTable.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
                    ปิด
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Confirm Open Bill Modal */}
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={onConfirmModalClose}
          size="2xl"
        >
          <ModalContent>
            {(onClose: () => void) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <div className="flex items-center space-x-2">
                    <PlusIcon className="w-6 h-6 text-green-500" />
                    <span className="text-xl font-bold">
                      เปิดบิลใหม่ - {selectedTable?.name}
                    </span>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      คุณต้องการเปิดใช้งานโต๊ะนี้หรือไม่?
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        type="number"
                        label="จำนวนผู้ใหญ่"
                        value={adultCount.toString()}
                        onChange={(e) => setAdultCount(parseInt(e.target.value) || 1)}
                        min="1"
                        startContent={<UsersIcon className="w-4 h-4" />}
                      />
                      <Input
                        type="number"
                        label="จำนวนเด็ก"
                        value={childCount.toString()}
                        onChange={(e) => setChildCount(parseInt(e.target.value) || 0)}
                        min="0"
                        startContent={<UsersIcon className="w-4 h-4" />}
                      />
                    </div>
                    
                    <Input
                      type="tel"
                      label="เบอร์โทรศัพท์ลูกค้า (ไม่บังคับ)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="08xxxxxxxx"
                      startContent={<PhoneIcon className="w-4 h-4" />}
                    />
                    
                    {pricingPreview && (
                      <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                        <h3 className="font-semibold text-blue-900">สรุปราคา</h3>
                        <div className="flex justify-between">
                          <span>ราคาต่อคน:</span>
                          <span>{formatCurrency(pricingPreview.adultPriceGross)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>รวมก่อน VAT:</span>
                          <span>{formatCurrency(pricingPreview.subtotalGross)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>VAT (7%):</span>
                          <span>{formatCurrency(pricingPreview.vatAmount)}</span>
                        </div>
                        <Divider />
                        <div className="flex justify-between font-semibold text-blue-900">
                          <span>ยอดรวม:</span>
                          <span>{formatCurrency(pricingPreview.totalGross)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
                    ยกเลิก
                  </Button>
                  <Button
                    color="success"
                    onClick={handleOpenBill}
                    isLoading={openingBill}
                  >
                    เปิดบิล
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Payment Modal */}
        <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
          <ModalContent>
            {(onClose: () => void) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  ชำระเงิน
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span>ยอดรวม:</span>
                        <span className="font-semibold">{formatCurrency(bill?.totalGross || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>จ่ายแล้ว:</span>
                        <span>{formatCurrency(bill?.paidAmount || 0)}</span>
                      </div>
                      <Divider />
                      <div className="flex justify-between font-semibold">
                        <span>ค้างชำระ:</span>
                        <span>{formatCurrency((bill?.totalGross || 0) - (bill?.paidAmount || 0))}</span>
                      </div>
                    </div>
                    
                    <Input
                      type="number"
                      label="จำนวนเงินที่รับชำระ"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      startContent={<CurrencyYenIcon className="w-4 h-4" />}
                    />
                    
                    {paymentAmount && bill && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex justify-between font-semibold text-green-900">
                          <span>เงินทอน:</span>
                          <span>
                            {formatCurrency(parseFloat(paymentAmount) - bill.totalGross)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
                    ยกเลิก
                  </Button>
                  <Button
                    color="success"
                    onClick={handlePayment}
                    isLoading={processingPayment}
                    isDisabled={!paymentAmount || parseFloat(paymentAmount) < (bill?.totalGross || 0)}
                  >
                    ยืนยันการชำระเงิน
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* QR Code Modal */}
        <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)}>
          <ModalContent>
            {(onClose: () => void) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  QR Code สำหรับเช็คอิน
                </ModalHeader>
                <ModalBody>
                  <div className="text-center space-y-4">
                    <p className="text-gray-600">
                      ให้ลูกค้าสแกน QR Code นี้เพื่อเช็คอินที่โต๊ะ
                    </p>
                    <div className="bg-gray-100 p-8 rounded-lg inline-block">
                      <QrCodeIcon className="w-32 h-32 mx-auto text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 break-all">
                      {qrCheckinUrl || 'กำลังโหลด...'}
                    </p>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="primary" variant="light" onPress={onClose}>
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