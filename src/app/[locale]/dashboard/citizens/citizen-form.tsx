"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CitizenData {
  id?: string;
  _id?: string;
  nid?: string;
  birthCertificateNo?: string;
  name: string;
  nameEn?: string;
  nameBn: string;
  fatherName: string;
  fatherNameBn?: string;
  motherName: string;
  motherNameBn?: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus?: string;
  religion?: string;
  occupation?: string;
  mobile?: string;
  email?: string;
  presentAddress: {
    village?: string;
    ward: number;
    postOffice?: string;
    postCode?: string;
    upazila?: string;
    district?: string;
    fullAddress?: string;
  };
  permanentAddress: {
    village?: string;
    ward: number;
    postOffice?: string;
    postCode?: string;
    upazila?: string;
    district?: string;
    fullAddress?: string;
  };
  holdingNo?: string;
  isFreedomFighter?: boolean;
  isDisabled?: boolean;
  isWidow?: boolean;
}

interface CitizenFormProps {
  locale: string;
  initialData?: CitizenData;
  isEdit?: boolean;
}

const BANGLA_NAME_FIELDS = ["nameBn", "fatherNameBn", "motherNameBn"] as const;
const ENGLISH_NAME_FIELDS = ["name", "fatherName", "motherName"] as const;

type BanglaNameField = (typeof BANGLA_NAME_FIELDS)[number];
type EnglishNameField = (typeof ENGLISH_NAME_FIELDS)[number];
type ScriptValidatedField = BanglaNameField | EnglishNameField;

