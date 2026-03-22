import { setRequestLocale } from "next-intl/server";
import { TaxesContent } from "./taxes-content";

interface TaxesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TaxesPage({ params }: TaxesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TaxesContent locale={locale} />;
}

