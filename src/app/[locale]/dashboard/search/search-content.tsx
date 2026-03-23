"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SearchResults {
  citizens: Array<{
    _id: string;
    registrationNo: string;
    name: string;
    nameBn?: string;
    nid?: string;
    mobile?: string;
  }>;
  certificates: Array<{
    _id: string;
    referenceNo: string;
    certificateNo: string;
    applicantName: string;
    type: string;
    status: string;
    citizenId?: string;
  }>;
  references: Array<{
    source: "CERTIFICATE" | "HOLDING_TAX";
    referenceNo: string;
    label: string;
    id: string;
  }>;
}

const emptyResults: SearchResults = {
  citizens: [],
  certificates: [],
  references: [],
};

export function SearchContent({ locale }: { locale: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>(emptyResults);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      setResults(emptyResults);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=15&ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch();
    }, 250);
    return () => clearTimeout(timer);
  }, [runSearch]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {locale === "bn" ? "গ্লোবাল সার্চ" : "Global Search"}
          </h1>
          <p className="text-muted-foreground">
            {locale === "bn"
              ? "নাগরিক, সনদ, রেফারেন্স নাম্বার খুঁজুন"
              : "Search citizens, certificates, and reference numbers"}
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              locale === "bn"
                ? "নাম, NID, registration, certificate/ref no লিখুন..."
                : "Type name, NID, registration, certificate/ref no..."
            }
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{locale === "bn" ? "নাগরিক" : "Citizens"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">{locale === "bn" ? "খুঁজছে..." : "Searching..."}</p>
              ) : results.citizens.length === 0 ? (
                <p className="text-sm text-muted-foreground">{locale === "bn" ? "কোনো ফলাফল নেই" : "No results"}</p>
              ) : (
                results.citizens.map((citizen) => (
                  <Link
                    key={citizen._id}
                    href={`/${locale}/dashboard/citizens/${citizen._id}`}
                    className="block rounded-md border p-3 transition-colors hover:bg-accent"
                  >
                    <p className="font-medium">{citizen.nameBn || citizen.name}</p>
                    <p className="text-xs text-muted-foreground">{citizen.registrationNo}</p>
                    <p className="text-xs text-muted-foreground">{citizen.nid || citizen.mobile || "—"}</p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{locale === "bn" ? "সনদপত্র" : "Certificates"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">{locale === "bn" ? "খুঁজছে..." : "Searching..."}</p>
              ) : results.certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{locale === "bn" ? "কোনো ফলাফল নেই" : "No results"}</p>
              ) : (
                results.certificates.map((certificate) => (
                  <Link
                    key={certificate._id}
                    href={`/${locale}/dashboard/certificates`}
                    className="block rounded-md border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{certificate.certificateNo}</p>
                      <Badge
                        variant={
                          certificate.status === "APPROVED"
                            ? "success"
                            : certificate.status === "SUBMITTED"
                            ? "warning"
                            : "outline"
                        }
                      >
                        {certificate.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{certificate.referenceNo}</p>
                    <p className="text-xs text-muted-foreground">{certificate.applicantName}</p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{locale === "bn" ? "রেফারেন্স" : "Reference Numbers"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">{locale === "bn" ? "খুঁজছে..." : "Searching..."}</p>
              ) : results.references.length === 0 ? (
                <p className="text-sm text-muted-foreground">{locale === "bn" ? "কোনো ফলাফল নেই" : "No results"}</p>
              ) : (
                results.references.map((ref) => (
                  <div key={`${ref.source}-${ref.id}`} className="rounded-md border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-medium">{ref.referenceNo}</p>
                      <Badge variant={ref.source === "CERTIFICATE" ? "info" : "secondary"}>
                        {ref.source}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{ref.label}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

