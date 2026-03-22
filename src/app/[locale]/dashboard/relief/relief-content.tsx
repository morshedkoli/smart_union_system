"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ReliefProgramItem {
  _id: string;
  name: string;
  nameEn?: string;
  nameBn: string;
  type: string;
  status: string;
}

interface CitizenItem {
  _id: string;
  name: string;
  nameBn: string;
}

interface BeneficiaryItem {
  _id: string;
  beneficiaryNo: string;
  status: string;
  isLocked?: boolean;
  citizen: {
    name?: string;
    nameBn?: string;
    presentAddress?: { ward?: number };
  };
  createdAt: string;
}

const reliefTypeOptions = [
  "FOOD",
  "CASH",
  "HOUSING",
  "MEDICAL",
  "EDUCATION",
  "AGRICULTURAL",
  "LIVELIHOOD",
  "DISASTER",
  "OTHER",
] as const;

const fundingOptions = [
  "GOVERNMENT",
  "NGO",
  "PRIVATE_DONATION",
  "FOREIGN_AID",
  "LOCAL_FUND",
  "MIXED",
] as const;

export function ReliefContent({ locale }: { locale: string }) {
  const [programs, setPrograms] = useState<ReliefProgramItem[]>([]);
  const [citizens, setCitizens] = useState<CitizenItem[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryItem[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedCitizenId, setSelectedCitizenId] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [type, setType] = useState("FOOD");
  const [fundingSource, setFundingSource] = useState("GOVERNMENT");
  const [targetBeneficiaries, setTargetBeneficiaries] = useState("50");
  const [budgetTotal, setBudgetTotal] = useState("100000");
  const [criteriaWard, setCriteriaWard] = useState("");
  const [criteriaMaxIncome, setCriteriaMaxIncome] = useState("");
  const [entitlement, setEntitlement] = useState("0");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [wardFilter, setWardFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const selectedProgram = useMemo(
    () => programs.find((p) => p._id === selectedProgramId),
    [programs, selectedProgramId]
  );

  const loadPrograms = useCallback(async () => {
    const res = await fetch("/api/relief-programs");
    const data = await res.json();
    if (data.success) {
      setPrograms(data.programs || []);
      if (!selectedProgramId && data.programs?.[0]?._id) {
        setSelectedProgramId(data.programs[0]._id);
      }
    }
  }, [selectedProgramId]);

  const loadCitizens = useCallback(async () => {
    const res = await fetch("/api/citizens?limit=200");
    const data = await res.json();
    if (data.success) {
      setCitizens(data.citizens || []);
    }
  }, []);

  const loadBeneficiaries = useCallback(async () => {
    if (!selectedProgramId) return;
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (wardFilter !== "ALL") params.set("ward", wardFilter);
    const res = await fetch(`/api/relief-programs/${selectedProgramId}/beneficiaries?${params}`);
    const data = await res.json();
    if (data.success) {
      setBeneficiaries(data.beneficiaries || []);
    }
  }, [query, selectedProgramId, statusFilter, wardFilter]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadPrograms(), loadCitizens()]);
    } finally {
      setLoading(false);
    }
  }, [loadCitizens, loadPrograms]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    loadBeneficiaries();
  }, [loadBeneficiaries]);

  const createProgram = async () => {
    setMessage("");
    const res = await fetch("/api/relief-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameEn,
        nameEn,
        nameBn,
        type,
        fundingSource,
        startDate: new Date().toISOString(),
        targetBeneficiaries: Number(targetBeneficiaries),
        budgetTotal: Number(budgetTotal),
      }),
    });
    const data = await res.json();
    setMessage(data.message);
    if (data.success) {
      setNameEn("");
      setNameBn("");
      await loadPrograms();
    }
  };

  const saveCriteria = async () => {
    if (!selectedProgramId) return;
    setMessage("");
    const criteria: { wards?: number[]; maxIncome?: number } = {};
    if (criteriaWard) criteria.wards = [Number(criteriaWard)];
    if (criteriaMaxIncome) criteria.maxIncome = Number(criteriaMaxIncome);

    const res = await fetch("/api/relief-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "criteria",
        programId: selectedProgramId,
        criteria,
      }),
    });
    const data = await res.json();
    setMessage(data.message);
    if (data.success) {
      await loadPrograms();
    }
  };

  const autoList = async () => {
    if (!selectedProgramId) return;
    setMessage("");
    const res = await fetch("/api/relief-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "auto-list",
        programId: selectedProgramId,
      }),
    });
    const data = await res.json();
    setMessage(
      data.success
        ? `${data.message} (${locale === "bn" ? "যোগ" : "added"}: ${data.added}, ${locale === "bn" ? "বাদ" : "skipped"}: ${data.skipped})`
        : data.message
    );
    if (data.success) {
      await loadBeneficiaries();
      await loadPrograms();
    }
  };

  const createBeneficiary = async () => {
    if (!selectedProgramId || !selectedCitizenId) return;
    setMessage("");
    const res = await fetch(`/api/relief-programs/${selectedProgramId}/beneficiaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citizenId: selectedCitizenId,
        totalEntitlement: Number(entitlement || 0),
      }),
    });
    const data = await res.json();
    setMessage(data.message);
    if (data.success) {
      setSelectedCitizenId("");
      setEntitlement("0");
      await loadBeneficiaries();
    }
  };

  const reviewBeneficiary = async (id: string, status: "VERIFIED" | "REJECTED") => {
    if (!selectedProgramId) return;
    setMessage("");
    const res = await fetch(`/api/relief-programs/${selectedProgramId}/beneficiaries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "review",
        status,
      }),
    });
    const data = await res.json();
    setMessage(data.message);
    if (data.success) {
      await loadBeneficiaries();
    }
  };

  const approveBeneficiary = async (id: string) => {
    if (!selectedProgramId) return;
    setMessage("");
    const res = await fetch(`/api/relief-programs/${selectedProgramId}/beneficiaries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const data = await res.json();
    setMessage(data.message);
    if (data.success) {
      await loadBeneficiaries();
    }
  };

  const statusBadge = (status: string) => {
    if (status === "APPROVED") return <Badge variant="success">APPROVED</Badge>;
    if (status === "VERIFIED") return <Badge variant="info">VERIFIED</Badge>;
    if (status === "REJECTED") return <Badge variant="destructive">REJECTED</Badge>;
    if (status === "PENDING") return <Badge variant="warning">PENDING</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {locale === "bn" ? "ত্রাণ ব্যবস্থাপনা" : "Relief Management"}
          </h1>
          <p className="text-muted-foreground">
            {locale === "bn"
              ? "Create → criteria → auto list → review → approve → lock"
              : "Create → criteria → auto list → review → approve → lock"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "নতুন ত্রাণ প্রোগ্রাম" : "Create Relief Program"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{locale === "bn" ? "নাম (EN)" : "Name (EN)"}</Label>
                <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "নাম (BN)" : "Name (BN)"}</Label>
                <Input value={nameBn} onChange={(e) => setNameBn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "ধরন" : "Type"}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {reliefTypeOptions.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "অর্থায়ন" : "Funding"}</Label>
                <Select value={fundingSource} onValueChange={setFundingSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fundingOptions.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "টার্গেট উপকারভোগী" : "Target Beneficiaries"}</Label>
                <Input type="number" value={targetBeneficiaries} onChange={(e) => setTargetBeneficiaries(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "মোট বাজেট" : "Total Budget"}</Label>
                <Input type="number" value={budgetTotal} onChange={(e) => setBudgetTotal(e.target.value)} />
              </div>
            </div>
            <Button onClick={createProgram}>{locale === "bn" ? "প্রোগ্রাম তৈরি" : "Create Program"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "ক্রাইটেরিয়া ও অটো লিস্ট" : "Criteria & Auto List"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>{locale === "bn" ? "প্রোগ্রাম" : "Program"}</Label>
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                  <SelectTrigger><SelectValue placeholder={locale === "bn" ? "প্রোগ্রাম নির্বাচন" : "Select program"} /></SelectTrigger>
                  <SelectContent>
                    {programs.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {locale === "bn" ? item.nameBn || item.name : item.nameEn || item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "ওয়ার্ড" : "Ward"}</Label>
                <Select value={criteriaWard || "ALL"} onValueChange={(v) => setCriteriaWard(v === "ALL" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={locale === "bn" ? "সব" : "All"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{locale === "bn" ? "সব" : "All"}</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => (
                      <SelectItem key={w} value={String(w)}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{locale === "bn" ? "সর্বোচ্চ আয়" : "Max Income"}</Label>
                <Input type="number" value={criteriaMaxIncome} onChange={(e) => setCriteriaMaxIncome(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={saveCriteria}>
                  {locale === "bn" ? "ক্রাইটেরিয়া সেভ" : "Save Criteria"}
                </Button>
                <Button onClick={autoList}>
                  {locale === "bn" ? "অটো লিস্ট" : "Auto List"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{locale === "bn" ? "ম্যানুয়াল যোগ" : "Manual Add (Duplicate Protected)"}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>{locale === "bn" ? "নাগরিক" : "Citizen"}</Label>
              <Select value={selectedCitizenId} onValueChange={setSelectedCitizenId}>
                <SelectTrigger><SelectValue placeholder={locale === "bn" ? "নাগরিক নির্বাচন" : "Select citizen"} /></SelectTrigger>
                <SelectContent>
                  {citizens.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {locale === "bn" ? c.nameBn || c.name : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{locale === "bn" ? "এন্টাইটেলমেন্ট" : "Entitlement"}</Label>
              <Input type="number" value={entitlement} onChange={(e) => setEntitlement(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={createBeneficiary}>{locale === "bn" ? "যোগ করুন" : "Add Beneficiary"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "bn" ? "উপকারভোগী তালিকা" : "Beneficiary Table"}
              {selectedProgram ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({locale === "bn" ? selectedProgram.nameBn || selectedProgram.name : selectedProgram.name})
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                placeholder={locale === "bn" ? "সার্চ: নাম/NID/বেনেফিসিয়ারি নং" : "Search by name/NID/beneficiary no"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="VERIFIED">VERIFIED</SelectItem>
                  <SelectItem value="APPROVED">APPROVED</SelectItem>
                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                </SelectContent>
              </Select>
              <Select value={wardFilter} onValueChange={setWardFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{locale === "bn" ? "সব ওয়ার্ড" : "All wards"}</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => (
                    <SelectItem key={w} value={String(w)}>{locale === "bn" ? `ওয়ার্ড ${w}` : `Ward ${w}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">{locale === "bn" ? "লোড হচ্ছে..." : "Loading..."}</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{locale === "bn" ? "বেনেফিসিয়ারি নং" : "Beneficiary No"}</TableHead>
                      <TableHead>{locale === "bn" ? "নাগরিক" : "Citizen"}</TableHead>
                      <TableHead>{locale === "bn" ? "ওয়ার্ড" : "Ward"}</TableHead>
                      <TableHead>{locale === "bn" ? "অবস্থা" : "Status"}</TableHead>
                      <TableHead>{locale === "bn" ? "লক" : "Lock"}</TableHead>
                      <TableHead className="text-right">{locale === "bn" ? "কার্যক্রম" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {beneficiaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          {locale === "bn" ? "কোনো রেকর্ড নেই" : "No records"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      beneficiaries.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell>{item.beneficiaryNo}</TableCell>
                          <TableCell>{item.citizen?.nameBn || item.citizen?.name || "—"}</TableCell>
                          <TableCell>{item.citizen?.presentAddress?.ward ?? "—"}</TableCell>
                          <TableCell>{statusBadge(item.status)}</TableCell>
                          <TableCell>
                            {item.isLocked ? <Badge variant="secondary">LOCKED</Badge> : <Badge variant="outline">OPEN</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!item.isLocked && item.status === "PENDING" ? (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => reviewBeneficiary(item._id, "VERIFIED")}>
                                    {locale === "bn" ? "রিভিউ OK" : "Review OK"}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => reviewBeneficiary(item._id, "REJECTED")}>
                                    {locale === "bn" ? "রিজেক্ট" : "Reject"}
                                  </Button>
                                </>
                              ) : null}
                              {!item.isLocked && item.status === "VERIFIED" ? (
                                <Button size="sm" onClick={() => approveBeneficiary(item._id)}>
                                  {locale === "bn" ? "অনুমোদন" : "Approve"}
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {message ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">{message}</div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

