import { setRequestLocale } from "next-intl/server";
import { CitizensContent } from "./citizens-content";

interface CitizensPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CitizensPage({ params }: CitizensPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CitizensContent locale={locale} />;
}
