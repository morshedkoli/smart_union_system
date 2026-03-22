"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, RefreshCw, Calendar, Receipt, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface TaxRecord {
  id: string;
  fiscalYear: string;
  holdingNo: string;
  assessedAmount: number;
  paidAmount: number;
  dueDate?: string;
  paidDate?: string;
  status: "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";
  receiptNo?: string;
}

interface TaxSummary {
  totalAssessed: number;
  totalPaid: number;
  totalDue: number;
}

function toCurrency(value: number): string {
  return `৳ ${value.toLocaleString()}`;
}

export function MyTaxesContent({ locale }: { locale: string }) {
  const { user } = useAuth();
  const isBn = locale === "bn";

  // Role check - CITIZEN and SECRETARY can access (SECRETARY as super admin)
  if (!user || !["CITIZEN", "SECRETARY"].includes(user.role)) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              {isBn ? "আমার কর" : "My Taxes"}
            </h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{isBn ? "অ্যাক্সেস অস্বীকৃত - নাগরিক বা সচিবের জন্য" : "Access Denied - Citizens or Secretary Only"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = useMemo(
    () => ({
      title: isBn ? "আমার কর" : "My Taxes",
      subtitle: isBn ? "আপনার হোল্ডিং ট্যাক্সের বিবরণ এবং পেমেন্ট স্থিতি" : "Your holding tax details and payment status",
      noTaxes: isBn ? "কোনো ট্যাক্স রেকর্ড পাওয়া যায়নি" : "No tax records found",
      loadFailed: isBn ? "ট্যাক্স তথ্য লোড করতে ব্যর্থ" : "Failed to load tax information",
      refresh: isBn ? "রিফ্রেশ" : "Refresh",
      fiscalYear: isBn ? "অর্থবছর" : "Fiscal Year",
      holdingNo: isBn ? "হোল্ডিং নম্বর" : "Holding No",
      assessed: isBn ? "নির্ধারিত" : "Assessed",
      paid: isBn ? "পরিশোধিত" : "Paid",
      due: isBn ? "বকেয়া" : "Due",
      status: isBn ? "অবস্থা" : "Status",
      dueDate: isBn ? "নির্ধারিত তারিখ" : "Due Date",
      paidDate: isBn ? "পরিশোধের তারিখ" : "Paid Date",
      receiptNo: isBn ? "রসিদ নম্বর" : "Receipt No",
      totalAssessed: isBn ? "মোট নির্ধারিত" : "Total Assessed",
      totalPaid: isBn ? "মোট পরিশোধিত" : "Total Paid",
      totalDue: isBn ? "মোট বকেয়া" : "Total Due",
      payNow: isBn ? "এখন পরিশোধ করুন" : "Pay Now",
      viewReceipt: isBn ? "রসিদ দেখুন" : "View Receipt",
    }),
    [isBn]
  );

  const statusLabels = useMemo(
    () => ({
      PAID: isBn ? "পরিশোধিত" : "Paid",
      PENDING: isBn ? "অপেক্ষমান" : "Pending",
      OVERDUE: isBn ? "বকেয়া" : "Overdue",
      PARTIAL: isBn ? "আংশিক" : "Partial",
    }),
    [isBn]
  );

  const statusColors = {
    PAID: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    OVERDUE: "bg-red-100 text-red-800",
    PARTIAL: "bg-blue-100 text-blue-800",
  };

  const statusIcons = {
    PAID: CheckCircle,
    PENDING: Calendar,
    OVERDUE: AlertCircle,
    PARTIAL: Receipt,
  };

  const loadTaxes = async () => {
    if (!user?.citizenId) {
      setTaxes([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/citizens/${user.citizenId}/taxes`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || labels.loadFailed);
        return;
      }

      setTaxes(data.taxes || []);
      setSummary(data.summary || null);
    } catch {
      setError(labels.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxes();
  }, [user?.citizenId]);

  const handleViewReceipt = (receiptNo: string) => {
    window.open(`/api/taxes/receipt/${receiptNo}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              {labels.title}
            </h1>
            <p className="text-muted-foreground">{labels.subtitle}</p>
          </div>
          <Button onClick={loadTaxes} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {labels.refresh}
          </Button>
        </div>

        {error && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600 flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {labels.totalAssessed}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{toCurrency(summary.totalAssessed)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {labels.totalPaid}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{toCurrency(summary.totalPaid)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {labels.totalDue}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">{toCurrency(summary.totalDue)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No records state */}
        {!loading && !error && taxes.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{labels.noTaxes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tax Records Table */}
        {taxes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{isBn ? "ট্যাক্স রেকর্ড" : "Tax Records"}</CardTitle>
              <CardDescription>
                {isBn ? "আপনার সকল হোল্ডিং ট্যাক্স রেকর্ড" : "All your holding tax records"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{labels.fiscalYear}</TableHead>
                      <TableHead>{labels.holdingNo}</TableHead>
                      <TableHead className="text-right">{labels.assessed}</TableHead>
                      <TableHead className="text-right">{labels.paid}</TableHead>
                      <TableHead className="text-right">{labels.due}</TableHead>
                      <TableHead>{labels.status}</TableHead>
                      <TableHead className="text-right">{isBn ? "অ্যাকশন" : "Action"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxes.map((tax) => {
                      const StatusIcon = statusIcons[tax.status];
                      return (
                        <TableRow key={tax.id}>
                          <TableCell className="font-medium">{tax.fiscalYear}</TableCell>
                          <TableCell>{tax.holdingNo}</TableCell>
                          <TableCell className="text-right">{toCurrency(tax.assessedAmount)}</TableCell>
                          <TableCell className="text-right text-green-700">
                            {toCurrency(tax.paidAmount)}
                          </TableCell>
                          <TableCell className="text-right text-amber-700">
                            {toCurrency(tax.assessedAmount - tax.paidAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[tax.status]} flex items-center gap-1 w-fit`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusLabels[tax.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {tax.status === "PAID" && tax.receiptNo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReceipt(tax.receiptNo!)}
                              >
                                <Receipt className="h-4 w-4 mr-1" />
                                {labels.viewReceipt}
                              </Button>
                            )}
                            {(tax.status === "PENDING" || tax.status === "OVERDUE" || tax.status === "PARTIAL") && (
                              <Button variant="default" size="sm">
                                <CreditCard className="h-4 w-4 mr-1" />
                                {labels.payNow}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
