"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CitizenProfile {
  id: string;
  name: string;
  nameBn?: string;
  nid?: string;
  mobile?: string;
  dateOfBirth?: string;
}

interface PortalCertificate {
  id: string;
  referenceNo: string;
  certificateNo: string;
  type: string;
  status: string;
  issueDate?: string;
}

export function CitizenPortalHome({ locale }: { locale: string }) {
  const router = useRouter();
  const isBn = locale === "bn";

  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [certificates, setCertificates] = useState<PortalCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const certificateTypeLabel = useMemo(() => {
    const bnMap: Record<string, string> = {
      BIRTH: "জন্ম সনদ",
      DEATH: "মৃত্যু সনদ",
      CITIZENSHIP: "নাগরিকত্ব সনদ",
      CHARACTER: "চারিত্রিক সনদ",
      INHERITORSHIP: "উত্তরাধিকার সনদ",
      TRADE_LICENSE: "ট্রেড লাইসেন্স",
      NOC: "এনওসি",
      MARITAL_STATUS: "বৈবাহিক অবস্থা সনদ",
      INCOME: "আয় সনদ",
      RESIDENCE: "বাসিন্দা সনদ",
      FAMILY_MEMBER: "পারিবারিক সদস্য সনদ",
      LAND_POSSESSION: "জমি দখল সনদ",
    };
    return (type: string) => (isBn ? bnMap[type] || type : type.replaceAll("_", " "));
  }, [isBn]);

  useEffect(() => {
    const loadPortalData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [meRes, certRes] = await Promise.all([
          fetch("/api/citizen-portal/me", { credentials: "include" }),
          fetch("/api/citizen-portal/certificates", { credentials: "include" }),
        ]);

        const meData = await meRes.json();
        const certData = await certRes.json();

        if (meRes.status === 401 || certRes.status === 401) {
          router.push(`/${locale}/citizen-portal/login`);
          return;
        }
        if (!meData.success || !certData.success) {
          setError(
            (isBn ? "তথ্য লোড করা যায়নি" : "Failed to load portal data")
          );
          return;
        }

        setProfile(meData.data as CitizenProfile);
        setCertificates((certData.data || []) as PortalCertificate[]);
      } catch {
        setError(isBn ? "নেটওয়ার্ক সমস্যা হয়েছে" : "Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPortalData();
  }, [isBn, locale, router]);

  const handleLogout = async () => {
    await fetch("/api/citizen-portal/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push(`/${locale}/citizen-portal/login`);
    router.refresh();
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const response = await fetch(`/api/citizen-portal/certificates/${id}/download`, {
        credentials: "include",
      });
      if (response.status === 401) {
        router.push(`/${locale}/citizen-portal/login`);
        return;
      }
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        setError(
          err?.message || (isBn ? "ডাউনলোড করা যায়নি" : "Failed to download certificate")
        );
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `certificate-${id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(isBn ? "ডাউনলোড ব্যর্থ হয়েছে" : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{isBn ? "নাগরিক পোর্টাল" : "Citizen Portal"}</h1>
            <p className="text-xs text-muted-foreground">
              {isBn ? "সনদপত্র দেখুন এবং ডাউনলোড করুন" : "View and download your certificates"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {isBn ? "লগআউট" : "Logout"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:py-6">
        {isLoading ? (
          <div className="rounded-lg border bg-background p-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              {isBn ? "লোড হচ্ছে..." : "Loading..."}
            </p>
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{isBn ? "প্রোফাইল" : "Profile"}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">{isBn ? "নাম" : "Name"}</p>
                  <p className="font-medium">{isBn ? profile?.nameBn || profile?.name : profile?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NID</p>
                  <p className="font-medium">{profile?.nid || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{isBn ? "মোবাইল" : "Mobile"}</p>
                  <p className="font-medium">{profile?.mobile || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{isBn ? "জন্মতারিখ" : "Date of birth"}</p>
                  <p className="font-medium">
                    {profile?.dateOfBirth
                      ? new Date(profile.dateOfBirth).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {isBn ? "আমার সনদপত্র" : "My Certificates"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {certificates.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {isBn ? "কোনো অনুমোদিত সনদ পাওয়া যায়নি" : "No approved certificates found"}
                  </div>
                ) : (
                  certificates.map((certificate) => (
                    <div
                      key={certificate.id}
                      className="rounded-lg border bg-background p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <p className="truncate font-medium">
                            {certificateTypeLabel(certificate.type)}
                          </p>
                          <Badge variant="outline">{certificate.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Ref: {certificate.referenceNo} • No: {certificate.certificateNo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isBn ? "ইস্যুর তারিখ" : "Issue date"}:{" "}
                          {certificate.issueDate
                            ? new Date(certificate.issueDate).toLocaleDateString()
                            : "-"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(certificate.id)}
                        disabled={downloadingId === certificate.id}
                      >
                        {downloadingId === certificate.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isBn ? "ডাউনলোড হচ্ছে..." : "Downloading..."}
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            {isBn ? "ডাউনলোড" : "Download"}
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

