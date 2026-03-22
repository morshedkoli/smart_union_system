import { setRequestLocale } from "next-intl/server";
import { MyTaxesContent } from "./my-taxes-content";

interface MyTaxesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MyTaxesPage({ params }: MyTaxesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MyTaxesContent locale={locale} />;
}
