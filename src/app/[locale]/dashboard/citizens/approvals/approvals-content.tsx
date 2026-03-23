"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";

interface Citizen {
  id: string;
  registrationNo: string;
  name: string;
  nameBn: string;
  nid?: string;
  mobile?: string;
  gender: string;
  presentAddress: {
    ward: number;
    village?: string;
  };
  createdAt: string;
}

interface ApprovalsContentProps {
  locale: string;
}

export function ApprovalsContent({ locale }: ApprovalsContentProps) {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuth();

  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const isSecretary = user?.role === "SECRETARY";

  const fetchPendingCitizens = useCallback(async () => {
    if (!isSecretary) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "10");

      const res = await fetch(`/api/citizens/pending?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCitizens(data.citizens);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch pending citizens:", error);
      toast.error(locale === "bn" ? "তালিকা লোড করতে ব্যর্থ" : "Failed to load list");
    } finally {
      setLoading(false);
    }
  }, [page, isSecretary, locale]);

  useEffect(() => {
    fetchPendingCitizens();
  }, [fetchPendingCitizens]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/citizens/${id}/approve`, { method: "POST" });
      const data = await res.json();

      if (data.success) {
        toast.success(locale === "bn" ? "নাগরিক অনুমোদিত হয়েছে" : "Citizen approved");
        fetchPendingCitizens();
      } else {
        toast.error(data.message || "Failed to approve");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm(locale === "bn" ? "আপনি কি নিশ্চিত?" : "Are you sure?")) return;

    setProcessingId(id);
    try {
      const res = await fetch(`/api/citizens/${id}/reject`, { method: "POST" });
      const data = await res.json();

      if (data.success) {
        toast.success(locale === "bn" ? "নাগরিক বাতিল করা হয়েছে" : "Citizen rejected");
        fetchPendingCitizens();
      } else {
        toast.error(data.message || "Failed to reject");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case "MALE":
        return locale === "bn" ? "পুরুষ" : "Male";
      case "FEMALE":
        return locale === "bn" ? "মহিলা" : "Female";
      default:
        return locale === "bn" ? "অন্যান্য" : "Other";
    }
  };

  // Only SECRETARY can access
  if (!isSecretary) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {locale === "bn" ? "নাগরিক অনুমোদন" : "Citizen Approvals"}
            </h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>{locale === "bn" ? "অ্যাক্সেস অস্বীকৃত" : "Access Denied"}</p>
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/${locale}/dashboard/citizens`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {locale === "bn" ? "নাগরিক অনুমোদন" : "Citizen Approvals"}
              </h1>
              <p className="text-muted-foreground">
                {locale === "bn"
                  ? `${total}টি আবেদন অনুমোদনের অপেক্ষায়`
                  : `${total} applications pending approval`}
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "bn" ? "অপেক্ষমাণ আবেদন" : "Pending Applications"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : citizens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {locale === "bn"
                  ? "কোনো অপেক্ষমাণ আবেদন নেই"
                  : "No pending applications"}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{locale === "bn" ? "রেজিস্ট্রেশন নং" : "Reg. No"}</TableHead>
                      <TableHead>{locale === "bn" ? "নাম" : "Name"}</TableHead>
                      <TableHead>{locale === "bn" ? "NID" : "NID"}</TableHead>
                      <TableHead>{locale === "bn" ? "মোবাইল" : "Mobile"}</TableHead>
                      <TableHead>{locale === "bn" ? "ওয়ার্ড" : "Ward"}</TableHead>
                      <TableHead>{locale === "bn" ? "লিঙ্গ" : "Gender"}</TableHead>
                      <TableHead className="text-right">{locale === "bn" ? "কার্যক্রম" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {citizens.map((citizen) => (
                      <TableRow key={citizen.id}>
                        <TableCell className="font-medium">
                          {citizen.registrationNo}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{locale === "bn" ? citizen.nameBn : citizen.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {locale === "bn" ? citizen.name : citizen.nameBn}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{citizen.nid || "-"}</TableCell>
                        <TableCell>{citizen.mobile || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {locale === "bn" ? `ওয়ার্ড ${citizen.presentAddress.ward}` : `Ward ${citizen.presentAddress.ward}`}
                          </Badge>
                        </TableCell>
                        <TableCell>{getGenderLabel(citizen.gender)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/${locale}/dashboard/citizens/${citizen.id}`)}
                              title={locale === "bn" ? "বিস্তারিত" : "View Details"}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => handleApprove(citizen.id)}
                              disabled={processingId === citizen.id}
                              title={locale === "bn" ? "অনুমোদন" : "Approve"}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {processingId === citizen.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleReject(citizen.id)}
                              disabled={processingId === citizen.id}
                              title={locale === "bn" ? "বাতিল" : "Reject"}
                            >
                              {processingId === citizen.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      {locale === "bn"
                        ? `পৃষ্ঠা ${page} / ${totalPages}`
                        : `Page ${page} of ${totalPages}`}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
