import { setRequestLocale } from "next-intl/server";
import { ForgotPasswordForm } from "./forgot-password-form";

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ForgotPasswordForm locale={locale} />;
}
