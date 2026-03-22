import { setRequestLocale } from "next-intl/server";
import { CertificatesContent } from "./certificates-content";

interface CertificatesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CertificatesPage({ params }: CertificatesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CertificatesContent locale={locale} />;
}