const BANGLA_NAME_PATTERN = /^[\u0980-\u09FF\s.'-]*$/;
const ENGLISH_NAME_PATTERN = /^[A-Za-z\s.'-]*$/;

const defaultData: CitizenData = {
  nid: "",
  birthCertificateNo: "",
  name: "",
  nameEn: "",
  nameBn: "",
  fatherName: "",
  fatherNameBn: "",
  motherName: "",
  motherNameBn: "",
  dateOfBirth: "",
  gender: "",
  maritalStatus: "SINGLE",
  religion: "",
  occupation: "",
  mobile: "",
  email: "",
  presentAddress: {
    village: "",
    ward: 1,
    postOffice: "",
    postCode: "",
    upazila: "",
    district: "",
    fullAddress: "",
  },
  permanentAddress: {
    village: "",
    ward: 1,
    postOffice: "",
    postCode: "",
    upazila: "",
    district: "",
    fullAddress: "",
  },
  holdingNo: "",
  isFreedomFighter: false,
  isDisabled: false,
  isWidow: false,
};

function isBanglaNameField(field: ScriptValidatedField): field is BanglaNameField {
  return (BANGLA_NAME_FIELDS as readonly string[]).includes(field);
}

function getScriptValidationMessage(locale: string, field: ScriptValidatedField): string {
  if (isBanglaNameField(field)) {
    return locale === "bn"
      ? "এই ঘরে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন"
      : "This field accepts Bangla characters only";
  }

  return locale === "bn"
    ? "এই ঘরে শুধুমাত্র ইংরেজি অক্ষর ব্যবহার করুন"
    : "This field accepts English characters only";
}

function getScriptValidationErrors(
  data: CitizenData,
  locale: string
): Partial<Record<ScriptValidatedField, string>> {
  const errors: Partial<Record<ScriptValidatedField, string>> = {};

  for (const field of BANGLA_NAME_FIELDS) {
    const value = data[field]?.trim() || "";
    if (value && !BANGLA_NAME_PATTERN.test(value)) {
      errors[field] = getScriptValidationMessage(locale, field);
    }
  }

  for (const field of ENGLISH_NAME_FIELDS) {
    const value = data[field]?.trim() || "";
    if (value && !ENGLISH_NAME_PATTERN.test(value)) {
      errors[field] = getScriptValidationMessage(locale, field);
    }
  }

  return errors;
}

export function CitizenForm({ locale, initialData, isEdit = false }: CitizenFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<CitizenData>(initialData || defaultData);
  const [sameAddress, setSameAddress] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ScriptValidatedField, string>>>(
    {}
  );

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleValidatedNameChange = (field: ScriptValidatedField, value: string) => {
    if (
      (isBanglaNameField(field) && !BANGLA_NAME_PATTERN.test(value)) ||
      (!isBanglaNameField(field) && !ENGLISH_NAME_PATTERN.test(value))
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: getScriptValidationMessage(locale, field),
      }));
      return;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    handleChange(field, value);
  };

  const handleAddressChange = (
    type: "presentAddress" | "permanentAddress",
    field: string,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const handleSameAddress = (checked: boolean) => {
    setSameAddress(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        permanentAddress: { ...prev.presentAddress },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = getScriptValidationErrors(formData, locale);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(
        locale === "bn"
          ? "বাংলা ও ইংরেজি নামের ঘরগুলো সঠিক ভাষায় পূরণ করুন"
          : "Please fill Bangla and English name fields in the correct language"
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const citizenId = formData.id || formData._id;
      const url = isEdit ? `/api/citizens/${citizenId}` : "/api/citizens";
      const method = isEdit ? "PUT" : "POST";

      // Clean up empty optional fields to avoid validation issues
      const cleanedData = {
        ...formData,
        nid: formData.nid?.trim() || undefined,
        birthCertificateNo: formData.birthCertificateNo?.trim() || undefined,
        nameEn: formData.nameEn?.trim() || undefined,
        fatherNameBn: formData.fatherNameBn?.trim() || undefined,
        motherNameBn: formData.motherNameBn?.trim() || undefined,
        mobile: formData.mobile?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        religion: formData.religion?.trim() || undefined,
        occupation: formData.occupation?.trim() || undefined,
        holdingNo: formData.holdingNo?.trim() || undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          isEdit
            ? locale === "bn" ? "নাগরিক সফলভাবে আপডেট হয়েছে" : "Citizen updated successfully"
            : locale === "bn" ? "নাগরিক সফলভাবে যোগ করা হয়েছে" : "Citizen added successfully"
        );
        router.push(`/${locale}/dashboard/citizens`);
        router.refresh();
      } else {
        toast.error(data.message || "Failed to save citizen");
        setError(data.message || "Failed to save citizen");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isEdit
                  ? locale === "bn"
                    ? "নাগরিক সম্পাদনা"
                    : "Edit Citizen"
                  : locale === "bn"
                  ? "নতুন নাগরিক নিবন্ধন"
                  : "New Citizen Registration"}
              </h1>
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t("common.save")}
          </Button>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "bn" ? "বাংলা তথ্য" : "Bangla Information"}
            </CardTitle>
            <CardDescription>
              {locale === "bn"
                ? "নাগরিকের বাংলা নাম সম্পর্কিত তথ্য"
                : "Bangla name information for the citizen"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nameBn">
                {locale === "bn" ? "নাম (বাংলায়)" : "Name (Bangla)"} *
              </Label>
              <Input
                id="nameBn"
                value={formData.nameBn}
                onChange={(e) => handleValidatedNameChange("nameBn", e.target.value)}
                required
              />
              {fieldErrors.nameBn && (
                <p className="text-sm text-destructive">{fieldErrors.nameBn}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatherNameBn">
                {locale === "bn" ? "পিতার নাম (বাংলায়)" : "Father's Name (Bangla)"} *
              </Label>
              <Input
                id="fatherNameBn"
                value={formData.fatherNameBn}
                onChange={(e) => handleValidatedNameChange("fatherNameBn", e.target.value)}
                required
              />
              {fieldErrors.fatherNameBn && (
                <p className="text-sm text-destructive">{fieldErrors.fatherNameBn}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="motherNameBn">
                {locale === "bn" ? "মাতার নাম (বাংলায়)" : "Mother's Name (Bangla)"} *
              </Label>
              <Input
                id="motherNameBn"
                value={formData.motherNameBn}
                onChange={(e) => handleValidatedNameChange("motherNameBn", e.target.value)}
                required
              />
              {fieldErrors.motherNameBn && (
                <p className="text-sm text-destructive">{fieldErrors.motherNameBn}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "bn" ? "ইংরেজি তথ্য" : "English Information"}
            </CardTitle>
            <CardDescription>
              {locale === "bn"
                ? "নাগরিকের ইংরেজি নাম সম্পর্কিত তথ্য"
                : "English name information for the citizen"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">
                {locale === "bn" ? "নাম (ইংরেজিতে)" : "Name (English)"} *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleValidatedNameChange("name", e.target.value)}
                required
              />
              {fieldErrors.name && (
                <p className="text-sm text-destructive">{fieldErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatherName">
                {locale === "bn" ? "পিতার নাম (ইংরেজিতে)" : "Father's Name (English)"} *
              </Label>
              <Input
                id="fatherName"
                value={formData.fatherName}
                onChange={(e) => handleValidatedNameChange("fatherName", e.target.value)}
                required
              />
              {fieldErrors.fatherName && (
                <p className="text-sm text-destructive">{fieldErrors.fatherName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="motherName">
                {locale === "bn" ? "মাতার নাম (ইংরেজিতে)" : "Mother's Name (English)"} *
              </Label>
              <Input
                id="motherName"
                value={formData.motherName}
                onChange={(e) => handleValidatedNameChange("motherName", e.target.value)}
                required
              />
              {fieldErrors.motherName && (
                <p className="text-sm text-destructive">{fieldErrors.motherName}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "bn" ? "ব্যক্তিগত তথ্য" : "Personal Information"}
            </CardTitle>
            <CardDescription>
              {locale === "bn" ? "নাগরিকের মৌলিক তথ্য" : "Basic citizen details"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nid">
                {locale === "bn" ? "জাতীয় পরিচয়পত্র নম্বর" : "NID Number"}
              </Label>
              <Input
                id="nid"
                value={formData.nid}
                onChange={(e) => handleChange("nid", e.target.value)}
                placeholder="1234567890123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthCertificateNo">
                {locale === "bn" ? "জন্ম নিবন্ধন নম্বর" : "Birth Certificate No"}
              </Label>
              <Input
                id="birthCertificateNo"
                value={formData.birthCertificateNo}
                onChange={(e) => handleChange("birthCertificateNo", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">
                {locale === "bn" ? "জন্ম তারিখ" : "Date of Birth"} *
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">
                {locale === "bn" ? "লিঙ্গ" : "Gender"} *
              </Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleChange("gender", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={locale === "bn" ? "নির্বাচন করুন" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">{locale === "bn" ? "পুরুষ" : "Male"}</SelectItem>
                  <SelectItem value="FEMALE">{locale === "bn" ? "মহিলা" : "Female"}</SelectItem>
                  <SelectItem value="OTHER">{locale === "bn" ? "অন্যান্য" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus">
                {locale === "bn" ? "বৈবাহিক অবস্থা" : "Marital Status"}
              </Label>
              <Select
                value={formData.maritalStatus}
                onValueChange={(value) => handleChange("maritalStatus", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">{locale === "bn" ? "অবিবাহিত" : "Single"}</SelectItem>
                  <SelectItem value="MARRIED">{locale === "bn" ? "বিবাহিত" : "Married"}</SelectItem>
                  <SelectItem value="DIVORCED">{locale === "bn" ? "তালাকপ্রাপ্ত" : "Divorced"}</SelectItem>
                  <SelectItem value="WIDOWED">{locale === "bn" ? "বিধবা/বিপত্নীক" : "Widowed"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion">
                {locale === "bn" ? "ধর্ম" : "Religion"}
              </Label>
              <Select
                value={formData.religion}
                onValueChange={(value) => handleChange("religion", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={locale === "bn" ? "নির্বাচন করুন" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Islam">{locale === "bn" ? "ইসলাম" : "Islam"}</SelectItem>
                  <SelectItem value="Hinduism">{locale === "bn" ? "হিন্দু" : "Hinduism"}</SelectItem>
                  <SelectItem value="Buddhism">{locale === "bn" ? "বৌদ্ধ" : "Buddhism"}</SelectItem>
                  <SelectItem value="Christianity">{locale === "bn" ? "খ্রিস্টান" : "Christianity"}</SelectItem>
                  <SelectItem value="Other">{locale === "bn" ? "অন্যান্য" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">
                {locale === "bn" ? "পেশা" : "Occupation"}
              </Label>
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) => handleChange("occupation", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">
                {locale === "bn" ? "মোবাইল নম্বর" : "Mobile Number"}
              </Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holdingNo">
                {locale === "bn" ? "হোল্ডিং নম্বর" : "Holding Number"}
              </Label>
              <Input
                id="holdingNo"
                value={formData.holdingNo}
                onChange={(e) => handleChange("holdingNo", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Present Address */}
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "bn" ? "বর্তমান ঠিকানা" : "Present Address"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="present-ward">
                {locale === "bn" ? "ওয়ার্ড নম্বর" : "Ward Number"} *
              </Label>
              <Select
                value={formData.presentAddress.ward.toString()}
                onValueChange={(value) =>
                  handleAddressChange("presentAddress", "ward", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((ward) => (
                    <SelectItem key={ward} value={ward.toString()}>
                      {locale === "bn" ? `ওয়ার্ড ${ward}` : `Ward ${ward}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="present-village">
                {locale === "bn" ? "গ্রাম/মহল্লা" : "Village/Area"}
              </Label>
              <Input
                id="present-village"
                value={formData.presentAddress.village}
                onChange={(e) =>
                  handleAddressChange("presentAddress", "village", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="present-postOffice">
                {locale === "bn" ? "ডাকঘর" : "Post Office"}
              </Label>
              <Input
                id="present-postOffice"
                value={formData.presentAddress.postOffice}
                onChange={(e) =>
                  handleAddressChange("presentAddress", "postOffice", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="present-upazila">
                {locale === "bn" ? "উপজেলা" : "Upazila"}
              </Label>
              <Input
                id="present-upazila"
                value={formData.presentAddress.upazila}
                onChange={(e) =>
                  handleAddressChange("presentAddress", "upazila", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="present-district">
                {locale === "bn" ? "জেলা" : "District"}
              </Label>
              <Input
                id="present-district"
                value={formData.presentAddress.district}
                onChange={(e) =>
                  handleAddressChange("presentAddress", "district", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Permanent Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {locale === "bn" ? "স্থায়ী ঠিকানা" : "Permanent Address"}
              </CardTitle>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sameAddress}
                  onChange={(e) => handleSameAddress(e.target.checked)}
                  className="rounded border-gray-300"
                />
                {locale === "bn" ? "বর্তমান ঠিকানার সাথে একই" : "Same as present address"}
              </label>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="permanent-ward">
                {locale === "bn" ? "ওয়ার্ড নম্বর" : "Ward Number"} *
              </Label>
              <Select
                value={formData.permanentAddress.ward.toString()}
                onValueChange={(value) =>
                  handleAddressChange("permanentAddress", "ward", parseInt(value))
                }
                disabled={sameAddress}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((ward) => (
                    <SelectItem key={ward} value={ward.toString()}>
                      {locale === "bn" ? `ওয়ার্ড ${ward}` : `Ward ${ward}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="permanent-village">
                {locale === "bn" ? "গ্রাম/মহল্লা" : "Village/Area"}
              </Label>
              <Input
                id="permanent-village"
                value={formData.permanentAddress.village}
                onChange={(e) =>
                  handleAddressChange("permanentAddress", "village", e.target.value)
                }
                disabled={sameAddress}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permanent-postOffice">
                {locale === "bn" ? "ডাকঘর" : "Post Office"}
              </Label>
              <Input
                id="permanent-postOffice"
                value={formData.permanentAddress.postOffice}
                onChange={(e) =>
                  handleAddressChange("permanentAddress", "postOffice", e.target.value)
                }
                disabled={sameAddress}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permanent-upazila">
                {locale === "bn" ? "উপজেলা" : "Upazila"}
              </Label>
              <Input
                id="permanent-upazila"
                value={formData.permanentAddress.upazila}
                onChange={(e) =>
                  handleAddressChange("permanentAddress", "upazila", e.target.value)
                }
                disabled={sameAddress}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permanent-district">
                {locale === "bn" ? "জেলা" : "District"}
              </Label>
              <Input
                id="permanent-district"
                value={formData.permanentAddress.district}
                onChange={(e) =>
                  handleAddressChange("permanentAddress", "district", e.target.value)
                }
                disabled={sameAddress}
              />
            </div>
          </CardContent>
        </Card>

        {/* Special Categories */}
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "bn" ? "বিশেষ শ্রেণি" : "Special Categories"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isFreedomFighter}
                  onChange={(e) => handleChange("isFreedomFighter", e.target.checked)}
                  className="rounded border-gray-300"
                />
                {locale === "bn" ? "মুক্তিযোদ্ধা পরিবার" : "Freedom Fighter Family"}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDisabled}
                  onChange={(e) => handleChange("isDisabled", e.target.checked)}
                  className="rounded border-gray-300"
                />
                {locale === "bn" ? "প্রতিবন্ধী" : "Disabled"}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isWidow}
                  onChange={(e) => handleChange("isWidow", e.target.checked)}
                  className="rounded border-gray-300"
                />
                {locale === "bn" ? "বিধবা" : "Widow"}
              </label>
            </div>
          </CardContent>
        </Card>
      </form>
    </DashboardLayout>
  );
}
