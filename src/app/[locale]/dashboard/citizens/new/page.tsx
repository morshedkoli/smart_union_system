import { setRequestLocale } from "next-intl/server";
import { CitizenForm } from "../citizen-form";

interface NewCitizenPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewCitizenPage({ params }: NewCitizenPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CitizenForm locale={locale} />;
}
