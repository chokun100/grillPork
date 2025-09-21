import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Badge } from "@heroui/badge";
import { CalendarIcon, ChartBarIcon, CurrencyDollarIcon, UserGroupIcon, TableCellsIcon } from "@heroicons/react/24/outline";

interface DailyReport {
  date: string;
  summary: {
    totalSalesGross: number;
    totalVAT: number;
    tableTurns: number;
    totalCustomers: number;
    billsCount: number;
    voidBillsCount: number;
    averageBill: number;
    loyaltyFreeApplied: number;
  };
  hourlyBreakdown: Array<{
    hour: number;
    sales: number;
    bills: number;
    customers: number;
  }>;
  paymentMethods: Array<{
    method: string;
    totalAmount: number;
    paidAmount: number;
    transactionCount: number;
  }>;
  promotionUsage: Array<{
    promotion: string;
    totalSales: number;
    usageCount: number;
  }>;
}

export default function DailyReportPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchDailyReport();
  }, [selectedDate]);

  const fetchDailyReport = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(`/api/reports/daily?date=${dateStr}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.ok) {
        setReport(data.data);
      } else {
        alert(data.error.message || "ไม่สามารถดึงข้อมูลรายงานได้");
      }
    } catch (error) {
      console.error("Failed to fetch daily report:", error);
      alert("ไม่สามารถดึงข้อมูลรายงานได้");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getPaymentMethodName = (method: string) => {
    const methodNames: Record<string, string> = {
      CASH: "เงินสด",
      CREDIT_CARD: "บัตรเครดิต",
      DEBIT_CARD: "บัตรเดบิต",
      QR_PROMPTPAY: "พร้อมเพย์",
      TRANSFER: "โอนเงิน",
      OTHER: "อื่นๆ",
    };
    return methodNames[method] || method;
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <div className="text-center py-8">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">รายงานประจำวัน</h1>
        <p className="text-foreground/60">สรุปยอดขายและสถิติการใช้งานประจำวัน</p>
      </div>

      {/* Date Selection */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-4">
            <Input
              type="date"
              label="เลือกวันที่"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
            />
            <Button
              color="primary"
              startContent={<CalendarIcon className="w-4 h-4" />}
              onPress={fetchDailyReport}
            >
              ดูรายงาน
            </Button>
          </div>
        </CardBody>
      </Card>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardBody className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                  <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-foreground/60">ยอดขายรวม</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(report.summary.totalSalesGross)}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                  <UserGroupIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm text-foreground/60">จำนวนลูกค้า</p>
                <p className="text-2xl font-bold text-foreground">
                  {report.summary.totalCustomers}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="text-center">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-2">
                  <TableCellsIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-sm text-foreground/60">จำนวนโต๊ะ</p>
                <p className="text-2xl font-bold text-foreground">
                  {report.summary.tableTurns}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="text-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-2">
                  <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-sm text-foreground/60">บิลเฉลี่ย</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(report.summary.averageBill)}
                </p>
              </CardBody>
            </Card>
          </div>

          {/* Detailed Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">ข้อมูลสรุป</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">จำนวนบิลทั้งหมด</span>
                    <span className="font-medium">{report.summary.billsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">บิลที่ถูกยกเลิก</span>
                    <span className="font-medium text-danger">{report.summary.voidBillsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">ภาษี VAT รวม</span>
                    <span className="font-medium">{formatCurrency(report.summary.totalVAT)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Loyalty ฟรี</span>
                    <span className="font-medium">{report.summary.loyaltyFreeApplied}</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">ช่องทางการชำระเงิน</h3>
              </CardHeader>
              <CardBody>
                <Table aria-label="Payment methods table">
                  <TableHeader>
                    <TableColumn>ช่องทาง</TableColumn>
                    <TableColumn className="text-right">จำนวน</TableColumn>
                    <TableColumn className="text-right">ยอดเงิน</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {report.paymentMethods.map((method, index) => (
                      <TableRow key={index}>
                        <TableCell>{getPaymentMethodName(method.method)}</TableCell>
                        <TableCell className="text-right">{method.transactionCount}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(method.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </div>

          {/* Hourly Breakdown */}
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-lg font-semibold">สถิติตามชั่วโมง</h3>
            </CardHeader>
            <CardBody>
              <Table aria-label="Hourly breakdown table">
                <TableHeader>
                  <TableColumn>ชั่วโมง</TableColumn>
                  <TableColumn className="text-right">จำนวนบิล</TableColumn>
                  <TableColumn className="text-right">ลูกค้า</TableColumn>
                  <TableColumn className="text-right">ยอดขาย</TableColumn>
                </TableHeader>
                <TableBody>
                  {report.hourlyBreakdown.map((hour, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatHour(hour.hour)}</TableCell>
                      <TableCell className="text-right">{hour.bills}</TableCell>
                      <TableCell className="text-right">{hour.customers}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(hour.sales)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>

          {/* Promotion Usage */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">การใช้โปรโมชั่น</h3>
            </CardHeader>
            <CardBody>
              {report.promotionUsage.length > 0 ? (
                <Table aria-label="Promotion usage table">
                  <TableHeader>
                    <TableColumn>โปรโมชั่น</TableColumn>
                    <TableColumn className="text-right">จำนวนการใช้</TableColumn>
                    <TableColumn className="text-right">ยอดขาย</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {report.promotionUsage.map((promo, index) => (
                      <TableRow key={index}>
                        <TableCell>{promo.promotion}</TableCell>
                        <TableCell className="text-right">{promo.usageCount}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(promo.totalSales)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-foreground/60 py-4">ไม่มีการใช้โปรโมชั่นในวันนี้</p>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}