import { setRequestLocale } from "next-intl/server";
import { CitizenPortalLoginForm } from "./portal-login-form";

interface CitizenPortalLoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CitizenPortalLoginPage({
  params,
}: CitizenPortalLoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CitizenPortalLoginForm locale={locale} />;
}

