"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CitizenOption {
  _id: string;
  name: string;
  nameBn: string;
  fatherName?: string;
}

interface TemplateOption {
  _id: string;
  name: string;
  nameBn: string;
  certificateType: string;
}

interface CertificateItem {
  _id: string;
  referenceNo: string;
  certificateNo: string;
  type: string;
  status: string;
  applicantName: string;
  finalText: string;
  dataSnapshot: {
    name?: string;
    father_name?: string;
  };
}

interface PrintPreviewData {
  certificateId: string;
  referenceNo: string;
  finalText: string;
  applicantName: string;
  status: string;
  printCount: number;
  lastPrintedAt?: string;
}

interface PrintHistoryItem {
  printedAt: string;
  printedBy?: string;
  method: "PREVIEW" | "PRINT";
  note?: string;
}

const certificateTypeOptions = [
  "BIRTH",
  "DEATH",
  "CITIZENSHIP",
  "CHARACTER",
  "INHERITORSHIP",
  "TRADE_LICENSE",
  "NOC",
] as const;

export function CertificatesContent({ locale }: { locale: string }) {
  const [citizens, setCitizens] = useState<CitizenOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [selectedCitizenId, setSelectedCitizenId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [certificateType, setCertificateType] = useState("CITIZENSHIP");
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrintHistory, setShowPrintHistory] = useState(false);
  const [printPreview, setPrintPreview] = useState<PrintPreviewData | null>(null);
  const [printHistory, setPrintHistory] = useState<PrintHistoryItem[]>([]);
  const [printMessage, setPrintMessage] = useState("");

  const selectedCitizen = useMemo(
    () => citizens.find((c) => c._id === selectedCitizenId),
    [citizens, selectedCitizenId]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [citizenRes, templateRes, certRes] = await Promise.all([
        fetch("/api/citizens?limit=200"),
        fetch("/api/certificate-templates"),
        fetch("/api/certificates"),
      ]);
      const [citizenData, templateData, certData] = await Promise.all([
        citizenRes.json(),
        templateRes.json(),
        certRes.json(),
      ]);

      if (citizenData.success) {
        setCitizens(citizenData.citizens);
      }
      if (templateData.success) {
        setTemplates(templateData.templates);
      }
      if (certData.success) {
        setCertificates(certData.certificates);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedCitizen) return;
    setName(selectedCitizen.name || "");
    setFatherName(selectedCitizen.fatherName || "");
  }, [selectedCitizen]);

  const resetForm = () => {
    setEditingId(null);
    setSelectedCitizenId("");
    setSelectedTemplateId("");
    setCertificateType("CITIZENSHIP");
    setName("");
    setFatherName("");
  };

  const handleCreate = async () => {
    if (!selectedCitizenId || !selectedTemplateId || !certificateType) {
      alert(locale === "bn" ? "সব প্রয়োজনীয় তথ্য দিন" : "Please fill required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizenId: selectedCitizenId,
          type: certificateType,
          templateId: selectedTemplateId,
          dataSnapshot: {
            name,
            father_name: fatherName,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
        return;
      }
      resetForm();
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/certificates/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataSnapshot: {
            name,
            father_name: fatherName,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
        return;
      }
      resetForm();
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (certificateId: string) => {
    const res = await fetch("/api/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        certificateId,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.message);
      return;
    }
    await fetchData();
  };

  const handlePdfExport = (certificateId: string) => {
    window.open(`/api/certificates/${certificateId}/pdf`, "_blank");
  };

  const openPrintPreview = async (certificateId: string) => {
    setPrintMessage("");
    const res = await fetch(`/api/certificates/${certificateId}/print`);
    const data = await res.json();
    if (!data.success) {
      setPrintMessage(data.message);
      return;
    }
    setPrintPreview(data.preview);
    setShowPrintPreview(true);
    await fetch(`/api/certificates/${certificateId}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "PREVIEW", note: "Preview opened from UI" }),
    });
  };

  const openPrintHistory = async (certificateId: string) => {
    setPrintMessage("");
    const res = await fetch(`/api/certificates/${certificateId}/print?mode=history`);
    const data = await res.json();
    if (!data.success) {
      setPrintMessage(data.message);
      return;
    }
    setPrintHistory(data.history || []);
    setShowPrintHistory(true);
  };

  const handlePrintFromPreview = async () => {
    if (!printPreview) return;
    const result = await fetch(`/api/certificates/${printPreview.certificateId}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "PRINT", note: "Print requested from preview dialog" }),
    });
    const data = await result.json();
    if (!data.success) {
      setPrintMessage(data.message);
      return;
    }
    window.open(`/api/certificates/${printPreview.certificateId}/pdf`, "_blank");
    await fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {locale === "bn" ? "সনদপত্র ইস্যু" : "Certificate Workflow"}
            </h1>
            <p className="text-muted-foreground">
              {locale === "bn"
                ? "নাগরিক নির্বাচন করে খসড়া তৈরি, সম্পাদনা, জমা দিন"
                : "Select citizen, auto-fill, edit and submit for approval"}
            </p>
          </div>
          <Button variant="outline" onClick={() => (window.location.href = `/${locale}/dashboard/certificates/approvals`)}>
            {locale === "bn" ? "অনুমোদন পেজ" : "Approval Page"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? (locale === "bn" ? "সনদ সম্পাদনা" : "Edit Certificate") : (locale === "bn" ? "নতুন সনদ" : "New Certificate")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{locale === "bn" ? "নাগরিক" : "Citizen"} *</Label>
                <Select value={selectedCitizenId} onValueChange={setSelectedCitizenId} disabled={Boolean(editingId)}>
                  <SelectTrigger>
                    <SelectValue placeholder={locale === "bn" ? "নির্বাচন করুন" : "Select citizen"} />
                  </SelectTrigger>
                  <SelectContent>
                    {citizens.map((citizen) => (
                      <SelectItem key={citizen._id} value={citizen._id}>
                        {citizen.nameBn || citizen.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "সনদের ধরন" : "Certificate Type"} *</Label>
                <Select value={certificateType} onValueChange={setCertificateType} disabled={Boolean(editingId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {certificateTypeOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "টেমপ্লেট" : "Template"} *</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={Boolean(editingId)}>
                  <SelectTrigger>
                    <SelectValue placeholder={locale === "bn" ? "নির্বাচন করুন" : "Select template"} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter((t) => t.certificateType === certificateType)
                      .map((template) => (
                        <SelectItem key={template._id} value={template._id}>
                          {template.nameBn || template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{`{{name}}`}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{`{{father_name}}`}</Label>
                <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editingId ? (
                <Button onClick={handleUpdate} disabled={saving}>
                  {locale === "bn" ? "আপডেট" : "Update"}
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={saving}>
                  {locale === "bn" ? "খসড়া তৈরি" : "Create Draft"}
                </Button>
              )}
              <Button variant="outline" onClick={resetForm}>
                {locale === "bn" ? "রিসেট" : "Reset"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "সনদ তালিকা" : "Certificate List"}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">{locale === "bn" ? "লোড হচ্ছে..." : "Loading..."}</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{locale === "bn" ? "রেফারেন্স" : "Reference"}</TableHead>
                      <TableHead>{locale === "bn" ? "সনদ নম্বর" : "Certificate No"}</TableHead>
                      <TableHead>{locale === "bn" ? "আবেদনকারী" : "Applicant"}</TableHead>
                      <TableHead>{locale === "bn" ? "ধরন" : "Type"}</TableHead>
                      <TableHead>{locale === "bn" ? "অবস্থা" : "Status"}</TableHead>
                      <TableHead className="text-right">{locale === "bn" ? "কার্যক্রম" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.referenceNo}</TableCell>
                        <TableCell>{item.certificateNo}</TableCell>
                        <TableCell>{item.applicantName}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "APPROVED"
                                ? "success"
                                : item.status === "SUBMITTED"
                                ? "warning"
                                : "outline"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {item.status !== "APPROVED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(item._id);
                                  setName(item.dataSnapshot?.name || item.applicantName || "");
                                  setFatherName(item.dataSnapshot?.father_name || "");
                                }}
                              >
                                {locale === "bn" ? "সম্পাদনা" : "Edit"}
                              </Button>
                            )}
                            {item.status === "DRAFT" || item.status === "PENDING" || item.status === "REJECTED" ? (
                              <Button size="sm" onClick={() => handleSubmit(item._id)}>
                                {locale === "bn" ? "জমা" : "Submit"}
                              </Button>
                            ) : null}
                            {item.status === "APPROVED" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => openPrintPreview(item._id)}>
                                  {locale === "bn" ? "প্রিন্ট প্রিভিউ" : "Print Preview"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openPrintHistory(item._id)}>
                                  {locale === "bn" ? "প্রিন্ট ইতিহাস" : "Print History"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handlePdfExport(item._id)}>
                                  {locale === "bn" ? "PDF" : "PDF"}
                                </Button>
                              </>
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

        {printMessage && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{printMessage}</div>
        )}
      </div>

      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{locale === "bn" ? "প্রিন্ট প্রিভিউ" : "Print Preview"}</DialogTitle>
          </DialogHeader>
          {printPreview && (
            <div className="space-y-4">
              <div className="rounded-md border p-4 bg-white text-black">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold">Smart Union Parishad</h2>
                  <p className="text-sm text-muted-foreground">Reference: {printPreview.referenceNo}</p>
                </div>
                <div dangerouslySetInnerHTML={{ __html: printPreview.finalText }} />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {locale === "bn" ? "প্রিন্ট সংখ্যা" : "Print Count"}: {printPreview.printCount}
                </span>
                <Button onClick={handlePrintFromPreview}>
                  {locale === "bn" ? "প্রিন্ট করুন" : "Print"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPrintHistory} onOpenChange={setShowPrintHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{locale === "bn" ? "প্রিন্ট ইতিহাস" : "Print History"}</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "bn" ? "তারিখ" : "Date"}</TableHead>
                  <TableHead>{locale === "bn" ? "পদ্ধতি" : "Method"}</TableHead>
                  <TableHead>{locale === "bn" ? "ব্যবহারকারী" : "User"}</TableHead>
                  <TableHead>{locale === "bn" ? "নোট" : "Note"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printHistory.map((entry, idx) => (
                  <TableRow key={`${entry.printedAt}-${idx}`}>
                    <TableCell>{new Date(entry.printedAt).toLocaleString()}</TableCell>
                    <TableCell>{entry.method}</TableCell>
                    <TableCell>{entry.printedBy || "System"}</TableCell>
                    <TableCell>{entry.note || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

