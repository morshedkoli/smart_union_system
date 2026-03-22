"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";

interface Citizen {
  _id: string;
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
  status: string;
  createdAt: string;
}

interface CitizensContentProps {
  locale: string;
}

export function CitizensContent({ locale }: CitizensContentProps) {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuth();

  // Role check - only SECRETARY and ENTREPRENEUR can access
  if (!user || !["SECRETARY", "ENTREPRENEUR"].includes(user.role)) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {locale === "bn" ? "নাগরিক ব্যবস্থাপনা" : "Citizens Management"}
            </h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>{locale === "bn" ? "অ্যাক্সেস অস্বীকৃত - অনুমোদিত ব্যবহারকারীদের জন্য" : "Access Denied - Authorized Users Only"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [wardFilter, setWardFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCitizens = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (wardFilter) params.set("ward", wardFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "10");

      const res = await fetch(`/api/citizens?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCitizens(data.citizens);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch citizens:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, wardFilter, statusFilter, page]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCitizens();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchCitizens]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this citizen?")) return;

    try {
      const res = await fetch(`/api/citizens/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchCitizens();
      }
    } catch (error) {
      console.error("Failed to delete citizen:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">{t("common.active")}</Badge>;
      case "INACTIVE":
        return <Badge variant="secondary">{t("common.inactive")}</Badge>;
      case "DECEASED":
        return <Badge variant="destructive">Deceased</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("navigation.citizens")}
            </h1>
            <p className="text-muted-foreground">
              {locale === "bn" ? "নাগরিকদের তথ্য পরিচালনা করুন" : "Manage citizen records"}
            </p>
          </div>
          <Button onClick={() => router.push(`/${locale}/dashboard/citizens/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            {locale === "bn" ? "নতুন নাগরিক" : "Add Citizen"}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {locale === "bn" ? "ফিল্টার ও অনুসন্ধান" : "Filter & Search"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={locale === "bn" ? "নাম, NID, মোবাইল দিয়ে অনুসন্ধান..." : "Search by name, NID, mobile..."}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={wardFilter}
                onValueChange={(value) => {
                  setWardFilter(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={locale === "bn" ? "ওয়ার্ড" : "Ward"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{locale === "bn" ? "সকল ওয়ার্ড" : "All Wards"}</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((ward) => (
                    <SelectItem key={ward} value={ward.toString()}>
                      {locale === "bn" ? `ওয়ার্ড ${ward}` : `Ward ${ward}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{locale === "bn" ? "সকল" : "All"}</SelectItem>
                  <SelectItem value="ACTIVE">{t("common.active")}</SelectItem>
                  <SelectItem value="INACTIVE">{t("common.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === "bn" ? "রেজিস্ট্রেশন নং" : "Reg. No"}</TableHead>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>NID</TableHead>
                    <TableHead>{locale === "bn" ? "মোবাইল" : "Mobile"}</TableHead>
                    <TableHead>{locale === "bn" ? "ওয়ার্ড" : "Ward"}</TableHead>
                    <TableHead>{locale === "bn" ? "লিঙ্গ" : "Gender"}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        {t("common.loading")}
                      </TableCell>
                    </TableRow>
                  ) : citizens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        {locale === "bn" ? "কোনো নাগরিক পাওয়া যায়নি" : "No citizens found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    citizens.map((citizen) => (
                      <TableRow key={citizen._id}>
                        <TableCell className="font-medium">
                          {citizen.registrationNo}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{citizen.nameBn}</div>
                            <div className="text-sm text-muted-foreground">
                              {citizen.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{citizen.nid || "—"}</TableCell>
                        <TableCell>{citizen.mobile || "—"}</TableCell>
                        <TableCell>
                          {locale === "bn"
                            ? `ওয়ার্ড ${citizen.presentAddress.ward}`
                            : `Ward ${citizen.presentAddress.ward}`}
                        </TableCell>
                        <TableCell>{getGenderLabel(citizen.gender)}</TableCell>
                        <TableCell>{getStatusBadge(citizen.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/${locale}/dashboard/citizens/${citizen._id}`)
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                {t("common.view")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/${locale}/dashboard/citizens/${citizen._id}/edit`)
                                }
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(citizen._id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {locale === "bn"
              ? `মোট ${total} জন নাগরিক`
              : `Total ${total} citizens`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {locale === "bn"
                ? `পৃষ্ঠা ${page} / ${totalPages}`
                : `Page ${page} of ${totalPages}`}
            </span>
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
      </div>
    </DashboardLayout>
  );
}
