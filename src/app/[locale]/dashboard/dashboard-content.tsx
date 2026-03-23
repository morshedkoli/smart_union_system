"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  ListTodo,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Role = "SECRETARY" | "ENTREPRENEUR" | "CITIZEN";

interface DashboardSummary {
  role: Role;
  stats: {
    totalCitizens: number;
    totalCertificates: number;
    pendingRequests: number;
    revenueCollected: number;
    tasksToday: number;
    applicationsQueue: number;
    urgentAlerts: number;
    completedToday: number;
    myCertificates: number;
    pendingCertificates: number;
    myTaxRecords: number;
    totalTaxDue: number;
  };
  monthlyTrend: Array<{
    label: string;
    certificates: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    user: string;
    createdAt: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    count: number;
  }>;
  applications: Array<{
    id: string;
    type: string;
    applicant: string;
    status: string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    severity: "info" | "warning" | "destructive";
    createdAt: string;
  }>;
}

interface StatCard {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  hint: string;
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US").format(value);
}

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelativeTime(value: string, locale: string): string {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale === "bn" ? "bn" : "en", {
    numeric: "auto",
  });

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 1440],
    ["hour", 60],
    ["minute", 1],
  ];

  for (const [unit, amount] of ranges) {
    if (Math.abs(diffMinutes) >= amount || unit === "minute") {
      return rtf.format(Math.round(diffMinutes / amount), unit);
    }
  }

  return locale === "bn" ? "এইমাত্র" : "just now";
}

function priorityVariant(priority: "HIGH" | "MEDIUM" | "LOW"): "destructive" | "warning" | "outline" {
  if (priority === "HIGH") return "destructive";
  if (priority === "MEDIUM") return "warning";
  return "outline";
}

function statusVariant(
  status: string
): "success" | "warning" | "destructive" | "outline" {
  if (status === "APPROVED" || status === "ACTIVE" || status === "READ") return "success";
  if (status === "PENDING" || status === "VERIFIED") return "warning";
  if (status === "REJECTED" || status === "FLAGGED" || status === "OVERDUE") return "destructive";
  return "outline";
}

