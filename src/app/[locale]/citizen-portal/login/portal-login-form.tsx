"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
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

export function CitizenPortalLoginForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [nid, setNid] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isBn = locale === "bn";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/citizen-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nid, dateOfBirth }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || (isBn ? "লগইন ব্যর্থ হয়েছে" : "Login failed"));
        return;
      }
      router.push(`/${locale}/citizen-portal`);
      router.refresh();
    } catch {
      setError(isBn ? "নেটওয়ার্ক সমস্যা হয়েছে" : "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-gray-900 dark:to-gray-950">
      <header className="flex justify-end gap-2 p-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {isBn ? "নাগরিক পোর্টাল" : "Citizen Portal"}
            </CardTitle>
            <CardDescription>
              {isBn
                ? "আপনার NID এবং জন্মতারিখ দিয়ে লগইন করুন"
                : "Login with your NID and date of birth"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error ? (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="nid">{isBn ? "NID নম্বর" : "NID Number"}</Label>
                <Input
                  id="nid"
                  inputMode="numeric"
                  placeholder={isBn ? "১০/১৩/১৭ সংখ্যার NID" : "10/13/17 digit NID"}
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">{isBn ? "জন্মতারিখ" : "Date of Birth"}</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isBn ? "লোড হচ্ছে..." : "Loading..."}
                  </>
                ) : isBn ? (
                  "লগইন"
                ) : (
                  "Login"
                )}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                <Link href={`/${locale}/login`} className="text-primary hover:underline font-medium">
                  {isBn ? "অফিস লগইন পেজে যান" : "Go to office login page"}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}

