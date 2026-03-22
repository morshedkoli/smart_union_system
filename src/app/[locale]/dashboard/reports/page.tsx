import { setRequestLocale } from "next-intl/server";
import { ReportsContent } from "./reports-content";

interface ReportsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReportsContent locale={locale} />;
}

