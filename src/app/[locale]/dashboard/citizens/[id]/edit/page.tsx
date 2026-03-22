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

  const initialData = {
    _id: citizen._id.toString(),
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
    presentAddress: citizen.presentAddress,
    permanentAddress: citizen.permanentAddress,
    holdingNo: citizen.holdingNo || "",
    isFreedomFighter: citizen.isFreedomFighter,
    isDisabled: citizen.isDisabled,
    isWidow: citizen.isWidow,
  };

  return <CitizenForm locale={locale} initialData={initialData} isEdit />;
}
