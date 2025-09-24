import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Badge } from "@heroui/badge";
import { CalendarIcon, ChartBarIcon, CurrencyDollarIcon, UserGroupIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import DefaultLayout from "@/layouts/default";

interface MonthlyReport {
  month: string;
  summary: {
    totalSalesGross: number;
    totalVAT: number;
    totalBills: number;
    totalCustomers: number;
    averageBill: number;
  };
  breakdown: Array<{
    status: string;
    totalSales: number;
    totalVAT: number;
    billCount: number;
    averageBill: number;
    averageAdults: number;
    averageChildren: number;
  }>;
}

export default function MonthlyReportPage() {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchMonthlyReport();
  }, [selectedMonth]);

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/monthly?month=${selectedMonth}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        alert(`ไม่สามารถดึงข้อมูลรายงานได้: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      if (data.ok) {
        setReport(data.data);
      } else {
        alert(data.error?.message || "ไม่สามารถดึงข้อมูลรายงานได้");
      }
    } catch (error) {
      console.error("Failed to fetch monthly report:", error);
      alert("ไม่สามารถดึงข้อมูลรายงานได้: " + (error instanceof Error ? error.message : "Unknown error"));
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

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
  };

  const getStatusName = (status: string) => {
    const statusNames: Record<string, string> = {
      CLOSED: "ปิดบิล",
      VOID: "ยกเลิก",
      OPEN: "เปิดอยู่",
    };
    return statusNames[status] || status;
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, "success" | "danger" | "warning" | "default"> = {
      CLOSED: "success",
      VOID: "danger",
      OPEN: "warning",
    };
    return statusColors[status] || "default";
  };

  if (loading) {
    return (
      <DefaultLayout>
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <ChartBarIcon className="w-12 h-12 text-foreground/50 mx-auto mb-4 animate-spin" />
              <p className="text-lg text-foreground/60">กำลังโหลดรายงาน...</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">รายงานประจำเดือน</h1>
              <p className="text-foreground/60">สรุปยอดขายและสถิติการใช้งานประจำเดือน</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="month"
                label="เลือกเดือน"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
              <Button
                color="primary"
                startContent={<CalendarIcon className="w-4 h-4" />}
                onPress={fetchMonthlyReport}
              >
                ดูรายงาน
              </Button>
            </div>
          </div>
        </div>

        {report && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                      <CurrencyDollarIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground/60 font-medium">ยอดขายรวม</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(report.summary.totalSalesGross)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                      <UserGroupIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground/60 font-medium">จำนวนลูกค้า</p>
                      <p className="text-2xl font-bold text-foreground">
                        {report.summary.totalCustomers}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                      <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground/60 font-medium">จำนวนบิล</p>
                      <p className="text-2xl font-bold text-foreground">
                        {report.summary.totalBills}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white">
                      <ChartBarIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground/60 font-medium">บิลเฉลี่ย</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(report.summary.averageBill)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Detailed Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <h3 className="text-lg font-semibold">ข้อมูลสรุป</h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-foreground/60">เดือน</span>
                      <span className="font-medium">{formatMonth(report.month)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">ยอดขายรวม</span>
                      <span className="font-medium">{formatCurrency(report.summary.totalSalesGross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">ภาษี VAT รวม</span>
                      <span className="font-medium">{formatCurrency(report.summary.totalVAT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">จำนวนลูกค้าทั้งหมด</span>
                      <span className="font-medium">{report.summary.totalCustomers}</span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <h3 className="text-lg font-semibold">สรุปสถานะบิล</h3>
                </CardHeader>
                <CardBody>
                  <Table aria-label="Bill status breakdown table">
                    <TableHeader>
                      <TableColumn>สถานะ</TableColumn>
                      <TableColumn className="text-right">จำนวนบิล</TableColumn>
                      <TableColumn className="text-right">ยอดขาย</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {report.breakdown.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge color={getStatusColor(item.status)} variant="flat" size="sm">
                              {getStatusName(item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.billCount}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.totalSales)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <h3 className="text-lg font-semibold">รายละเอียดตามสถานะ</h3>
              </CardHeader>
              <CardBody>
                <Table aria-label="Detailed breakdown table">
                  <TableHeader>
                    <TableColumn>สถานะ</TableColumn>
                    <TableColumn className="text-right">จำนวนบิล</TableColumn>
                    <TableColumn className="text-right">ยอดขาย</TableColumn>
                    <TableColumn className="text-right">VAT</TableColumn>
                    <TableColumn className="text-right">บิลเฉลี่ย</TableColumn>
                    <TableColumn className="text-right">ผู้ใหญ่เฉลี่ย</TableColumn>
                    <TableColumn className="text-right">เด็กเฉลี่ย</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {report.breakdown.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge color={getStatusColor(item.status)} variant="flat" size="sm">
                            {getStatusName(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.billCount}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalSales)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalVAT)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.averageBill)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.averageAdults.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.averageChildren.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </DefaultLayout>
  );
}