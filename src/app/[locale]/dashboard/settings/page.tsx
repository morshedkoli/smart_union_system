import { setRequestLocale } from "next-intl/server";
import { SettingsContent } from "./settings-content";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SettingsContent locale={locale} />;
}