export function DashboardContent() {
  const t = useTranslations();
  const locale = useLocale();
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/dashboard", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok || !data.success) {
          setSummary(null);
          setError(data.message || "Failed to load dashboard");
          return;
        }

        setSummary(data.summary as DashboardSummary);
      } catch {
        if (!isMounted) {
          return;
        }
        setSummary(null);
        setError("Failed to load dashboard");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const role = summary?.role || user?.role || "ENTREPRENEUR";
  const stats = summary?.stats;
  const isSecretary = role === "SECRETARY";
  const isCitizen = role === "CITIZEN";

  const statCards: StatCard[] = isCitizen
    ? [
        {
          title: locale === "bn" ? "আমার সনদপত্র" : "My Certificates",
          value: formatNumber(stats?.myCertificates || 0, locale),
          icon: FileText,
          hint: locale === "bn" ? "মোট সনদ রেকর্ড" : "Total certificate records",
        },
        {
          title: locale === "bn" ? "অপেক্ষমাণ সনদ" : "Pending Certificates",
          value: formatNumber(stats?.pendingCertificates || 0, locale),
          icon: Clock,
          hint: locale === "bn" ? "অনুমোদনের অপেক্ষায়" : "Awaiting approval",
        },
        {
          title: locale === "bn" ? "আমার কর রেকর্ড" : "My Tax Records",
          value: formatNumber(stats?.myTaxRecords || 0, locale),
          icon: Wallet,
          hint: locale === "bn" ? "সক্রিয় কর এন্ট্রি" : "Active tax entries",
        },
        {
          title: locale === "bn" ? "মোট বকেয়া" : "Total Tax Due",
          value: formatCurrency(stats?.totalTaxDue || 0, locale),
          icon: AlertTriangle,
          hint: locale === "bn" ? "অপরিশোধিত পরিমাণ" : "Outstanding amount",
        },
      ]
    : isSecretary
      ? [
          {
            title: t("dashboard.totalCitizens"),
            value: formatNumber(stats?.totalCitizens || 0, locale),
            icon: Users,
            hint: locale === "bn" ? "ডাটাবেজের মোট নাগরিক" : "Total citizens in the database",
          },
          {
            title: t("dashboard.totalCertificates"),
            value: formatNumber(stats?.totalCertificates || 0, locale),
            icon: FileText,
            hint: locale === "bn" ? "সকল সনদ রেকর্ড" : "All certificate records",
          },
          {
            title: t("dashboard.pendingRequests"),
            value: formatNumber(stats?.pendingRequests || 0, locale),
            icon: Clock,
            hint: locale === "bn" ? "অনিষ্পন্ন আবেদন" : "Open requests awaiting action",
          },
          {
            title: t("dashboard.revenueCollected"),
            value: formatCurrency(stats?.revenueCollected || 0, locale),
            icon: Wallet,
            hint: locale === "bn" ? "অনুমোদিত আয়" : "Approved income collected",
          },
        ]
      : [
          {
            title: locale === "bn" ? "আজকের কাজ" : "Tasks Today",
            value: formatNumber(stats?.tasksToday || 0, locale),
            icon: ListTodo,
            hint: locale === "bn" ? "আজ তৈরি নতুন কাজ" : "New work created today",
          },
          {
            title: locale === "bn" ? "আবেদন কিউ" : "Applications Queue",
            value: formatNumber(stats?.applicationsQueue || 0, locale),
            icon: FileText,
            hint: locale === "bn" ? "অপেক্ষমাণ আবেদন" : "Open application queue",
          },
          {
            title: locale === "bn" ? "জরুরি সতর্কতা" : "Urgent Alerts",
            value: formatNumber(stats?.urgentAlerts || 0, locale),
            icon: AlertTriangle,
            hint: locale === "bn" ? "অমীমাংসিত সতর্কতা" : "Items needing attention",
          },
          {
            title: locale === "bn" ? "আজ সম্পন্ন" : "Completed Today",
            value: formatNumber(stats?.completedToday || 0, locale),
            icon: CheckCircle2,
            hint: locale === "bn" ? "আজ অনুমোদিত কাজ" : "Work completed today",
          },
        ];

  const trendMax = Math.max(
    1,
    ...(summary?.monthlyTrend || []).map((point) => point.certificates)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">
            {isCitizen
              ? locale === "bn"
                ? "আপনার সনদ, কর ও নোটিফিকেশন ডেটা সরাসরি ডাটাবেজ থেকে দেখানো হচ্ছে।"
                : "Your certificates, taxes, and notifications are shown directly from the database."
              : isSecretary
                ? locale === "bn"
                  ? "প্রশাসনিক সারাংশ এখন সরাসরি ডাটাবেজের লাইভ ডেটা থেকে লোড হচ্ছে।"
                  : "Administrative summary is now loaded from live database data."
                : locale === "bn"
                  ? "অপারেশন কিউ, আবেদন ও সতর্কতা এখন ডাটাবেজ থেকে দেখানো হচ্ছে।"
                  : "Operational queues, applications, and alerts are now shown from the database."}
          </p>
        </div>

        {error ? (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (locale === "bn" ? "লোড হচ্ছে..." : "Loading...") : stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isSecretary ? (
          <div className="grid gap-4 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {locale === "bn" ? "গত ৬ মাসের সনদ প্রবণতা" : "Certificate Trend, Last 6 Months"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid h-56 grid-cols-6 items-end gap-3">
                  {(summary?.monthlyTrend || []).map((point) => (
                    <div key={point.label} className="flex flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t bg-primary/80"
                        style={{
                          height: `${Math.max(10, (point.certificates / trendMax) * 180)}px`,
                        }}
                      />
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">{point.label.slice(5)}</p>
                        <p className="text-[10px] font-medium">
                          {formatNumber(point.certificates, locale)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {locale === "bn"
                    ? "প্রতি বার বর্তমান মাসে তৈরি সনদের সংখ্যা দেখায়।"
                    : "Each bar shows certificates created in that month."}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(summary?.recentActivity || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {locale === "bn" ? "কোনো সাম্প্রতিক কার্যক্রম নেই" : "No recent activity"}
                    </p>
                  ) : (
                    (summary?.recentActivity || []).map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.user}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.createdAt, locale)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  {isCitizen
                    ? locale === "bn"
                      ? "আমার সারাংশ"
                      : "My Summary"
                    : locale === "bn"
                      ? "কাজের তালিকা"
                      : "Task Queue"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(summary?.tasks || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {locale === "bn" ? "কোনো ডেটা নেই" : "No data available"}
                  </p>
                ) : (
                  (summary?.tasks || []).map((task) => (
                    <div key={task.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{task.title}</p>
                        <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {locale === "bn"
                          ? `${formatNumber(task.count, locale)} টি রেকর্ড`
                          : `${formatNumber(task.count, locale)} records`}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {isCitizen
                    ? locale === "bn"
                      ? "আমার আবেদনসমূহ"
                      : "My Applications"
                    : locale === "bn"
                      ? "সাম্প্রতিক আবেদন"
                      : "Recent Applications"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(summary?.applications || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {locale === "bn" ? "কোনো আবেদন নেই" : "No applications found"}
                  </p>
                ) : (
                  (summary?.applications || []).map((application) => (
                    <div
                      key={application.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{application.type}</p>
                        <p className="text-xs text-muted-foreground">{application.applicant}</p>
                      </div>
                      <Badge variant={statusVariant(application.status)}>
                        {application.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {locale === "bn" ? "নোটিফিকেশন ও সতর্কতা" : "Notifications & Alerts"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(summary?.alerts || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {locale === "bn" ? "কোনো সতর্কতা নেই" : "No alerts"}
                  </p>
                ) : (
                  (summary?.alerts || []).map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-md border border-destructive/10 bg-muted/40 p-3 text-sm"
                    >
                      <p className="font-medium">{alert.title}</p>
                      <p className="mt-1 text-muted-foreground">{alert.message}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {formatRelativeTime(alert.createdAt, locale)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
