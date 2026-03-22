"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCcw } from "lucide-react";

interface WardStats {
  ward: number;
  assessed: number;
  collected: number;
}

interface TaxStats {
  totalAssessed: number;
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
  byWard: WardStats[];
}

function toCurrency(value: number): string {
  return `৳ ${value.toLocaleString()}`;
}

export function TaxesContent({ locale }: { locale: string }) {
  const [fiscalYear, setFiscalYear] = useState("");
  const [stats, setStats] = useState<TaxStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStats = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (fiscalYear.trim()) params.set("fiscalYear", fiscalYear.trim());
      const res = await fetch(`/api/holding-tax?${params.toString()}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || (locale === "bn" ? "ডেটা লোড ব্যর্থ হয়েছে" : "Failed to load data"));
        return;
      }
      setStats(data.stats || null);
    } catch {
      setError(locale === "bn" ? "ডেটা লোড ব্যর্থ হয়েছে" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wardRows = useMemo(() => stats?.byWard || [], [stats]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-2xl font-bold tracking-tight">
              {locale === "bn" ? "কর ড্যাশবোর্ড" : "Taxes Dashboard"}
            </h1>
            <p className="text-muted-foreground">
              {locale === "bn"
                ? "হোল্ডিং ট্যাক্স সংগ্রহ, বকেয়া এবং ওয়ার্ডভিত্তিক অবস্থা"
                : "Holding tax collection, pending dues, and ward-wise summary"}
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <Label htmlFor="fiscalYear">{locale === "bn" ? "অর্থবছর" : "Fiscal year"}</Label>
            <Input
              id="fiscalYear"
              placeholder="2025-2026"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
            />
          </div>
          <Button onClick={loadStats} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {locale === "bn" ? "রিফ্রেশ" : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>{locale === "bn" ? "মোট নির্ধারিত কর" : "Total Assessed"}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{toCurrency(stats?.totalAssessed || 0)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{locale === "bn" ? "মোট আদায়" : "Total Collected"}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-green-700">
              {toCurrency(stats?.totalCollected || 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{locale === "bn" ? "মোট বকেয়া" : "Total Pending"}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-amber-700">
              {toCurrency(stats?.totalPending || 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{locale === "bn" ? "সংগ্রহ হার" : "Collection Rate"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-base">
                {stats?.collectionRate ?? 0}%
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "ওয়ার্ডভিত্তিক সংগ্রহ" : "Ward-wise Collection"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "bn" ? "ওয়ার্ড" : "Ward"}</TableHead>
                  <TableHead className="text-right">{locale === "bn" ? "নির্ধারিত" : "Assessed"}</TableHead>
                  <TableHead className="text-right">{locale === "bn" ? "আদায়" : "Collected"}</TableHead>
                  <TableHead className="text-right">{locale === "bn" ? "হার" : "Rate"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wardRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {locale === "bn" ? "কোনো ডেটা নেই" : "No data found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  wardRows.map((row) => {
                    const rate = row.assessed > 0 ? Math.round((row.collected / row.assessed) * 100) : 0;
                    return (
                      <TableRow key={row.ward}>
                        <TableCell>{row.ward}</TableCell>
                        <TableCell className="text-right">{toCurrency(row.assessed)}</TableCell>
                        <TableCell className="text-right">{toCurrency(row.collected)}</TableCell>
                        <TableCell className="text-right">{rate}%</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

