"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  FileText,
  Clock,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
  Bell,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";

type ChangeType = "positive" | "negative";

interface StatItem {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change: string;
  changeType: ChangeType;
}

export function DashboardContent() {
  const t = useTranslations();
  const { user } = useAuth();
  const role = user?.role || "OPERATOR";
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

  const adminStats: StatItem[] = useMemo(
    () => [
      {
        title: t("dashboard.totalCitizens"),
        value: "12,543",
        icon: Users,
        change: "+12%",
        changeType: "positive",
      },
      {
        title: t("dashboard.totalCertificates"),
        value: "3,247",
        icon: FileText,
        change: "+8%",
        changeType: "positive",
      },
      {
        title: t("dashboard.pendingRequests"),
        value: "47",
        icon: Clock,
        change: "-5%",
        changeType: "negative",
      },
      {
        title: t("dashboard.revenueCollected"),
        value: "৳ 4,52,000",
        icon: Wallet,
        change: "+23%",
        changeType: "positive",
      },
    ],
    [t]
  );

  const operatorStats: StatItem[] = useMemo(
    () => [
      {
        title: localeText("tasksToday", "আজকের কাজ", "Tasks Today"),
        value: "14",
        icon: ListTodo,
        change: "+3",
        changeType: "positive",
      },
      {
        title: localeText("applicationsQueue", "আবেদন কিউ", "Applications Queue"),
        value: "22",
        icon: FileText,
        change: "-2",
        changeType: "negative",
      },
      {
        title: localeText("urgentAlerts", "জরুরি সতর্কতা", "Urgent Alerts"),
        value: "5",
        icon: AlertTriangle,
        change: "+1",
        changeType: "negative",
      },
      {
        title: localeText("completedToday", "আজ সম্পন্ন", "Completed Today"),
        value: "18",
        icon: CheckCircle2,
        change: "+6",
        changeType: "positive",
      },
    ],
    []
  );

  const stats = isAdmin ? adminStats : operatorStats;

  const recentActivity = [
    { action: "Birth certificate issued", user: "Mohammad Rahman", time: "2 minutes ago" },
    { action: "Trade license renewed", user: "Fatima Begum", time: "15 minutes ago" },
    { action: "Holding tax collected", user: "Abdul Karim", time: "1 hour ago" },
    { action: "Citizenship certificate approved", user: "Nasreen Akter", time: "2 hours ago" },
    { action: "New citizen registered", user: "Jamal Hossain", time: "3 hours ago" },
  ];

  const operatorTasks = [
    { title: "Verify submitted certificates", priority: "HIGH", due: "10:30 AM" },
    { title: "Update citizen records (Ward 5)", priority: "MEDIUM", due: "12:00 PM" },
    { title: "Review holding tax applications", priority: "MEDIUM", due: "2:30 PM" },
    { title: "Follow up rejected forms", priority: "LOW", due: "4:00 PM" },
  ];

  const operatorApplications = [
    { type: "Citizenship Certificate", applicant: "Rahim Uddin", status: "PENDING" },
    { type: "Birth Certificate", applicant: "Sadia Akter", status: "UNDER_REVIEW" },
    { type: "Holding Tax Update", applicant: "Karim Ali", status: "PENDING" },
    { type: "Trade License", applicant: "Nabila Rahman", status: "FLAGGED" },
  ];

  const operatorAlerts = [
    "3 applications missing attachments",
    "2 certificates nearing SLA deadline",
    "Ward 3 tax mismatch report pending review",
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? localeText("adminOverview", "অ্যাডমিন ওভারভিউ", "Administrative overview and controls")
              : localeText("operatorDesk", "অপারেটর ডেস্ক", "Daily operator workspace and tasks")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p
                  className={`text-xs ${
                    stat.changeType === "positive" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stat.change} {localeText("vsLastMonth", "গত মাসের তুলনায়", "vs last month")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isAdmin ? (
          <div className="grid gap-4 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {localeText("charts", "চার্টস", "Charts")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 items-end gap-2 h-56">
                  {[45, 60, 52, 70, 66, 74, 81, 77, 69, 88, 91, 95].map((v, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t bg-primary/80"
                        style={{ height: `${v * 1.6}px`, minHeight: "8px" }}
                      />
                      <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {localeText(
                    "monthlyTrend",
                    "মাসিক সনদ ও রাজস্ব ট্রেন্ড",
                    "Monthly certificate and revenue trend"
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.user}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  ))}
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
                  {localeText("tasks", "টাস্কস", "Tasks")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {operatorTasks.map((task, idx) => (
                  <div key={idx} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{task.title}</p>
                      <Badge variant={task.priority === "HIGH" ? "destructive" : task.priority === "MEDIUM" ? "warning" : "outline"}>
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{task.due}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {localeText("applications", "আবেদনসমূহ", "Applications")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {operatorApplications.map((app, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{app.type}</p>
                      <p className="text-xs text-muted-foreground">{app.applicant}</p>
                    </div>
                    <Badge variant={app.status === "FLAGGED" ? "destructive" : app.status === "UNDER_REVIEW" ? "warning" : "outline"}>
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {localeText("alerts", "এলার্টস", "Alerts")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {operatorAlerts.map((alert, idx) => (
                  <div key={idx} className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
                    {alert}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function localeText(_key: string, bn: string, en: string) {
  if (typeof window !== "undefined") {
    const maybeBn = window.location.pathname.startsWith("/bn/");
    return maybeBn ? bn : en;
  }
  return en;
}

