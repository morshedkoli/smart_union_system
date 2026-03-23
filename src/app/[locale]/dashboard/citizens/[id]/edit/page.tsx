import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CitizenService } from "@/services/citizen.service";
import { CitizenForm } from "../../citizen-form";

interface EditCitizenPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditCitizenPage({ params }: EditCitizenPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const citizen = await CitizenService.getById(id);

  if (!citizen) {
    notFound();
  }

  const presentAddress = (citizen.presentAddress || {}) as {
    village?: string | null;
    ward?: number | null;
    postOffice?: string | null;
    postCode?: string | null;
    upazila?: string | null;
    district?: string | null;
    fullAddress?: string | null;
  };

  const permanentAddress = (citizen.permanentAddress || {}) as {
    village?: string | null;
    ward?: number | null;
    postOffice?: string | null;
    postCode?: string | null;
    upazila?: string | null;
    district?: string | null;
    fullAddress?: string | null;
  };

  const initialData = {
    id: citizen.id,
    nid: citizen.nid || "",
    birthCertificateNo: citizen.birthCertificateNo || "",
    name: citizen.name,
    nameEn: citizen.nameEn || "",
    nameBn: citizen.nameBn,
    fatherName: citizen.fatherName,
    fatherNameBn: citizen.fatherNameBn || "",
    motherName: citizen.motherName,
    motherNameBn: citizen.motherNameBn || "",
    dateOfBirth: new Date(citizen.dateOfBirth).toISOString().split("T")[0],
    gender: citizen.gender,
    maritalStatus: citizen.maritalStatus,
    religion: citizen.religion || "",
    occupation: citizen.occupation || "",
    mobile: citizen.mobile || "",
    email: citizen.email || "",
    presentAddress: {
      village: presentAddress.village || "",
      ward: Number(presentAddress.ward || 1),
      postOffice: presentAddress.postOffice || "",
      postCode: presentAddress.postCode || "",
      upazila: presentAddress.upazila || "",
      district: presentAddress.district || "",
      fullAddress: presentAddress.fullAddress || "",
    },
    permanentAddress: {
      village: permanentAddress.village || "",
      ward: Number(permanentAddress.ward || 1),
      postOffice: permanentAddress.postOffice || "",
      postCode: permanentAddress.postCode || "",
      upazila: permanentAddress.upazila || "",
      district: permanentAddress.district || "",
      fullAddress: permanentAddress.fullAddress || "",
    },
    holdingNo: citizen.holdingNo || "",
    isFreedomFighter: Boolean(citizen.isFreedomFighter),
    isDisabled: Boolean(citizen.isDisabled),
    isWidow: Boolean(citizen.isWidow),
  };

  return <CitizenForm locale={locale} initialData={initialData} isEdit />;
}
