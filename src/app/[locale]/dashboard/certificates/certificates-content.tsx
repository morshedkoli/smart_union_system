"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
  id: string;
  name: string;
  nameBn: string;
  fatherName?: string;
  fatherNameBn?: string;
}

interface TemplateOption {
  id: string;
  name: string;
  nameBn: string;
  certificateType: string;
}

interface CertificateItem {
  id: string;
  referenceNo: string;
  certificateNo: string;
  type: string;
  status: string;
  applicantName: string;
  finalText: string;
  dataSnapshot: {
    name?: string;
    name_bn?: string;
    father_name?: string;
    father_name_bn?: string;
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

interface CertificateApiItem {
  id?: string;
  _id?: string;
  referenceNo?: string;
  certificateNo?: string | null;
  type?: string;
  status?: string;
  applicantName?: string | null;
  finalText?: string | null;
  metadata?: {
    customFields?: {
      name?: string;
      name_bn?: string;
      father_name?: string;
      father_name_bn?: string;
    };
  } | null;
}

function normalizeCertificates(items: CertificateApiItem[]): CertificateItem[] {
  return items.reduce<CertificateItem[]>((normalized, item) => {
      const id = item.id || item._id;
      if (!id) {
        return normalized;
      }

      normalized.push({
        id,
        referenceNo: item.referenceNo || "",
        certificateNo: item.certificateNo || "",
        type: item.type || "",
        status: item.status || "",
        applicantName: item.applicantName || "",
        finalText: item.finalText || "",
        dataSnapshot: {
          name: item.metadata?.customFields?.name,
          name_bn: item.metadata?.customFields?.name_bn,
          father_name: item.metadata?.customFields?.father_name,
          father_name_bn: item.metadata?.customFields?.father_name_bn,
        },
      });

      return normalized;
    }, []);
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
  const [nameBn, setNameBn] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherNameBn, setFatherNameBn] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrintHistory, setShowPrintHistory] = useState(false);
  const [printPreview, setPrintPreview] = useState<PrintPreviewData | null>(null);
  const [printHistory, setPrintHistory] = useState<PrintHistoryItem[]>([]);
  const [printMessage, setPrintMessage] = useState("");

  const selectedCitizen = useMemo(
    () => citizens.find((c) => c.id === selectedCitizenId),
    [citizens, selectedCitizenId]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [citizenRes, templateRes, certRes] = await Promise.all([
        fetch("/api/citizens?limit=200"),
        fetch("/api/certificate-templates"),
        fetch(`/api/certificates?ts=${Date.now()}`, { cache: "no-store" }),
      ]);
      const [citizenData, templateData, certData] = await Promise.all([
        citizenRes.json(),
        templateRes.json(),
        certRes.json(),
      ]);

      if (citizenRes.ok && citizenData.success) {
        setCitizens(
          (citizenData.citizens || []).map(
            (citizen: {
              id?: string;
              _id?: string;
              name?: string;
              nameBn?: string;
              fatherName?: string;
              fatherNameBn?: string;
            }) => ({
              id: citizen.id || citizen._id || "",
              name: citizen.name || "",
              nameBn: citizen.nameBn || "",
              fatherName: citizen.fatherName,
              fatherNameBn: citizen.fatherNameBn,
            })
          ).filter((citizen: CitizenOption) => Boolean(citizen.id))
        );
      }
      if (templateRes.ok && templateData.success) {
        setTemplates(
          (templateData.templates || []).map(
            (template: {
              id?: string;
              _id?: string;
              name?: string;
              nameBn?: string;
              certificateType?: string;
            }) => ({
              id: template.id || template._id || "",
              name: template.name || "",
              nameBn: template.nameBn || "",
              certificateType: template.certificateType || "",
            })
          ).filter((template: TemplateOption) => Boolean(template.id))
        );
      }
      if (certRes.ok && certData.success) {
        setCertificates(normalizeCertificates(certData.certificates || []));
      } else {
        toast.error(
          certData?.message ||
            (locale === "bn" ? "সনদের তালিকা লোড করা যায়নি" : "Failed to load certificates")
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "bn"
          ? "ডেটা লোড করা যায়নি"
          : "Failed to load certificate data"
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedCitizen) return;
    setName(selectedCitizen.name || "");
    setNameBn(selectedCitizen.nameBn || "");
    setFatherName(selectedCitizen.fatherName || "");
    setFatherNameBn(selectedCitizen.fatherNameBn || "");
  }, [selectedCitizen]);

