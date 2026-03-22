"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileBarChart2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CashbookEntry {
  _id: string;
  entryNo: string;
  voucherNo: string;
  transactionDate: string;
  transactionType: string;
  category: string;
  description: string;
  amount: number;
  paymentMode: string;
  status: string;
}

interface DailyReport {
  date: string;
  totals: { income: number; expense: number; balance: number };
  byCategory: Array<{ category: string; income: number; expense: number }>;
}

interface MonthlyReport {
  year: number;
  month: number;
  totals: { income: number; expense: number; balance: number };
  trend: Array<{ day: number; income: number; expense: number; balance: number }>;
  byCategory: Array<{ category: string; income: number; expense: number }>;
}

const incomeCategories = [
  "HOLDING_TAX",
  "TRADE_LICENSE_FEE",
  "CERTIFICATE_FEE",
  "MARKET_RENT",
  "LEASE_RENT",
  "FINE_PENALTY",
  "GRANT_GOVERNMENT",
  "GRANT_NGO",
  "DONATION",
  "OTHER_INCOME",
] as const;

const expenseCategories = [
  "SALARY",
  "ALLOWANCE",
  "OFFICE_EXPENSE",
  "STATIONERY",
  "ELECTRICITY",
  "WATER",
  "TELEPHONE",
  "INTERNET",
  "MAINTENANCE",
  "CONSTRUCTION",
  "DEVELOPMENT",
  "RELIEF_DISTRIBUTION",
  "TRAVEL",
  "TRAINING",
  "MEETING",
  "ENTERTAINMENT",
  "MISCELLANEOUS",
  "OTHER_EXPENSE",
] as const;

