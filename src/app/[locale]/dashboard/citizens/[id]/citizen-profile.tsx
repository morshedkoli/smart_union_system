"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Pencil,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Wallet,
  BadgeCheck,
  ShieldAlert,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { TaxTab } from "./tax-tab";

interface Citizen {
  _id: string;
  registrationNo: string;
  nid?: string;
  birthCertificateNo?: string;
  name: string;
  nameBn: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  religion?: string;
  occupation?: string;
  mobile?: string;
  email?: string;
  photo?: string;
  presentAddress: {
    ward: number;
    village?: string;
    postOffice?: string;
    upazila?: string;
    district?: string;
  };
  permanentAddress: {
    ward: number;
    village?: string;
    postOffice?: string;
    upazila?: string;
    district?: string;
  };
  holdingNo?: string;
  status: string;
  isFreedomFighter: boolean;
  isDisabled: boolean;
  isWidow: boolean;
  createdAt: string;
  certificates?: Array<{
    _id: string;
    certificateNo: string;
    type: string;
    status: string;
    issueDate?: string;
  }>;
  holdingTaxes?: Array<{
    _id: string;
    referenceNo: string;
    fiscalYear: string;
    totalDue: number;
    totalPaid: number;
    status: string;
  }>;
}

interface CitizenProfileProps {
  locale: string;
  citizen: Citizen;
}

