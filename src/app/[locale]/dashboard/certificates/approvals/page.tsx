import { setRequestLocale } from "next-intl/server";
import { ApprovalsContent } from "./approvals-content";

interface CertificateApprovalsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CertificateApprovalsPage({
  params,
}: CertificateApprovalsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ApprovalsContent locale={locale} />;
}

