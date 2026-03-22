import { setRequestLocale } from "next-intl/server";
import { TemplatesContent } from "./templates-content";

interface CertificateTemplatesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CertificateTemplatesPage({
  params,
}: CertificateTemplatesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TemplatesContent locale={locale} />;
}