  const resetForm = () => {
    setEditingId(null);
    setSelectedCitizenId("");
    setSelectedTemplateId("");
    setCertificateType("CITIZENSHIP");
    setName("");
    setNameBn("");
    setFatherName("");
    setFatherNameBn("");
  };

  const handleCreate = async () => {
    if (!selectedCitizenId || !selectedTemplateId || !certificateType) {
      toast.error(locale === "bn" ? "সব প্রয়োজনীয় তথ্য দিন" : "Please fill required fields");
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
            name_bn: nameBn,
            father_name: fatherName,
            father_name_bn: fatherNameBn,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || (locale === "bn" ? "সনদ তৈরি ব্যর্থ হয়েছে" : "Failed to create certificate"));
        return;
      }
      resetForm();
      await fetchData();
      toast.success(locale === "bn" ? "সনদ সফলভাবে তৈরি হয়েছে" : "Certificate created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "bn"
          ? "সনদ তৈরি ব্যর্থ হয়েছে"
          : "Failed to create certificate"
      );
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
            name_bn: nameBn,
            father_name: fatherName,
            father_name_bn: fatherNameBn,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || (locale === "bn" ? "সনদ আপডেট ব্যর্থ হয়েছে" : "Failed to update certificate"));
        return;
      }
      resetForm();
      await fetchData();
      toast.success(locale === "bn" ? "সনদ আপডেট হয়েছে" : "Certificate updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "bn"
          ? "সনদ আপডেট ব্যর্থ হয়েছে"
          : "Failed to update certificate"
      );
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
      toast.error(data.message || (locale === "bn" ? "জমা ব্যর্থ হয়েছে" : "Failed to submit certificate"));
      return;
    }
    await fetchData();
    toast.success(locale === "bn" ? "সনদ জমা দেওয়া হয়েছে" : "Certificate submitted successfully");
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
                      <SelectItem key={citizen.id} value={citizen.id}>
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
                        <SelectItem key={template.id} value={template.id}>
                          {template.nameBn || template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{locale === "bn" ? "নাম (ইংরেজি)" : "Name (English)"}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "নাম (বাংলা)" : "Name (Bangla)"}</Label>
                <Input value={nameBn} onChange={(e) => setNameBn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "পিতার নাম (ইংরেজি)" : "Father's Name (English)"}</Label>
                <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "পিতার নাম (বাংলা)" : "Father's Name (Bangla)"}</Label>
                <Input value={fatherNameBn} onChange={(e) => setFatherNameBn(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editingId ? (
                <Button onClick={handleUpdate} disabled={saving}>
                  {locale === "bn" ? "আপডেট" : "Update"}
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={saving}>
                  {locale === "bn" ? "সনদ তৈরি" : "Create Certificate"}
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
                      <TableRow key={item.id}>
                        <TableCell>{item.referenceNo}</TableCell>
                        <TableCell>{item.certificateNo || "—"}</TableCell>
                        <TableCell>{item.applicantName || item.dataSnapshot?.name || "—"}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "APPROVED"
                                ? "success"
                                : item.status === "PENDING"
                                ? "warning"
                                : item.status === "REJECTED"
                                ? "destructive"
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
                                  setEditingId(item.id);
                                  setName(item.dataSnapshot?.name || item.applicantName || "");
                                  setNameBn(item.dataSnapshot?.name_bn || "");
                                  setFatherName(item.dataSnapshot?.father_name || "");
                                  setFatherNameBn(item.dataSnapshot?.father_name_bn || "");
                                }}
                              >
                                {locale === "bn" ? "সম্পাদনা" : "Edit"}
                              </Button>
                            )}
                            {item.status === "REJECTED" ? (
                              <Button size="sm" onClick={() => handleSubmit(item.id)}>
                                {locale === "bn" ? "জমা" : "Submit"}
                              </Button>
                            ) : null}
                            {item.status === "APPROVED" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => openPrintPreview(item.id)}>
                                  {locale === "bn" ? "প্রিন্ট প্রিভিউ" : "Print Preview"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openPrintHistory(item.id)}>
                                  {locale === "bn" ? "প্রিন্ট ইতিহাস" : "Print History"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handlePdfExport(item.id)}>
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
                <div dangerouslySetInnerHTML={{ __html: printPreview.finalText || "" }} />
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

