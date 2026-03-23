"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { FileText, Plus, Send, Search, Users } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/auth-provider";

interface CertificateTemplate {
  id: string;
  name: string;
  nameEn: string;
  nameBn: string;
  certificateType: string;
  description?: string;
}

interface Citizen {
  id: string;
  name: string;
  nid: string;
  phone?: string;
  fatherName?: string;
  ward?: number;
}

export function CertificatesApplyContent({ locale }: { locale: string }) {
  const { user } = useAuth();
  const isBn = locale === "bn";

  // Role check - only SECRETARY and ENTREPRENEUR can access
  if (!user || !["SECRETARY", "ENTREPRENEUR"].includes(user.role)) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {isBn ? "সনদের আবেদন করুন" : "Apply for Certificate"}
            </h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{isBn ? "অ্যাক্সেস অস্বীকৃত - অনুমোদিত ব্যবহারকারীদের জন্য" : "Access Denied - Authorized Users Only"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [selectedCitizen, setSelectedCitizen] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingCitizens, setLoadingCitizens] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const labels = useMemo(
    () => ({
      title: isBn ? "সনদের আবেদন করুন" : "Apply for Certificate",
      subtitle: isBn ? "নাগরিকদের পক্ষ থেকে সনদের আবেদন" : "Apply for certificates on behalf of citizens",
      searchCitizen: isBn ? "নাগরিক অনুসন্ধান করুন" : "Search Citizen",
      searchPlaceholder: isBn ? "NID বা নাম দিয়ে অনুসন্ধান করুন" : "Search by NID or name",
      search: isBn ? "অনুসন্ধান" : "Search",
      selectCitizen: isBn ? "নাগরিক নির্বাচন করুন" : "Select Citizen",
      selectCitizenPlaceholder: isBn ? "একজন নাগরিক বেছে নিন" : "Choose a citizen",
      selectTemplate: isBn ? "সনদের ধরন নির্বাচন করুন" : "Select Certificate Type",
      selectPlaceholder: isBn ? "একটি সনদের ধরন বেছে নিন" : "Choose a certificate type",
      apply: isBn ? "আবেদন জমা দিন" : "Submit Application",
      applying: isBn ? "আবেদন করা হচ্ছে..." : "Applying...",
      noTemplates: isBn ? "কোনো সনদের টেমপ্লেট পাওয়া যায়নি" : "No certificate templates available",
      noCitizens: isBn ? "কোনো নাগরিক পাওয়া যায়নি" : "No citizens found",
      loadFailed: isBn ? "ডেটা লোড করতে ব্যর্থ" : "Failed to load data",
      applySuccess: isBn ? "সনদের আবেদন সফলভাবে জমা দেওয়া হয়েছে" : "Certificate application submitted successfully",
      applyFailed: isBn ? "আবেদন জমা দিতে ব্যর্থ" : "Failed to submit application",
      citizenDetails: isBn ? "নাগরিকের তথ্য" : "Citizen Details",
      name: isBn ? "নাম" : "Name",
      nid: isBn ? "NID" : "NID",
      phone: isBn ? "ফোন" : "Phone",
      fatherName: isBn ? "পিতার নাম" : "Father's Name",
      ward: isBn ? "ওয়ার্ড" : "Ward",
      step1: isBn ? "ধাপ ১: নাগরিক নির্বাচন" : "Step 1: Select Citizen",
      step2: isBn ? "ধাপ ২: সনদের ধরন নির্বাচন" : "Step 2: Select Certificate Type",
      step3: isBn ? "ধাপ ৩: আবেদন জমা দিন" : "Step 3: Submit Application",
    }),
    [isBn]
  );

  // Load certificate templates
  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await fetch("/api/certificate-templates?status=ACTIVE", {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTemplates(data.templates || []);
      } else {
        toast.error(data?.message || labels.loadFailed);
      }
    } catch {
      setError(labels.loadFailed);
      toast.error(labels.loadFailed);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Search citizens
  const searchCitizens = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoadingCitizens(true);
      setError("");

      const params = new URLSearchParams();
      params.set("search", searchQuery.trim());
      params.set("limit", "20");

      const res = await fetch(`/api/citizens?${params.toString()}`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = data.message || labels.loadFailed;
        setError(message);
        toast.error(message);
        return;
      }

      setCitizens(data.citizens || []);
      setSelectedCitizen(""); // Reset selection
    } catch {
      setError(labels.loadFailed);
      toast.error(labels.loadFailed);
    } finally {
      setLoadingCitizens(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Get selected citizen details
  const selectedCitizenDetails = useMemo(() => {
    return citizens.find((c) => c.id === selectedCitizen);
  }, [citizens, selectedCitizen]);

  const handleApply = async () => {
    if (!selectedTemplate || !selectedCitizen) return;

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
          citizenId: selectedCitizen,
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
      setSelectedTemplate("");
      setSelectedCitizen("");
      setCitizens([]);
      setSearchQuery("");
    } catch {
      setError(labels.applyFailed);
      toast.error(labels.applyFailed);
    } finally {
      setApplying(false);
    }
  };

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

        {/* Step 1: Search and Select Citizen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {labels.step1}
            </CardTitle>
            <CardDescription>
              {isBn
                ? "যে নাগরিকের জন্য সনদের আবেদন করতে চান তাকে অনুসন্ধান করুন"
                : "Search for the citizen you want to apply certificate for"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder={labels.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchCitizens()}
                />
              </div>
              <Button onClick={searchCitizens} disabled={loadingCitizens || !searchQuery.trim()}>
                <Search className="mr-2 h-4 w-4" />
                {labels.search}
              </Button>
            </div>

            {citizens.length > 0 && (
              <div className="space-y-2">
                <Label>{labels.selectCitizen}</Label>
                <Select value={selectedCitizen} onValueChange={setSelectedCitizen}>
                  <SelectTrigger>
                    <SelectValue placeholder={labels.selectCitizenPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {citizens.map((citizen) => (
                      <SelectItem key={citizen.id} value={citizen.id}>
                        {citizen.name} - {citizen.nid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {loadingCitizens && (
              <div className="text-center py-2 text-muted-foreground">
                {isBn ? "অনুসন্ধান করা হচ্ছে..." : "Searching..."}
              </div>
            )}

            {/* Selected Citizen Details */}
            {selectedCitizenDetails && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="font-medium mb-2">{labels.citizenDetails}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{labels.name}:</span>
                    <span className="ml-2">{selectedCitizenDetails.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{labels.nid}:</span>
                    <span className="ml-2">{selectedCitizenDetails.nid}</span>
                  </div>
                  {selectedCitizenDetails.phone && (
                    <div>
                      <span className="text-muted-foreground">{labels.phone}:</span>
                      <span className="ml-2">{selectedCitizenDetails.phone}</span>
                    </div>
                  )}
                  {selectedCitizenDetails.fatherName && (
                    <div>
                      <span className="text-muted-foreground">{labels.fatherName}:</span>
                      <span className="ml-2">{selectedCitizenDetails.fatherName}</span>
                    </div>
                  )}
                  {selectedCitizenDetails.ward && (
                    <div>
                      <span className="text-muted-foreground">{labels.ward}:</span>
                      <span className="ml-2">{selectedCitizenDetails.ward}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Select Certificate Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {labels.step2}
            </CardTitle>
            <CardDescription>
              {isBn
                ? "প্রয়োজনীয় সনদের ধরন নির্বাচন করুন"
                : "Select the type of certificate needed"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTemplates ? (
              <div className="text-center py-4 text-muted-foreground">
                {isBn ? "লোড হচ্ছে..." : "Loading..."}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {labels.noTemplates}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{labels.selectTemplate}</Label>
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
            )}
          </CardContent>
        </Card>

        {/* Step 3: Submit Application */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {labels.step3}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleApply}
              disabled={!selectedTemplate || !selectedCitizen || applying}
              className="w-full"
              size="lg"
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
