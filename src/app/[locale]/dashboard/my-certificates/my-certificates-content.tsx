"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Award, Calendar, Clock, Download, Eye, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";

interface Certificate {
  id: string;
  certificateNo: string;
  referenceNo: string;
  type: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "ISSUED";
  issuedAt?: string;
  finalText?: string;
  citizen: {
    name: string;
    email?: string;
  };
}

export function MyCertificatesContent({ locale }: { locale: string }) {
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
              <Award className="h-6 w-6" />
              {isBn ? "আমার সনদপত্র" : "My Certificates"}
            </h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{isBn ? "অ্যাক্সেস অস্বীকৃত - নাগরিক বা সচিবের জন্য" : "Access Denied - Citizens or Secretary Only"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = useMemo(
    () => ({
      title: isBn ? "আমার সনদপত্র" : "My Certificates",
      subtitle: isBn ? "আপনার সনদপত্রের তালিকা এবং অবস্থা" : "List of your certificates and their status",
      noCertificates: isBn ? "কোনো সনদপত্র পাওয়া যায়নি" : "No certificates found",
      loadFailed: isBn ? "সনদপত্র লোড করতে ব্যর্থ" : "Failed to load certificates",
      refresh: isBn ? "রিফ্রেশ" : "Refresh",
      view: isBn ? "দেখুন" : "View",
      download: isBn ? "ডাউনলোড" : "Download",
      certificateNo: isBn ? "সনদ নম্বর" : "Certificate No",
      referenceNo: isBn ? "রেফারেন্স নম্বর" : "Reference No",
      type: isBn ? "ধরন" : "Type",
      status: isBn ? "অবস্থা" : "Status",
      issuedDate: isBn ? "ইস্যুর তারিখ" : "Issued Date",
      applicantName: isBn ? "আবেদনকারীর নাম" : "Applicant Name",
    }),
    [isBn]
  );

  const statusLabels = useMemo(() => ({
    DRAFT: isBn ? "খসড়া" : "Draft",
    PENDING: isBn ? "অপেক্ষমান" : "Pending",
    APPROVED: isBn ? "অনুমোদিত" : "Approved",
    REJECTED: isBn ? "বাতিল" : "Rejected",
    ISSUED: isBn ? "ইস্যু করা হয়েছে" : "Issued",
  }), [isBn]);

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    REJECTED: "bg-red-100 text-red-800",
    ISSUED: "bg-green-100 text-green-800",
  };

  const loadCertificates = async () => {
    if (!user?.citizenId) {
      // If user is not linked to a citizen record, show empty state
      setCertificates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/citizens/${user.citizenId}/certificates`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || labels.loadFailed);
        return;
      }

      setCertificates(data.certificates || []);
    } catch {
      setError(labels.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, [user?.citizenId, labels.loadFailed]);

  const handleDownload = async (certificateId: string) => {
    try {
      const res = await fetch(`/api/certificates/${certificateId}/download`, {
        credentials: "include",
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certificateId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleView = (certificateId: string) => {
    window.open(`/api/certificates/${certificateId}/view`, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Award className="h-6 w-6" />
              {labels.title}
            </h1>
            <p className="text-muted-foreground">{labels.subtitle}</p>
          </div>
          <Button onClick={loadCertificates} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {labels.refresh}
          </Button>
        </div>

        {error && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && certificates.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{labels.noCertificates}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {certificates.length > 0 && (
          <div className="grid gap-6">
            {certificates.map((certificate) => (
              <Card key={certificate.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        {certificate.type}
                      </CardTitle>
                      <CardDescription>
                        {labels.certificateNo}: {certificate.certificateNo}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[certificate.status]}>
                      {statusLabels[certificate.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">{labels.referenceNo}:</span>
                        <span className="ml-1">{certificate.referenceNo}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{labels.applicantName}:</span>
                        <span className="ml-1">{certificate.citizen.name}</span>
                      </div>
                    </div>

                    {certificate.issuedAt && (
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{labels.issuedDate}:</span>
                          <span className="ml-1">
                            {new Date(certificate.issuedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {certificate.status === "ISSUED" && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleView(certificate.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {labels.view}
                      </Button>
                      <Button
                        onClick={() => handleDownload(certificate.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {labels.download}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}