export function CitizenProfile({ locale, citizen }: CitizenProfileProps) {
  const t = useTranslations();
  const router = useRouter();
  const [serviceBlocked, setServiceBlocked] = useState(false);
  const [serviceBlockMessage, setServiceBlockMessage] = useState("");

  useEffect(() => {
    const checkServiceStatus = async () => {
      try {
        const res = await fetch("/api/holding-tax", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "check-service",
            citizenId: citizen._id,
          }),
        });
        const data = await res.json();
        if (data.success && data.hasUnpaidTax && !data.allowed) {
          setServiceBlocked(true);
          setServiceBlockMessage(data.message);
        } else {
          setServiceBlocked(false);
          setServiceBlockMessage("");
        }
      } catch {
        setServiceBlocked(false);
      }
    };

    checkServiceStatus();
  }, [citizen._id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">{t("common.active")}</Badge>;
      case "APPROVED":
        return <Badge variant="success">{t("common.approved")}</Badge>;
      case "PENDING":
        return <Badge variant="warning">{t("common.pending")}</Badge>;
      case "PAID":
        return <Badge variant="success">{locale === "bn" ? "পরিশোধিত" : "Paid"}</Badge>;
      case "UNPAID":
        return <Badge variant="destructive">{locale === "bn" ? "বকেয়া" : "Unpaid"}</Badge>;
      case "PARTIAL":
        return <Badge variant="warning">{locale === "bn" ? "আংশিক" : "Partial"}</Badge>;
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

  const getMaritalStatusLabel = (status: string) => {
    switch (status) {
      case "SINGLE":
        return locale === "bn" ? "অবিবাহিত" : "Single";
      case "MARRIED":
        return locale === "bn" ? "বিবাহিত" : "Married";
      case "DIVORCED":
        return locale === "bn" ? "তালাকপ্রাপ্ত" : "Divorced";
      case "WIDOWED":
        return locale === "bn" ? "বিধবা/বিপত্নীক" : "Widowed";
      default:
        return status;
    }
  };

  const getCertificateTypeLabel = (type: string) => {
    const types: Record<string, { en: string; bn: string }> = {
      BIRTH: { en: "Birth Certificate", bn: "জন্ম সনদ" },
      DEATH: { en: "Death Certificate", bn: "মৃত্যু সনদ" },
      CITIZENSHIP: { en: "Citizenship Certificate", bn: "নাগরিকত্ব সনদ" },
      CHARACTER: { en: "Character Certificate", bn: "চারিত্রিক সনদ" },
      TRADE_LICENSE: { en: "Trade License", bn: "ট্রেড লাইসেন্স" },
    };
    return types[type]?.[locale === "bn" ? "bn" : "en"] || type;
  };

  const formatAddress = (address: Citizen["presentAddress"]) => {
    const parts = [
      address.village,
      address.postOffice,
      address.upazila,
      address.district,
    ].filter(Boolean);
    return parts.join(", ") || `Ward ${address.ward}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {locale === "bn" ? "নাগরিক প্রোফাইল" : "Citizen Profile"}
              </h1>
              <p className="text-muted-foreground">{citizen.registrationNo}</p>
            </div>
          </div>
          <Button
            onClick={() =>
              router.push(`/${locale}/dashboard/citizens/${citizen._id}/edit`)
            }
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t("common.edit")}
          </Button>
        </div>

        {/* Profile Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={citizen.photo} alt={citizen.name} />
                <AvatarFallback className="text-2xl">
                  {citizen.nameBn.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-2xl font-bold">{citizen.nameBn}</h2>
                  <p className="text-muted-foreground">{citizen.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(citizen.status)}
                  {citizen.isFreedomFighter && (
                    <Badge variant="info">
                      {locale === "bn" ? "মুক্তিযোদ্ধা পরিবার" : "Freedom Fighter"}
                    </Badge>
                  )}
                  {citizen.isDisabled && (
                    <Badge variant="warning">
                      {locale === "bn" ? "প্রতিবন্ধী" : "Disabled"}
                    </Badge>
                  )}
                  {citizen.isWidow && (
                    <Badge variant="secondary">
                      {locale === "bn" ? "বিধবা" : "Widow"}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {citizen.mobile && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {citizen.mobile}
                    </span>
                  )}
                  {citizen.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {citizen.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {locale === "bn"
                      ? `ওয়ার্ড ${citizen.presentAddress.ward}`
                      : `Ward ${citizen.presentAddress.ward}`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        {serviceBlocked && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5" />
            <span>
              {serviceBlockMessage ||
                (locale === "bn"
                  ? "বকেয়া হোল্ডিং ট্যাক্সের কারণে সেবা ব্লক রয়েছে।"
                  : "Services are blocked due to unpaid holding tax.")}
            </span>
          </div>
        )}

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {locale === "bn" ? "তথ্য" : "Info"}
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {locale === "bn" ? "কর" : "Tax"}
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {locale === "bn" ? "সনদপত্র" : "Certificates"}
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {locale === "bn" ? "ব্যক্তিগত তথ্য" : "Personal Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow
                    label={locale === "bn" ? "NID" : "NID"}
                    value={citizen.nid || "—"}
                  />
                  <InfoRow
                    label={locale === "bn" ? "জন্ম নিবন্ধন" : "Birth Cert No"}
                    value={citizen.birthCertificateNo || "—"}
                  />
                  <InfoRow
                    label={locale === "bn" ? "পিতার নাম" : "Father's Name"}
                    value={citizen.fatherName}
                  />
                  <InfoRow
                    label={locale === "bn" ? "মাতার নাম" : "Mother's Name"}
                    value={citizen.motherName}
                  />
                  <InfoRow
                    label={locale === "bn" ? "জন্ম তারিখ" : "Date of Birth"}
                    value={formatDate(citizen.dateOfBirth, locale)}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  <InfoRow
                    label={locale === "bn" ? "লিঙ্গ" : "Gender"}
                    value={getGenderLabel(citizen.gender)}
                  />
                  <InfoRow
                    label={locale === "bn" ? "বৈবাহিক অবস্থা" : "Marital Status"}
                    value={getMaritalStatusLabel(citizen.maritalStatus)}
                  />
                  <InfoRow
                    label={locale === "bn" ? "ধর্ম" : "Religion"}
                    value={citizen.religion || "—"}
                  />
                  <InfoRow
                    label={locale === "bn" ? "পেশা" : "Occupation"}
                    value={citizen.occupation || "—"}
                  />
                  <InfoRow
                    label={locale === "bn" ? "হোল্ডিং নম্বর" : "Holding No"}
                    value={citizen.holdingNo || "—"}
                  />
                </CardContent>
              </Card>

              {/* Address Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {locale === "bn" ? "ঠিকানা" : "Address"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {locale === "bn" ? "বর্তমান ঠিকানা" : "Present Address"}
                    </p>
                    <p className="text-sm">{formatAddress(citizen.presentAddress)}</p>
                    <p className="text-sm text-muted-foreground">
                      {locale === "bn"
                        ? `ওয়ার্ড ${citizen.presentAddress.ward}`
                        : `Ward ${citizen.presentAddress.ward}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {locale === "bn" ? "স্থায়ী ঠিকানা" : "Permanent Address"}
                    </p>
                    <p className="text-sm">{formatAddress(citizen.permanentAddress)}</p>
                    <p className="text-sm text-muted-foreground">
                      {locale === "bn"
                        ? `ওয়ার্ড ${citizen.permanentAddress.ward}`
                        : `Ward ${citizen.permanentAddress.ward}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tax Tab */}
          <TabsContent value="tax">
            <TaxTab citizenId={citizen._id} locale={locale} />
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5" />
                  {locale === "bn" ? "সনদপত্র" : "Certificates"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {citizen.certificates && citizen.certificates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{locale === "bn" ? "সনদ নম্বর" : "Certificate No"}</TableHead>
                        <TableHead>{locale === "bn" ? "ধরন" : "Type"}</TableHead>
                        <TableHead>{locale === "bn" ? "ইস্যুর তারিখ" : "Issue Date"}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {citizen.certificates.map((cert) => (
                        <TableRow key={cert.certificateNo}>
                          <TableCell className="font-medium">{cert.certificateNo}</TableCell>
                          <TableCell>{getCertificateTypeLabel(cert.type)}</TableCell>
                          <TableCell>
                            {cert.issueDate ? formatDate(cert.issueDate, locale) : "—"}
                          </TableCell>
                          <TableCell>{getStatusBadge(cert.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {locale === "bn" ? "কোনো সনদপত্র নেই" : "No certificates found"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
