"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ImportError {
  row: number;
  message: string;
}

export function ExcelContent({ locale }: { locale: string }) {
  const now = new Date();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    failed: number;
    errors: ImportError[];
  } | null>(null);
  const [message, setMessage] = useState("");

  const [dailyDate, setDailyDate] = useState(now.toISOString().split("T")[0]);
  const [monthlyYear, setMonthlyYear] = useState(String(now.getFullYear()));
  const [monthlyMonth, setMonthlyMonth] = useState(String(now.getMonth() + 1));

  const importCitizens = async () => {
    if (!file) {
      setMessage(locale === "bn" ? "ফাইল নির্বাচন করুন" : "Please select a file");
      return;
    }

    setImporting(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/excel/import-citizens", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        setMessage(data.message || "Import failed");
        return;
      }

      setImportSummary({
        imported: data.imported || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
      });
      setMessage(locale === "bn" ? "ইমপোর্ট সম্পন্ন" : "Import completed");
    } finally {
      setImporting(false);
    }
  };

  const exportDaily = () => {
    window.open(`/api/excel/export-reports?type=daily&date=${dailyDate}`, "_blank");
  };

  const exportMonthly = () => {
    window.open(
      `/api/excel/export-reports?type=monthly&year=${monthlyYear}&month=${monthlyMonth}`,
      "_blank"
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {locale === "bn" ? "এক্সেল সিস্টেম" : "Excel System"}
          </h1>
          <p className="text-muted-foreground">
            {locale === "bn"
              ? "নাগরিক Import করুন এবং রিপোর্ট Excel এ Export করুন"
              : "Import citizens and export reports in Excel"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {locale === "bn" ? "নাগরিক Import (xlsx)" : "Import Citizens (xlsx)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{locale === "bn" ? "Excel ফাইল" : "Excel File"}</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                {locale === "bn"
                  ? "কলাম: name, nameBn, fatherName, motherName, dateOfBirth, gender, nid, mobile, presentWard, permanentWard"
                  : "Columns: name, nameBn, fatherName, motherName, dateOfBirth, gender, nid, mobile, presentWard, permanentWard"}
              </p>
            </div>

            <Button onClick={importCitizens} disabled={importing}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {importing
                ? locale === "bn"
                  ? "ইমপোর্ট হচ্ছে..."
                  : "Importing..."
                : locale === "bn"
                ? "ইমপোর্ট শুরু"
                : "Start Import"}
            </Button>
          </CardContent>
        </Card>

        {importSummary ? (
          <Card>
            <CardHeader>
              <CardTitle>{locale === "bn" ? "ইমপোর্ট সারাংশ" : "Import Summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">{locale === "bn" ? "ইমপোর্ট সফল" : "Imported"}</p>
                  <p className="text-2xl font-bold text-green-700">{importSummary.imported}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">{locale === "bn" ? "ব্যর্থ" : "Failed"}</p>
                  <p className="text-2xl font-bold text-red-700">{importSummary.failed}</p>
                </div>
              </div>

              {importSummary.errors.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{locale === "bn" ? "রো" : "Row"}</TableHead>
                        <TableHead>{locale === "bn" ? "ত্রুটি" : "Error"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importSummary.errors.map((err, idx) => (
                        <TableRow key={`${err.row}-${idx}`}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell>{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {locale === "bn" ? "রিপোর্ট Export (xlsx)" : "Export Reports (xlsx)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-md border p-4">
                <Label>{locale === "bn" ? "দৈনিক রিপোর্ট তারিখ" : "Daily Report Date"}</Label>
                <Input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
                <Button variant="outline" onClick={exportDaily}>
                  {locale === "bn" ? "দৈনিক রিপোর্ট Export" : "Export Daily Report"}
                </Button>
              </div>
              <div className="space-y-3 rounded-md border p-4">
                <Label>{locale === "bn" ? "মাসিক রিপোর্ট" : "Monthly Report"}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={monthlyYear} onChange={(e) => setMonthlyYear(e.target.value)} />
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={monthlyMonth}
                    onChange={(e) => setMonthlyMonth(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={exportMonthly}>
                  {locale === "bn" ? "মাসিক রিপোর্ট Export" : "Export Monthly Report"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {message ? <div className="rounded-md border bg-muted/40 p-3 text-sm">{message}</div> : null}
      </div>
    </DashboardLayout>
  );
}

