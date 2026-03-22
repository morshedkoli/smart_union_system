import { setRequestLocale } from "next-intl/server";
import { CertificatesApplyContent } from "./certificates-apply-content";

interface CertificatesApplyPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CertificatesApplyPage({ params }: CertificatesApplyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CertificatesApplyContent locale={locale} />;
}
