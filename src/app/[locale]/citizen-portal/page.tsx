import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { verifyToken } from "@/lib/auth";
import { CitizenPortalHome } from "./portal-home";

interface CitizenPortalPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CitizenPortalPage({ params }: CitizenPortalPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const token = cookieStore.get("citizen-auth-token")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload?.userId) {
    redirect(`/${locale}/citizen-portal/login`);
  }

  return <CitizenPortalHome locale={locale} />;
}

