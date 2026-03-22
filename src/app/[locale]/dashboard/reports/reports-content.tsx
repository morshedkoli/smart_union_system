"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DailyReport {
  date: string;
  totals: { income: number; expense: number; balance: number };
  byCategory: Array<{ category: string; income: number; expense: number }>;
}

interface MonthlyReport {
  year: number;
  month: number;
  totals: { income: number; expense: number; balance: number };
  byCategory: Array<{ category: string; income: number; expense: number }>;
}

function toDateValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

function toMoney(v: number): string {
  return `৳ ${v.toLocaleString()}`;
}

export function ReportsContent({ locale }: { locale: string }) {
  const today = useMemo(() => new Date(), []);
  const [dailyDate, setDailyDate] = useState(toDateValue(today));
  const [monthlyYear, setMonthlyYear] = useState(String(today.getFullYear()));
  const [monthlyMonth, setMonthlyMonth] = useState(String(today.getMonth() + 1));
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setError("");
    try {
      const [dailyRes, monthlyRes] = await Promise.all([
        fetch(`/api/finance/reports?type=daily&date=${dailyDate}`),
        fetch(`/api/finance/reports?type=monthly&year=${monthlyYear}&month=${monthlyMonth}`),
      ]);
      const [dailyData, monthlyData] = await Promise.all([dailyRes.json(), monthlyRes.json()]);

      if (!dailyData.success || !monthlyData.success) {
        setError(locale === "bn" ? "রিপোর্ট লোড ব্যর্থ হয়েছে" : "Failed to load reports");
        return;
      }

      setDailyReport(dailyData.report);
      setMonthlyReport(monthlyData.report);
    } catch {
      setError(locale === "bn" ? "রিপোর্ট লোড ব্যর্থ হয়েছে" : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportDaily = () => {
    window.open(`/api/finance/reports?type=daily&date=${dailyDate}&format=csv`, "_blank");
  };

  const exportMonthly = () => {
    window.open(
      `/api/finance/reports?type=monthly&year=${monthlyYear}&month=${monthlyMonth}&format=csv`,
      "_blank"
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-2xl font-bold tracking-tight">
              {locale === "bn" ? "রিপোর্টস" : "Reports"}
            </h1>
            <p className="text-muted-foreground">
              {locale === "bn"
                ? "দৈনিক ও মাসিক ফাইন্যান্স রিপোর্ট দেখুন এবং এক্সপোর্ট করুন"
                : "View and export daily/monthly finance reports"}
            </p>
          </div>
          <Button onClick={loadReports} disabled={loading}>
            {loading ? (locale === "bn" ? "লোড হচ্ছে..." : "Loading...") : locale === "bn" ? "রিফ্রেশ" : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle>{locale === "bn" ? "দৈনিক রিপোর্ট" : "Daily Report"}</CardTitle>
              <div>
                <Label htmlFor="dailyDate">{locale === "bn" ? "তারিখ" : "Date"}</Label>
                <Input id="dailyDate" type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>{locale === "bn" ? "আয়" : "Income"}: {toMoney(dailyReport?.totals.income || 0)}</p>
              <p>{locale === "bn" ? "ব্যয়" : "Expense"}: {toMoney(dailyReport?.totals.expense || 0)}</p>
              <p>{locale === "bn" ? "ব্যালেন্স" : "Balance"}: {toMoney(dailyReport?.totals.balance || 0)}</p>
              <Button variant="outline" onClick={exportDaily}>
                <Download className="mr-2 h-4 w-4" />
                {locale === "bn" ? "CSV এক্সপোর্ট" : "Export CSV"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3">
              <CardTitle>{locale === "bn" ? "মাসিক রিপোর্ট" : "Monthly Report"}</CardTitle>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="monthYear">{locale === "bn" ? "বছর" : "Year"}</Label>
                  <Input id="monthYear" value={monthlyYear} onChange={(e) => setMonthlyYear(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="month">{locale === "bn" ? "মাস" : "Month"}</Label>
                  <Input id="month" value={monthlyMonth} onChange={(e) => setMonthlyMonth(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>{locale === "bn" ? "আয়" : "Income"}: {toMoney(monthlyReport?.totals.income || 0)}</p>
              <p>{locale === "bn" ? "ব্যয়" : "Expense"}: {toMoney(monthlyReport?.totals.expense || 0)}</p>
              <p>{locale === "bn" ? "ব্যালেন্স" : "Balance"}: {toMoney(monthlyReport?.totals.balance || 0)}</p>
              <Button variant="outline" onClick={exportMonthly}>
                <Download className="mr-2 h-4 w-4" />
                {locale === "bn" ? "CSV এক্সপোর্ট" : "Export CSV"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "ক্যাটাগরি ভিত্তিক মাসিক বিশ্লেষণ" : "Monthly Category Breakdown"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "bn" ? "ক্যাটাগরি" : "Category"}</TableHead>
                  <TableHead className="text-right">{locale === "bn" ? "আয়" : "Income"}</TableHead>
                  <TableHead className="text-right">{locale === "bn" ? "ব্যয়" : "Expense"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(monthlyReport?.byCategory || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      {locale === "bn" ? "ডেটা পাওয়া যায়নি" : "No data found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlyReport!.byCategory.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="text-right">{toMoney(row.income)}</TableCell>
                      <TableCell className="text-right">{toMoney(row.expense)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

