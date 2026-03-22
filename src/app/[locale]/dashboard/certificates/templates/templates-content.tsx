"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { SUPPORTED_CERTIFICATE_PLACEHOLDERS } from "@/lib/certificate-template";

type TemplateStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

interface CertificateTemplate {
  _id: string;
  name: string;
  nameEn: string;
  nameBn: string;
  certificateType: string;
  bodyHtml: string;
  headerHtml?: string;
  footerHtml?: string;
  stylesCss?: string;
  status: TemplateStatus;
  fee: number;
  placeholders: string[];
  updatedAt: string;
}

interface TemplateFormState {
  name: string;
  nameEn: string;
  nameBn: string;
  certificateType: string;
  status: TemplateStatus;
  fee: string;
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  stylesCss: string;
  previewName: string;
  previewFatherName: string;
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

const defaultTemplateForm: TemplateFormState = {
  name: "",
  nameEn: "",
  nameBn: "",
  certificateType: "CITIZENSHIP",
  status: "DRAFT",
  fee: "0",
  headerHtml: "",
  bodyHtml:
    "<h1 style='text-align:center'>Certificate</h1><p>This is to certify that <strong>{{name}}</strong>, father: <strong>{{father_name}}</strong>.</p>",
  footerHtml: "",
  stylesCss: "body { font-family: Arial, sans-serif; line-height: 1.6; }",
  previewName: "Rahim Uddin",
  previewFatherName: "Karim Uddin",
};

export function TemplatesContent({ locale }: { locale: string }) {
  const t = useTranslations();

  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [form, setForm] = useState<TemplateFormState>(defaultTemplateForm);

  const placeholderHint = useMemo(
    () => SUPPORTED_CERTIFICATE_PLACEHOLDERS.map((item) => `{{${item}}}`).join(", "),
    []
  );

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/certificate-templates");
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to load templates");
      }
      setTemplates(data.templates);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  const generatePreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/certificate-templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headerHtml: form.headerHtml,
          bodyHtml: form.bodyHtml,
          footerHtml: form.footerHtml,
          stylesCss: form.stylesCss,
          previewData: {
            name: form.previewName,
            father_name: form.previewFatherName,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewHtml(data.previewHtml);
      } else {
        setPreviewHtml("");
        setError(data.message || "Failed to generate preview");
      }
    } catch {
      setPreviewHtml("");
    } finally {
      setPreviewLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (!showEditor) return;
    const timer = setTimeout(() => {
      generatePreview();
    }, 250);
    return () => clearTimeout(timer);
  }, [showEditor, generatePreview]);

  const openCreateEditor = () => {
    setEditingTemplateId(null);
    setForm(defaultTemplateForm);
    setPreviewHtml("");
    setError("");
    setShowEditor(true);
  };

  const openEditEditor = (template: CertificateTemplate) => {
    setEditingTemplateId(template._id);
    setForm({
      name: template.name,
      nameEn: template.nameEn,
      nameBn: template.nameBn,
      certificateType: template.certificateType,
      status: template.status,
      fee: String(template.fee ?? 0),
      headerHtml: template.headerHtml || "",
      bodyHtml: template.bodyHtml,
      footerHtml: template.footerHtml || "",
      stylesCss: template.stylesCss || "",
      previewName: "Rahim Uddin",
      previewFatherName: "Karim Uddin",
    });
    setPreviewHtml("");
    setError("");
    setShowEditor(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        nameEn: form.nameEn.trim(),
        nameBn: form.nameBn.trim(),
        certificateType: form.certificateType,
        status: form.status,
        fee: Number(form.fee || "0"),
        headerHtml: form.headerHtml,
        bodyHtml: form.bodyHtml,
        footerHtml: form.footerHtml,
        stylesCss: form.stylesCss,
      };

      const isEdit = Boolean(editingTemplateId);
      const endpoint = isEdit
        ? `/api/certificate-templates/${editingTemplateId}`
        : "/api/certificate-templates";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to save template");
      }

      setShowEditor(false);
      await fetchTemplates();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: TemplateStatus) => {
    if (status === "ACTIVE") return <Badge variant="success">ACTIVE</Badge>;
    if (status === "INACTIVE") return <Badge variant="secondary">INACTIVE</Badge>;
    return <Badge variant="warning">DRAFT</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {locale === "bn" ? "সার্টিফিকেট টেমপ্লেট" : "Certificate Templates"}
            </h1>
            <p className="text-muted-foreground">
              {locale === "bn"
                ? "টেমপ্লেট তৈরি, সম্পাদনা এবং প্রিভিউ করুন"
                : "Create, edit, and preview certificate templates"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchTemplates}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {locale === "bn" ? "রিফ্রেশ" : "Refresh"}
            </Button>
            <Button onClick={openCreateEditor}>
              <Plus className="mr-2 h-4 w-4" />
              {locale === "bn" ? "নতুন টেমপ্লেট" : "Create Template"}
            </Button>
          </div>
        </div>

        {error && !showEditor && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "টেমপ্লেট তালিকা" : "Template List"}</CardTitle>
            <CardDescription>
              {locale === "bn"
                ? "বর্তমান সার্টিফিকেট টেমপ্লেটসমূহ"
                : "Available certificate templates"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "bn" ? "কোনো টেমপ্লেট পাওয়া যায়নি" : "No templates found"}
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template) => (
                  <div key={template._id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{template.nameEn || template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.nameBn}</p>
                      </div>
                      {getStatusBadge(template.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Type: <span className="font-medium text-foreground">{template.certificateType}</span>
                      </p>
                      <p>
                        Fee: <span className="font-medium text-foreground">{template.fee}</span>
                      </p>
                      <p>
                        Placeholders:{" "}
                        <span className="font-medium text-foreground">
                          {(template.placeholders || []).length > 0
                            ? template.placeholders.map((item) => `{{${item}}}`).join(", ")
                            : "None"}
                        </span>
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => openEditEditor(template)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {locale === "bn" ? "সম্পাদনা" : "Edit"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplateId
                ? locale === "bn"
                  ? "টেমপ্লেট সম্পাদনা"
                  : "Edit Template"
                : locale === "bn"
                ? "নতুন টেমপ্লেট"
                : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {locale === "bn"
                ? `সমর্থিত প্লেসহোল্ডার: ${placeholderHint}`
                : `Supported placeholders: ${placeholderHint}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name (English) *</Label>
                  <Input
                    value={form.nameEn}
                    onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name (Bangla) *</Label>
                  <Input
                    value={form.nameBn}
                    onChange={(e) => setForm((prev) => ({ ...prev, nameBn: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Certificate Type *</Label>
                  <Select
                    value={form.certificateType}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, certificateType: value }))
                    }
                  >
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
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, status: value as TemplateStatus }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fee</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.fee}
                    onChange={(e) => setForm((prev) => ({ ...prev, fee: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Header HTML</Label>
                <textarea
                  className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.headerHtml}
                  onChange={(e) => setForm((prev) => ({ ...prev, headerHtml: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Body HTML *</Label>
                <textarea
                  className="w-full min-h-56 rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.bodyHtml}
                  onChange={(e) => setForm((prev) => ({ ...prev, bodyHtml: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Footer HTML</Label>
                <textarea
                  className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.footerHtml}
                  onChange={(e) => setForm((prev) => ({ ...prev, footerHtml: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Styles CSS</Label>
                <textarea
                  className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.stylesCss}
                  onChange={(e) => setForm((prev) => ({ ...prev, stylesCss: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{locale === "bn" ? "প্রিভিউ ডাটা" : "Preview Data"}</CardTitle>
                  <CardDescription>
                    {locale === "bn"
                      ? "প্লেসহোল্ডার প্রতিস্থাপনের জন্য ডাটা দিন"
                      : "Provide values for placeholders"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>{`{{name}}`}</Label>
                    <Input
                      value={form.previewName}
                      onChange={(e) => setForm((prev) => ({ ...prev, previewName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{`{{father_name}}`}</Label>
                    <Input
                      value={form.previewFatherName}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, previewFatherName: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={generatePreview}
                    disabled={previewLoading}
                  >
                    {previewLoading
                      ? locale === "bn"
                        ? "প্রিভিউ হচ্ছে..."
                        : "Generating preview..."
                      : locale === "bn"
                      ? "প্রিভিউ আপডেট করুন"
                      : "Refresh Preview"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{locale === "bn" ? "লাইভ প্রিভিউ" : "Live Preview"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border min-h-[420px] bg-white text-black">
                    {previewHtml ? (
                      <iframe
                        title="Certificate Preview"
                        className="w-full h-[420px]"
                        srcDoc={previewHtml}
                      />
                    ) : (
                      <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">
                        {locale === "bn" ? "প্রিভিউ পাওয়া যায়নি" : "No preview yet"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (locale === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...") : t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

