"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

const ROLE_COLORS: Record<string, string> = {
  SECRETARY: "bg-red-500 hover:bg-red-600",
  ENTREPRENEUR: "bg-blue-500 hover:bg-blue-600",
  CITIZEN: "bg-green-500 hover:bg-green-600",
};

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Secretary",
  ENTREPRENEUR: "Entrepreneur",
  CITIZEN: "Citizen",
};

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [quickLogins, setQuickLogins] = useState<
    Array<{ role: string; name: string; email: string; password: string }>
  >([]);
  const [isQuickLoginLoading, setIsQuickLoginLoading] = useState(false);
  const isDev = process.env.NODE_ENV !== "production";

  // Pre-fill email from URL parameter
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Auto-load quick logins in dev mode
  useEffect(() => {
    if (isDev) {
      loadQuickLogins();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDev]);

  const loadQuickLogins = async () => {
    if (!isDev || quickLogins.length > 0 || isQuickLoginLoading) {
      return;
    }

    setIsQuickLoginLoading(true);
    try {
      const res = await fetch("/api/auth/dev-quick-login");
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setQuickLogins(data.accounts);
      }
    } finally {
      setIsQuickLoginLoading(false);
    }
  };

  const handleQuickLogin = async (account: { role: string; email: string; password: string }) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
    setIsLoading(true);
    setLoggingInAs(account.role);

    const result = await login({ email: account.email, password: account.password });
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
    setLoggingInAs(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login({ email, password });

    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="flex justify-end p-4 gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {t("common.appName")}
            </CardTitle>
            <CardDescription>
              {t("common.appDescription")}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              {/* Quick Login Buttons - One Click Login */}
              {isDev && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    {locale === "bn" ? "এক ক্লিকে লগইন" : "One-Click Login"}
                  </div>
                  {isQuickLoginLoading ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {quickLogins.map((account) => (
                        <Button
                          key={account.role}
                          type="button"
                          className={`h-auto py-2 px-2 text-white ${ROLE_COLORS[account.role] || "bg-gray-500 hover:bg-gray-600"}`}
                          onClick={() => handleQuickLogin(account)}
                          disabled={isLoading}
                        >
                          {loggingInAs === account.role ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <span className="text-xs font-medium truncate">
                              {ROLE_LABELS[account.role] || account.role}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isDev && quickLogins.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {locale === "bn" ? "অথবা ইমেইল দিয়ে" : "or with email"}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Link
                    href={`/${locale}/forgot-password`}
                    className="text-sm text-primary hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && !loggingInAs ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  t("auth.login")
                )}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/${locale}/register`}
                  className="text-primary hover:underline font-medium"
                >
                  {t("auth.register")}
                </Link>
              </p>
              <p className="text-xs text-center text-muted-foreground">
                <Link
                  href={`/${locale}/citizen-portal/login`}
                  className="text-primary hover:underline font-medium"
                >
                  {locale === "bn" ? "নাগরিক পোর্টালে লগইন করুন" : "Citizen portal login"}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Smart Union. All rights reserved.
      </footer>
    </div>
  );
}