const allCategories = [...incomeCategories, ...expenseCategories];
const paymentModes = ["CASH", "BANK_TRANSFER", "CHEQUE", "MOBILE_BANKING", "ONLINE"] as const;

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function FinanceContent({ locale }: { locale: string }) {
  const today = useMemo(() => new Date(), []);
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [transactionDate, setTransactionDate] = useState(toDateInputValue(today));
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [category, setCategory] = useState(allCategories[0]);
  const [description, setDescription] = useState("");
  const [voucherNo, setVoucherNo] = useState("");
  const [amount, setAmount] = useState("0");
  const [paymentMode, setPaymentMode] = useState<(typeof paymentModes)[number]>("CASH");

  const [dailyDate, setDailyDate] = useState(toDateInputValue(today));
  const [monthlyYear, setMonthlyYear] = useState(String(today.getFullYear()));
  const [monthlyMonth, setMonthlyMonth] = useState(String(today.getMonth() + 1));
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);

  useEffect(() => {
    if (transactionType === "INCOME" && !incomeCategories.includes(category as typeof incomeCategories[number])) {
      setCategory(incomeCategories[0]);
    }
    if (transactionType === "EXPENSE" && !expenseCategories.includes(category as typeof expenseCategories[number])) {
      setCategory(expenseCategories[0]);
    }
  }, [category, transactionType]);

  const availableCategories = transactionType === "INCOME" ? incomeCategories : expenseCategories;

  const loadCashbook = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (typeFilter !== "ALL") params.set("transactionType", typeFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      const res = await fetch(`/api/finance/cashbook?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setSummary(data.summary || { income: 0, expense: 0, balance: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, fromDate, query, toDate, typeFilter]);

  const loadReports = useCallback(async () => {
    const [dailyRes, monthlyRes] = await Promise.all([
      fetch(`/api/finance/reports?type=daily&date=${dailyDate}`),
      fetch(`/api/finance/reports?type=monthly&year=${monthlyYear}&month=${monthlyMonth}`),
    ]);
    const [dailyData, monthlyData] = await Promise.all([dailyRes.json(), monthlyRes.json()]);
    if (dailyData.success) setDailyReport(dailyData.report);
    if (monthlyData.success) setMonthlyReport(monthlyData.report);
  }, [dailyDate, monthlyMonth, monthlyYear]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadCashbook(), loadReports()]);
  }, [loadCashbook, loadReports]);

  useEffect(() => {
    loadCashbook();
  }, [loadCashbook]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const createTransaction = async () => {
    setMessage("");
    const res = await fetch("/api/finance/cashbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionDate,
        transactionType,
        category,
        description,
        amount: Number(amount),
        voucherNo,
        paymentMode,
      }),
    });
    const data = await res.json();
    setMessage(data.message);
    if (data.success) {
      setDescription("");
      setVoucherNo("");
      setAmount("0");
      await loadAll();
    }
  };

  const exportCashbook = () => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (typeFilter !== "ALL") params.set("transactionType", typeFilter);
    if (categoryFilter !== "ALL") params.set("category", categoryFilter);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    window.open(`/api/finance/export?${params.toString()}`, "_blank");
  };

  const exportDaily = () => {
    window.open(`/api/finance/reports?type=daily&date=${dailyDate}&format=csv`, "_blank");
  };

  const exportMonthly = () => {
    window.open(
      `/api/finance/reports?type=monthly&year=${monthlyYear}&month=${monthlyMonth}&format=csv`,
      "_blank"
    );
  };

  const statusBadge = (status: string) => {
    if (status === "APPROVED") return <Badge variant="success">APPROVED</Badge>;
    if (status === "PENDING") return <Badge variant="warning">PENDING</Badge>;
    if (status === "REJECTED") return <Badge variant="destructive">REJECTED</Badge>;
    if (status === "VOID") return <Badge variant="secondary">VOID</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {locale === "bn" ? "ফাইন্যান্স সিস্টেম" : "Finance System"}
            </h1>
            <p className="text-muted-foreground">
              {locale === "bn"
                ? "Cashbook, Daily/Monthly reports, charts, export"
                : "Cashbook, daily/monthly reports, charts, export"}
            </p>
          </div>
          <Button variant="outline" onClick={exportCashbook}>
            <Download className="mr-2 h-4 w-4" />
            {locale === "bn" ? "ক্যাশবুক এক্সপোর্ট" : "Export Cashbook"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>{locale === "bn" ? "মোট আয়" : "Total Income"}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-700">৳ {summary.income.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{locale === "bn" ? "মোট ব্যয়" : "Total Expense"}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-700">৳ {summary.expense.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{locale === "bn" ? "ব্যালেন্স" : "Balance"}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">৳ {summary.balance.toLocaleString()}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "নতুন ক্যাশবুক এন্ট্রি" : "New Cashbook Entry"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>{locale === "bn" ? "তারিখ" : "Date"}</Label>
                <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "ধরন" : "Type"}</Label>
                <Select value={transactionType} onValueChange={(v: "INCOME" | "EXPENSE") => setTransactionType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">{locale === "bn" ? "আয়" : "Income"}</SelectItem>
                    <SelectItem value="EXPENSE">{locale === "bn" ? "ব্যয়" : "Expense"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "ক্যাটেগরি" : "Category"}</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as typeof allCategories[number])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "পেমেন্ট মোড" : "Payment Mode"}</Label>
                <Select value={paymentMode} onValueChange={(v: (typeof paymentModes)[number]) => setPaymentMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{locale === "bn" ? "বিবরণ" : "Description"}</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "ভাউচার নং" : "Voucher No"}</Label>
                <Input value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "পরিমাণ" : "Amount"}</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <Button onClick={createTransaction}>
              {locale === "bn" ? "এন্ট্রি সংরক্ষণ" : "Save Entry"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "ক্যাশবুক টেবিল" : "Cashbook Table"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <Input
                placeholder={locale === "bn" ? "সার্চ: ভাউচার/রেফারেন্স" : "Search voucher/reference"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value="INCOME">INCOME</SelectItem>
                  <SelectItem value="EXPENSE">EXPENSE</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  {allCategories.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">{locale === "bn" ? "লোড হচ্ছে..." : "Loading..."}</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{locale === "bn" ? "তারিখ" : "Date"}</TableHead>
                      <TableHead>{locale === "bn" ? "এন্ট্রি নং" : "Entry No"}</TableHead>
                      <TableHead>{locale === "bn" ? "ভাউচার" : "Voucher"}</TableHead>
                      <TableHead>{locale === "bn" ? "ধরন" : "Type"}</TableHead>
                      <TableHead>{locale === "bn" ? "ক্যাটেগরি" : "Category"}</TableHead>
                      <TableHead>{locale === "bn" ? "পরিমাণ" : "Amount"}</TableHead>
                      <TableHead>{locale === "bn" ? "স্ট্যাটাস" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          {locale === "bn" ? "কোনো রেকর্ড নেই" : "No records"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry) => (
                        <TableRow key={entry._id}>
                          <TableCell>{new Date(entry.transactionDate).toLocaleDateString()}</TableCell>
                          <TableCell>{entry.entryNo}</TableCell>
                          <TableCell>{entry.voucherNo}</TableCell>
                          <TableCell>{entry.transactionType}</TableCell>
                          <TableCell>{entry.category}</TableCell>
                          <TableCell>৳ {entry.amount.toLocaleString()}</TableCell>
                          <TableCell>{statusBadge(entry.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{locale === "bn" ? "দৈনিক রিপোর্ট + চার্ট" : "Daily Report + Chart"}</CardTitle>
              <Button variant="outline" size="sm" onClick={exportDaily}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
              {dailyReport ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>In: ৳ {dailyReport.totals.income.toLocaleString()}</div>
                    <div>Out: ৳ {dailyReport.totals.expense.toLocaleString()}</div>
                    <div>Bal: ৳ {dailyReport.totals.balance.toLocaleString()}</div>
                  </div>
                  <div className="space-y-2">
                    {dailyReport.byCategory.slice(0, 6).map((row) => {
                      const max = Math.max(
                        ...dailyReport.byCategory.map((x) => x.income + x.expense),
                        1
                      );
                      const width = ((row.income + row.expense) / max) * 100;
                      return (
                        <div key={row.category}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span>{row.category}</span>
                            <span>৳ {(row.income + row.expense).toLocaleString()}</span>
                          </div>
                          <div className="h-2 rounded bg-muted">
                            <div className="h-2 rounded bg-primary" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No daily report data</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{locale === "bn" ? "মাসিক রিপোর্ট + চার্ট" : "Monthly Report + Chart"}</CardTitle>
              <Button variant="outline" size="sm" onClick={exportMonthly}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={monthlyYear} onChange={(e) => setMonthlyYear(e.target.value)} />
                <Input type="number" min="1" max="12" value={monthlyMonth} onChange={(e) => setMonthlyMonth(e.target.value)} />
              </div>
              {monthlyReport ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>In: ৳ {monthlyReport.totals.income.toLocaleString()}</div>
                    <div>Out: ৳ {monthlyReport.totals.expense.toLocaleString()}</div>
                    <div>Bal: ৳ {monthlyReport.totals.balance.toLocaleString()}</div>
                  </div>
                  <div className="grid grid-cols-12 items-end gap-1 h-28">
                    {monthlyReport.trend.map((row) => {
                      const v = row.income + row.expense;
                      const max = Math.max(...monthlyReport.trend.map((x) => x.income + x.expense), 1);
                      const height = (v / max) * 100;
                      return (
                        <div key={row.day} className="flex flex-col items-center">
                          <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(height, 2)}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileBarChart2 className="h-3 w-3" />
                    {locale === "bn" ? "মাসজুড়ে লেনদেন ট্রেন্ড" : "Transaction trend across the month"}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No monthly report data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {message ? <div className="rounded-md border bg-muted/40 p-3 text-sm">{message}</div> : null}
      </div>
    </DashboardLayout>
  );
}

