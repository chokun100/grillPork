import { useState, useEffect } from "react";
import { 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter 
} from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell 
} from "@heroui/table";
import { Badge } from "@heroui/badge";
import { 
  CalendarIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  TableCellsIcon, 
  ClockIcon, 
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import DefaultLayout from "@/layouts/default";

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
      // Format date as YYYY-MM-DD to ensure proper API communication
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const response = await fetch(`/api/reports/daily?date=${dateStr}`, {
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
      console.error("Failed to fetch daily report:", error);
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

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getPaymentMethodName = (method: string) => {
    const methodNames: Record<string, string> = {
      CASH: "เงินสด",
      QR_PROMPTPAY: "พร้อมเพย์",
      OTHER: "อื่นๆ",
    };
    return methodNames[method] || method;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const prepareHourlyData = (hourlyBreakdown: any[]) => {
    return hourlyBreakdown.map((item) => ({
      hour: formatHour(item.hour),
      sales: item.sales,
      bills: item.bills,
      customers: item.customers,
    }));
  };

  const preparePaymentData = (paymentMethods: any[]) => {
    return paymentMethods.map((method, index) => ({
      name: getPaymentMethodName(method.method),
      value: method.totalAmount,
      fill: COLORS[index % COLORS.length],
    }));
  };

  const prepareCustomerData = (hourlyBreakdown: any[]) => {
    return hourlyBreakdown.map((item) => ({
      hour: formatHour(item.hour),
      customers: item.customers,
    }));
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

  if (!report) {
    return (
      <DefaultLayout>
        <div className="p-6">
          <Card>
            <CardBody className="text-center py-12">
              <ChartBarIcon className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">ไม่พบข้อมูลรายงาน</h3>
              <p className="text-foreground/60 mb-4">กรุณาเลือกวันที่และลองใหม่</p>
              <Button onClick={fetchDailyReport} startContent={<CalendarIcon className="w-4 h-4" />}>
                โหลดข้อมูลใหม่
              </Button>
            </CardBody>
          </Card>
        </div>
      </DefaultLayout>
    );
  }

  const hourlyData = prepareHourlyData(report.hourlyBreakdown);
  const paymentData = preparePaymentData(report.paymentMethods);
  const customerData = prepareCustomerData(report.hourlyBreakdown);

  return (
    <DefaultLayout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">รายงานประจำวัน</h1>
              <p className="text-foreground/60">สรุปยอดขายและสถิติการใช้งานประจำวัน - {report.date}</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="date"
                label="เลือกวันที่"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  // Check if the date is valid
                  if (!isNaN(newDate.getTime())) {
                    setSelectedDate(newDate);
                  }
                }}
                className="max-w-xs"
              />
              <Button
                variant="flat"
                color="primary"
                startContent={<CalendarIcon className="w-4 h-4" />}
                onClick={fetchDailyReport}
                isLoading={loading}
              >
                ดูรายงาน
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                  <CurrencyDollarIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-foreground/60 font-medium">ยอดขายรวม</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(report.summary.totalSalesGross)}</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-xs text-foreground/50">รวม VAT {formatCurrency(report.summary.totalVAT)}</p>
            </CardBody>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                  <UserGroupIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-foreground/60 font-medium">จำนวนลูกค้า</p>
                  <p className="text-2xl font-bold text-foreground">{report.summary.totalCustomers}</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-xs text-foreground/50">ผู้ใหญ่ {report.summary.totalCustomers} คน</p>
            </CardBody>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                  <TableCellsIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-foreground/60 font-medium">จำนวนโต๊ะ</p>
                  <p className="text-2xl font-bold text-foreground">{report.summary.tableTurns}</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-xs text-foreground/50">โต๊ะที่ใช้งาน {report.summary.tableTurns} โต๊ะ</p>
            </CardBody>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white">
                  <ChartBarIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-foreground/60 font-medium">บิลเฉลี่ย</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(report.summary.averageBill)}</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-xs text-foreground/50">บิลละ {formatCurrency(report.summary.averageBill)}</p>
            </CardBody>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Hourly Sales Bar Chart */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5" />
                <h3 className="text-lg font-semibold">ยอดขายตามชั่วโมง</h3>
              </div>
              <p className="text-sm text-foreground/60">แนวโน้มยอดขายและจำนวนบิลตลอดทั้งวัน</p>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), "ยอดขาย"]} />
                    <Legend />
                    <Bar dataKey="sales" fill="#0088FE" name="ยอดขาย" />
                    <Bar dataKey="bills" fill="#00C49F" name="จำนวนบิล" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Payment Methods Pie Chart */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-5 h-5" />
                <h3 className="text-lg font-semibold">ช่องทางการชำระเงิน</h3>
              </div>
              <p className="text-sm text-foreground/60">สัดส่วนการชำระเงินแต่ละช่องทาง</p>
            </CardHeader>
            <CardBody>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), "ยอดชำระ"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Customer Trends Line Chart */}
        <Card className="mb-6 hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5" />
              <h3 className="text-lg font-semibold">แนวโน้มจำนวนลูกค้าตามชั่วโมง</h3>
            </div>
            <p className="text-sm text-foreground/60">จำนวนลูกค้าที่เข้ามาใช้บริการในแต่ละช่วงเวลา</p>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={customerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [value, "จำนวนลูกค้า"]} />
                  <Line type="monotone" dataKey="customers" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Summary Details */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <h3 className="text-lg font-semibold">ข้อมูลสรุป</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-foreground/70">จำนวนบิลทั้งหมด</span>
                  <Badge color="primary" variant="flat" size="sm">{report.summary.billsCount}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-foreground/70">บิลที่ถูกยกเลิก</span>
                  <Badge color="danger" variant="flat" size="sm">{report.summary.voidBillsCount}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-foreground/70">ภาษี VAT รวม</span>
                  <span className="font-semibold">{formatCurrency(report.summary.totalVAT)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-foreground/70">Loyalty ฟรีที่ใช้</span>
                  <Badge color="warning" variant="flat" size="sm">{report.summary.loyaltyFreeApplied}</Badge>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Payment Methods Table */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <h3 className="text-lg font-semibold">ช่องทางการชำระเงิน</h3>
            </CardHeader>
            <CardBody>
              <Table aria-label="Payment methods">
                <TableHeader>
                  <TableColumn>ช่องทาง</TableColumn>
                  <TableColumn className="text-right">จำนวนรายการ</TableColumn>
                  <TableColumn className="text-right">ยอดชำระ</TableColumn>
                </TableHeader>
                <TableBody>
                  {report.paymentMethods.map((method, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{getPaymentMethodName(method.method)}</TableCell>
                      <TableCell className="text-right">{method.transactionCount}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(method.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </div>

        {/* Hourly Breakdown Table */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5" />
              <h3 className="text-lg font-semibold">สถิติตามชั่วโมง</h3>
            </div>
            <p className="text-sm text-foreground/60">รายละเอียดยอดขายและจำนวนลูกค้าตามช่วงเวลา</p>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <Table aria-label="Hourly breakdown">
                <TableHeader>
                  <TableColumn>ช่วงเวลา</TableColumn>
                  <TableColumn className="text-right">จำนวนบิล</TableColumn>
                  <TableColumn className="text-right">จำนวนลูกค้า</TableColumn>
                  <TableColumn className="text-right">ยอดขาย</TableColumn>
                </TableHeader>
                <TableBody>
                  {report.hourlyBreakdown.map((hour, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{formatHour(hour.hour)}</TableCell>
                      <TableCell className="text-right">
                        <Badge color={hour.bills > 0 ? "success" : "default" } variant="flat" size="sm">
                          {hour.bills}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{hour.customers}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(hour.sales)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardBody>
        </Card>
      </div>
    </DefaultLayout>
  );
}