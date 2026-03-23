"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CertificateItem {
  id: string;
  referenceNo: string;
  certificateNo: string;
  applicantName: string;
  status: string;
  finalText: string;
  qrCode?: string;
  verificationUrl?: string;
}

export function ApprovalsContent({ locale }: { locale: string }) {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/certificates?status=PENDING");
      const data = await res.json();
      if (data.success) {
        setCertificates(
          (data.certificates || [])
            .map(
              (item: {
                id?: string;
                _id?: string;
                referenceNo?: string;
                certificateNo?: string | null;
                applicantName?: string | null;
                status?: string;
                finalText?: string | null;
                qrCode?: string | null;
                verificationUrl?: string | null;
              }) => {
                const id = item.id || item._id;
                if (!id) {
                  return null;
                }

                return {
                  id,
                  referenceNo: item.referenceNo || "",
                  certificateNo: item.certificateNo || "",
                  applicantName: item.applicantName || "",
                  status: item.status || "",
                  finalText: item.finalText || "",
                  qrCode: item.qrCode || undefined,
                  verificationUrl: item.verificationUrl || undefined,
                };
              }
            )
            .filter((item: CertificateItem | null): item is CertificateItem => item !== null)
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/certificates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
        return;
      }
      await loadPending();
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {locale === "bn" ? "সনদ অনুমোদন" : "Certificate Approval"}
          </h1>
          <p className="text-muted-foreground">
            {locale === "bn"
              ? "জমাকৃত সনদ অনুমোদন করুন, অনুমোদনের পর এটি লক হবে"
              : "Approve submitted certificates. Approved records are locked."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "অপেক্ষমাণ সনদ" : "Pending Certificates"}</CardTitle>
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
                      <TableHead>{locale === "bn" ? "অবস্থা" : "Status"}</TableHead>
                      <TableHead className="text-right">{locale === "bn" ? "কার্যক্রম" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.referenceNo}</TableCell>
                        <TableCell>{item.certificateNo || "—"}</TableCell>
                        <TableCell>{item.applicantName || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="warning">{item.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(item.id)}
                              disabled={approvingId === item.id}
                            >
                              {locale === "bn" ? "অনুমোদন" : "Approve"}
                            </Button>
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
      </div>
    </DashboardLayout>
  );
}

