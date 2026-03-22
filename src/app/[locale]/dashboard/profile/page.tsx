import { setRequestLocale } from "next-intl/server";
import { ProfileContent } from "./profile-content";

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileContent locale={locale} />;
}
