import { setRequestLocale } from "next-intl/server";
import { ApprovalsContent } from "./approvals-content";

interface ApprovalsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ApprovalsPage({ params }: ApprovalsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ApprovalsContent locale={locale} />;
}
