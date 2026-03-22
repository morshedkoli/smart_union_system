import { setRequestLocale } from "next-intl/server";
import { MyCertificatesContent } from "./my-certificates-content";

interface MyCertificatesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MyCertificatesPage({ params }: MyCertificatesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MyCertificatesContent locale={locale} />;
}