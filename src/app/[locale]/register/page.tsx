import { setRequestLocale } from "next-intl/server";
import { RegisterForm } from "./register-form";

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RegisterForm locale={locale} />;
}
