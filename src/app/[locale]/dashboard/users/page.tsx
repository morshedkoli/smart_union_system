import { setRequestLocale } from "next-intl/server";
import { UsersContent } from "./users-content";

interface UsersPageProps {
  params: Promise<{ locale: string }>;
}

export default async function UsersPage({ params }: UsersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <UsersContent locale={locale} />;
}

