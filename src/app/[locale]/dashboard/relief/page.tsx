import { setRequestLocale } from "next-intl/server";
import { ReliefContent } from "./relief-content";

interface ReliefPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ReliefPage({ params }: ReliefPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReliefContent locale={locale} />;
}

