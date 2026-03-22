import { setRequestLocale } from "next-intl/server";
import { FinanceContent } from "./finance-content";

interface FinancePageProps {
  params: Promise<{ locale: string }>;
}

export default async function FinancePage({ params }: FinancePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FinanceContent locale={locale} />;
}

