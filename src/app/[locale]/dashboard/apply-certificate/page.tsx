import { setRequestLocale } from "next-intl/server";
import { ApplyCertificateContent } from "./apply-certificate-content";

interface ApplyCertificatePageProps {
  params: Promise<{ locale: string }>;
}

export default async function ApplyCertificatePage({ params }: ApplyCertificatePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ApplyCertificateContent locale={locale} />;
}