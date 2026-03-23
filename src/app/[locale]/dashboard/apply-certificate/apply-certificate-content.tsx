"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileText, Plus, Send } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";

interface CertificateTemplate {
  id: string;
  name: string;
  nameEn: string;
  nameBn: string;
  certificateType: string;
  description?: string;
}

export function ApplyCertificateContent({ locale }: { locale: string }) {
  const t = useTranslations();
  const { user } = useAuth();
  const isBn = locale === "bn";

  // Role check - CITIZEN and SECRETARY can access (SECRETARY as super admin)
  if (!user || !["CITIZEN", "SECRETARY"].includes(user.role)) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {isBn ? "সনদের আবেদন" : "Apply for Certificate"}
            </h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{isBn ? "অ্যাক্সেস অস্বীকৃত - নাগরিক বা সচিবের জন্য" : "Access Denied - Citizens or Secretary Only"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const labels = useMemo(
    () => ({
      title: isBn ? "সনদের আবেদন" : "Apply for Certificate",
      subtitle: isBn ? "যেকোনো ধরনের সনদের জন্য আবেদন করুন" : "Apply for any type of certificate",
      selectTemplate: isBn ? "সনদের ধরন নির্বাচন করুন" : "Select certificate type",
      selectPlaceholder: isBn ? "একটি সনদের ধরন বেছে নিন" : "Choose a certificate type",
      apply: isBn ? "আবেদন করুন" : "Apply",
      applying: isBn ? "আবেদন করা হচ্ছে..." : "Applying...",
      noTemplates: isBn ? "কোনো সনদের টেমপ্লেট পাওয়া যায়নি" : "No certificate templates available",
      loadFailed: isBn ? "টেমপ্লেট লোড করতে ব্যর্থ" : "Failed to load templates",
      applySuccess: isBn ? "সনদের আবেদন সফলভাবে জমা দেওয়া হয়েছে" : "Certificate application submitted successfully",
      applyFailed: isBn ? "আবেদন জমা দিতে ব্যর্থ" : "Failed to submit application",
      citizenRequired: isBn ? "সনদের আবেদন করতে আপনার নাগরিক প্রোফাইল থাকা প্রয়োজন" : "You need a citizen profile to apply for certificates",
    }),
    [isBn]
  );

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/certificate-templates?status=ACTIVE", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = data.message || labels.loadFailed;
        setError(message);
        toast.error(message);
        return;
      }

      setTemplates(data.templates || []);
    } catch {
      setError(labels.loadFailed);
      toast.error(labels.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [labels.loadFailed]);

  const handleApply = async () => {
    if (!selectedTemplate) return;
    if (!user?.citizenId) {
      setError(labels.citizenRequired);
      toast.error(labels.citizenRequired);
      return;
    }

    try {
      setApplying(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/certificates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          templateId: selectedTemplate,
          citizenId: user.citizenId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = data.message || labels.applyFailed;
        setError(message);
        toast.error(message);
        return;
      }

      setMessage(labels.applySuccess);
      toast.success(labels.applySuccess);
      setSelectedTemplate(""); // Reset selection
    } catch {
      setError(labels.applyFailed);
      toast.error(labels.applyFailed);
    } finally {
      setApplying(false);
    }
  };

  // Show message if user doesn't have citizen profile
  if (!loading && !user?.citizenId) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {labels.title}
            </h1>
            <p className="text-muted-foreground">{labels.subtitle}</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{labels.citizenRequired}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {labels.title}
          </h1>
          <p className="text-muted-foreground">{labels.subtitle}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{labels.selectTemplate}</CardTitle>
            <CardDescription>
              {isBn
                ? "প্রয়োজনীয় সনদের ধরন নির্বাচন করুন এবং আবেদন করুন"
                : "Select the type of certificate you need and submit your application"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {message}
              </div>
            )}

            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                {isBn ? "লোড হচ্ছে..." : "Loading..."}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {labels.noTemplates}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {labels.selectTemplate}
                  </label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder={labels.selectPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {isBn ? template.nameBn : template.nameEn}
                          {template.description && (
                            <span className="text-xs text-muted-foreground ml-2">
                              - {template.description}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleApply}
                  disabled={!selectedTemplate || applying}
                  className="w-full"
                >
                  {applying ? (
                    <>
                      <Plus className="mr-2 h-4 w-4 animate-spin" />
                      {labels.applying}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {labels.apply}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
