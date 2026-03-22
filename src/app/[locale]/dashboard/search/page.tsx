import { setRequestLocale } from "next-intl/server";
import { SearchContent } from "./search-content";

interface SearchPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SearchContent locale={locale} />;
}

