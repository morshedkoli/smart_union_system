"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Wallet,
  Plus,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface HoldingTax {
  _id: string;
  referenceNo: string;
  fiscalYear: string;
  holdingInfo: {
    holdingNo: string;
    ward: number;
    area?: number;
    holdingType?: string;
  };
  assessment: {
    assessedValue: number;
    taxRate: number;
    annualTax: number;
  };
  totalDue: number;
  totalPaid: number;
  balance: number;
  status: string;
  dueDate: string;
  lastPaymentDate?: string;
  payments: Array<{
    receiptNo: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
  }>;
}

interface TaxTabProps {
  citizenId: string;
  locale: string;
}

const CURRENT_YEAR = new Date().getFullYear();

function getDefaultFiscalYear() {
  return `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`;
}

export function TaxTab({ citizenId, locale }: TaxTabProps) {
  const t = useTranslations();
  const [taxes, setTaxes] = useState<HoldingTax[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTax, setSelectedTax] = useState<HoldingTax | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showCreateTaxDialog, setShowCreateTaxDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  const [fiscalYear, setFiscalYear] = useState(getDefaultFiscalYear());
  const [holdingNo, setHoldingNo] = useState("");
  const [ward, setWard] = useState("1");
  const [area, setArea] = useState("0");
  const [annualTax, setAnnualTax] = useState("");
  const [assessedValue, setAssessedValue] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [arrears, setArrears] = useState("0");
  const [rebate, setRebate] = useState("0");
  const [dueDate, setDueDate] = useState("");

  const fetchTaxes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/holding-tax?citizenId=${citizenId}`);
      const data = await res.json();
      if (data.success) {
        setTaxes(data.taxes);
      }
    } catch (error) {
      console.error("Failed to fetch taxes:", error);
    } finally {
      setLoading(false);
    }
  }, [citizenId]);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const handlePayment = async () => {
    if (!selectedTax || !paymentAmount) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/holding-tax/${selectedTax._id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          paymentMethod,
          transactionId: transactionId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowPaymentDialog(false);
        setPaymentAmount("");
        setTransactionId("");
        await fetchTaxes();
        alert(locale === "bn" ? "পেমেন্ট সফল হয়েছে" : "Payment successful");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert(locale === "bn" ? "পেমেন্ট ব্যর্থ হয়েছে" : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (tax: HoldingTax) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/holding-tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark-paid",
          taxId: tax._id,
          paymentMethod,
          notes: locale === "bn" ? "সম্পূর্ণ বকেয়া পরিশোধ" : "Marked fully paid",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
        return;
      }
      await fetchTaxes();
      alert(locale === "bn" ? "ট্যাক্স সম্পূর্ণ পরিশোধিত" : "Tax marked as paid");
    } catch (error) {
      console.error("Mark paid error:", error);
      alert(locale === "bn" ? "অপারেশন ব্যর্থ হয়েছে" : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTax = async () => {
    if (!fiscalYear || !holdingNo || !annualTax || !dueDate) {
      alert(locale === "bn" ? "প্রয়োজনীয় তথ্য দিন" : "Please fill required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/holding-tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizenId,
          fiscalYear,
          holdingInfo: {
            holdingNo,
            ward: Number(ward),
            area: Number(area || "0"),
            holdingType: "RESIDENTIAL",
          },
          assessment: {
            assessedValue: Number(assessedValue || "0"),
            taxRate: Number(taxRate || "0"),
            annualTax: Number(annualTax),
          },
          arrears: Number(arrears || "0"),
          rebate: Number(rebate || "0"),
          dueDate,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
        return;
      }

      setShowCreateTaxDialog(false);
      setFiscalYear(getDefaultFiscalYear());
      setHoldingNo("");
      setWard("1");
      setArea("0");
      setAnnualTax("");
      setAssessedValue("0");
      setTaxRate("0");
      setArrears("0");
      setRebate("0");
      setDueDate("");
      await fetchTaxes();
      alert(locale === "bn" ? "ট্যাক্স যোগ হয়েছে" : "Yearly tax added");
    } catch (error) {
      console.error("Create tax error:", error);
      alert(locale === "bn" ? "ট্যাক্স তৈরি ব্যর্থ হয়েছে" : "Tax creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchReceipt = async (taxId: string, receiptNo: string) => {
    setReceiptError("");
    try {
      const res = await fetch(`/api/holding-tax/${taxId}?receiptNo=${receiptNo}`);
      const data = await res.json();
      if (!data.success) {
        setReceiptError(data.message);
        return;
      }
      alert(
        locale === "bn"
          ? `রসিদ প্রস্তুত: ${data.receipt.receiptNo}`
          : `Receipt ready: ${data.receipt.receiptNo}`
      );
    } catch {
      setReceiptError(locale === "bn" ? "রসিদ লোড ব্যর্থ হয়েছে" : "Failed to load receipt");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {locale === "bn" ? "পরিশোধিত" : "Paid"}
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {locale === "bn" ? "আংশিক" : "Partial"}
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {locale === "bn" ? "বকেয়া" : "Overdue"}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {locale === "bn" ? "অপরিশোধিত" : "Unpaid"}
          </Badge>
        );
    }
  };

  const hasUnpaidTax = useMemo(
    () => taxes.some((tax) => ["UNPAID", "PARTIAL", "OVERDUE"].includes(tax.status)),
    [taxes]
  );
  const totalDue = useMemo(() => taxes.reduce((sum, tax) => sum + tax.balance, 0), [taxes]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <CardTitle>{locale === "bn" ? "হোল্ডিং ট্যাক্স" : "Holding Tax"}</CardTitle>
            </div>
            <Button size="sm" onClick={() => setShowCreateTaxDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {locale === "bn" ? "বার্ষিক ট্যাক্স যোগ করুন" : "Add Yearly Tax"}
            </Button>
          </div>
          {hasUnpaidTax && (
            <div className="mt-2 rounded-md bg-destructive/10 p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  {locale === "bn" ? "বকেয়া ট্যাক্স রয়েছে" : "Unpaid Tax Alert"}
                </p>
                <p className="text-sm text-destructive/80">
                  {locale === "bn"
                    ? `মোট বকেয়া: ৳ ${totalDue.toLocaleString()}`
                    : `Total Due: ৳ ${totalDue.toLocaleString()}`}
                </p>
                <p className="text-xs text-destructive/70 mt-1">
                  {locale === "bn"
                    ? "⚠️ বকেয়া ট্যাক্স পরিশোধ না করা পর্যন্ত সেবা বন্ধ থাকবে"
                    : "⚠️ Services are blocked until dues are cleared"}
                </p>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
            </div>
          ) : taxes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {locale === "bn" ? "কোনো ট্যাক্স রেকর্ড নেই" : "No tax records found"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === "bn" ? "রেফারেন্স নং" : "Reference No"}</TableHead>
                    <TableHead>{locale === "bn" ? "অর্থবছর" : "Fiscal Year"}</TableHead>
                    <TableHead>{locale === "bn" ? "হোল্ডিং নং" : "Holding No"}</TableHead>
                    <TableHead className="text-right">{locale === "bn" ? "মোট" : "Total"}</TableHead>
                    <TableHead className="text-right">
                      {locale === "bn" ? "পরিশোধিত" : "Paid"}
                    </TableHead>
                    <TableHead className="text-right">
                      {locale === "bn" ? "বকেয়া" : "Balance"}
                    </TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxes.map((tax) => (
                    <TableRow key={tax._id}>
                      <TableCell className="font-medium">{tax.referenceNo}</TableCell>
                      <TableCell>{tax.fiscalYear}</TableCell>
                      <TableCell>{tax.holdingInfo.holdingNo}</TableCell>
                      <TableCell className="text-right">৳ {tax.totalDue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳ {tax.totalPaid.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ৳ {tax.balance.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(tax.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {tax.balance > 0 && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedTax(tax);
                                  setPaymentAmount(tax.balance.toString());
                                  setShowPaymentDialog(true);
                                }}
                              >
                                {locale === "bn" ? "পেমেন্ট" : "Pay"}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={submitting}
                                onClick={() => handleMarkAsPaid(tax)}
                              >
                                {locale === "bn" ? "সম্পূর্ণ পরিশোধিত" : "Mark Paid"}
                              </Button>
                            </>
                          )}
                          {tax.payments.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTax(tax);
                                setReceiptError("");
                                setShowReceiptDialog(true);
                              }}
                            >
                              <History className="h-4 w-4 mr-1" />
                              {locale === "bn" ? "ইতিহাস" : "History"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateTaxDialog} onOpenChange={setShowCreateTaxDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{locale === "bn" ? "বার্ষিক ট্যাক্স যোগ করুন" : "Add Yearly Tax"}</DialogTitle>
            <DialogDescription>
              {locale === "bn"
                ? "নতুন অর্থবছরের জন্য হোল্ডিং ট্যাক্স সেট করুন"
                : "Create tax entry for a fiscal year"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{locale === "bn" ? "অর্থবছর" : "Fiscal Year"} *</Label>
              <Input value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{locale === "bn" ? "হোল্ডিং নং" : "Holding No"} *</Label>
              <Input value={holdingNo} onChange={(e) => setHoldingNo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{locale === "bn" ? "ওয়ার্ড" : "Ward"} *</Label>
              <Input type="number" min={1} max={9} value={ward} onChange={(e) => setWard(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{locale === "bn" ? "এরিয়া" : "Area"}</Label>
              <Input type="number" min={0} value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{locale === "bn" ? "বার্ষিক ট্যাক্স" : "Annual Tax"} *</Label>
              <Input
                type="number"
                min={0}
                value={annualTax}
                onChange={(e) => setAnnualTax(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === "bn" ? "মূল্যায়িত মূল্য" : "Assessed Value"}</Label>
              <Input
                type="number"
                min={0}
                value={assessedValue}
                onChange={(e) => setAssessedValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === "bn" ? "কর হার (%)" : "Tax Rate (%)"}</Label>
              <Input type="number" min={0} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{locale === "bn" ? "বকেয়া" : "Arrears"}</Label>
              <Input type="number" min={0} value={arrears} onChange={(e) => setArrears(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{locale === "bn" ? "রেয়াত" : "Rebate"}</Label>
              <Input type="number" min={0} value={rebate} onChange={(e) => setRebate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{locale === "bn" ? "পরিশোধের শেষ তারিখ" : "Due Date"} *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTaxDialog(false)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateTax} disabled={submitting}>
              {submitting ? (locale === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === "bn" ? "পেমেন্ট করুন" : "Make Payment"}</DialogTitle>
            <DialogDescription>
              {locale === "bn" ? "পেমেন্টের তথ্য দিন" : "Enter payment details"}
            </DialogDescription>
          </DialogHeader>
          {selectedTax && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {locale === "bn" ? "রেফারেন্স নং" : "Reference"}
                  </span>
                  <span className="font-medium">{selectedTax.referenceNo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {locale === "bn" ? "মোট বকেয়া" : "Total Due"}
                  </span>
                  <span className="font-semibold">৳ {selectedTax.balance.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">{locale === "bn" ? "পরিমাণ" : "Amount"} *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedTax.balance}
                  min={0}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">{locale === "bn" ? "পেমেন্ট পদ্ধতি" : "Payment Method"} *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{locale === "bn" ? "নগদ" : "Cash"}</SelectItem>
                    <SelectItem value="BANK">{locale === "bn" ? "ব্যাংক" : "Bank Transfer"}</SelectItem>
                    <SelectItem value="MOBILE_BANKING">
                      {locale === "bn" ? "মোবাইল ব্যাংকিং" : "Mobile Banking"}
                    </SelectItem>
                    <SelectItem value="CHEQUE">{locale === "bn" ? "চেক" : "Cheque"}</SelectItem>
                    <SelectItem value="ONLINE">{locale === "bn" ? "অনলাইন" : "Online"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod !== "CASH" && (
                <div className="space-y-2">
                  <Label htmlFor="transactionId">
                    {locale === "bn" ? "ট্রানজেকশন ID" : "Transaction ID"}
                  </Label>
                  <Input
                    id="transactionId"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder={paymentMethod === "MOBILE_BANKING" ? "TrxID123456" : ""}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handlePayment} disabled={submitting}>
              {submitting
                ? locale === "bn"
                  ? "প্রসেসিং..."
                  : "Processing..."
                : locale === "bn"
                ? "পেমেন্ট করুন"
                : "Submit Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{locale === "bn" ? "পেমেন্ট ইতিহাস" : "Payment History"}</DialogTitle>
          </DialogHeader>
          {selectedTax && (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{locale === "bn" ? "রসিদ নং" : "Receipt No"}</TableHead>
                      <TableHead>{locale === "bn" ? "তারিখ" : "Date"}</TableHead>
                      <TableHead>{locale === "bn" ? "পদ্ধতি" : "Method"}</TableHead>
                      <TableHead className="text-right">{locale === "bn" ? "পরিমাণ" : "Amount"}</TableHead>
                      <TableHead className="text-right">{locale === "bn" ? "রসিদ" : "Receipt"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTax.payments.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{payment.receiptNo}</TableCell>
                        <TableCell>{formatDate(payment.paymentDate, locale)}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ৳ {payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchReceipt(selectedTax._id, payment.receiptNo)}
                          >
                            <Receipt className="h-4 w-4 mr-1" />
                            {locale === "bn" ? "প্রিন্ট" : "Print"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {receiptError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{receiptError}</div>
              )}
              <div className="rounded-md bg-muted p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {locale === "bn" ? "মোট পরিশোধিত" : "Total Paid"}
                  </span>
                  <span className="font-semibold">৳ {selectedTax.totalPaid.toLocaleString()}</span>
                </div>
                {selectedTax.balance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {locale === "bn" ? "বকেয়া" : "Balance"}
                    </span>
                    <span className="font-semibold text-destructive">
                      ৳ {selectedTax.balance.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
