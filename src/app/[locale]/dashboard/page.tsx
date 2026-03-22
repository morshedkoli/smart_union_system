import { setRequestLocale } from "next-intl/server";
import { DashboardContent } from "./dashboard-content";

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DashboardContent />;
}
