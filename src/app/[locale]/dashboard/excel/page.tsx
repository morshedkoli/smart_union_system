import { setRequestLocale } from "next-intl/server";
import { ExcelContent } from "./excel-content";

interface ExcelPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ExcelPage({ params }: ExcelPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ExcelContent locale={locale} />;
}

