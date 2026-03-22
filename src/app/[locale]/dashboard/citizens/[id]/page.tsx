import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CitizenService } from "@/services/citizen.service";
import { CitizenProfile } from "./citizen-profile";

interface CitizenPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function CitizenPage({ params }: CitizenPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const citizen = await CitizenService.getById(id);

  if (!citizen) {
    notFound();
  }

  return <CitizenProfile locale={locale} citizen={JSON.parse(JSON.stringify(citizen))} />;
}
