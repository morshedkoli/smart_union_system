import prisma from "@/lib/db";
import {
  BeneficiaryStatus,
  CertificateStatus,
  EntryStatus,
  HoldingTaxPaymentStatus,
  NotificationType,
  TransactionType,
  type Role,
} from "@prisma/client";

export interface DashboardStatValue {
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
}

export interface DashboardTrendPoint {
  label: string;
  certificates: number;
  revenue: number;
}

export interface DashboardActivityItem {
  id: string;
  action: string;
  user: string;
  createdAt: string;
}

export interface DashboardTaskItem {
  id: string;
  title: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  count: number;
}

export interface DashboardApplicationItem {
  id: string;
  type: string;
  applicant: string;
  status: string;
}

export interface DashboardAlertItem {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "destructive";
  createdAt: string;
}

export interface DashboardSummary {
  role: Role;
  stats: DashboardStatValue;
  monthlyTrend: DashboardTrendPoint[];
  recentActivity: DashboardActivityItem[];
  tasks: DashboardTaskItem[];
  applications: DashboardApplicationItem[];
  alerts: DashboardAlertItem[];
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function buildMonthBuckets(monthCount: number): DashboardTrendPoint[] {
  const now = new Date();
  const firstMonth = addMonths(startOfMonth(now), -(monthCount - 1));

  return Array.from({ length: monthCount }, (_, index) => {
    const date = addMonths(firstMonth, index);
    return {
      label: monthKey(date),
      certificates: 0,
      revenue: 0,
    };
  });
}

function toAlertSeverity(type: NotificationType): DashboardAlertItem["severity"] {
  if (type === NotificationType.ERROR) {
    return "destructive";
  }
  if (type === NotificationType.WARNING || type === NotificationType.ALERT) {
    return "warning";
  }
  return "info";
}

function formatActivityAction(description?: string | null, action?: string, entityType?: string): string {
  if (description?.trim()) {
    return description;
  }

  const normalizedAction = (action || "UPDATED").replace(/_/g, " ").toLowerCase();
  const normalizedEntity = (entityType || "record").replace(/_/g, " ").toLowerCase();
  return `${normalizedAction} ${normalizedEntity}`;
}

export class DashboardService {
  static async getSummary(userId: string): Promise<DashboardSummary | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        citizenId: true,
      },
    });

    if (!user) {
      return null;
    }

    if (user.role === "CITIZEN") {
      return this.getCitizenSummary(user.id, user.citizenId ?? null);
    }

    return this.getStaffSummary(user.id, user.role);
  }

  private static async getStaffSummary(
    userId: string,
    role: "SECRETARY" | "ENTREPRENEUR"
  ): Promise<DashboardSummary> {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const trendStart = addMonths(startOfMonth(today), -5);
    const overdueStatuses: HoldingTaxPaymentStatus[] = [
      HoldingTaxPaymentStatus.OVERDUE,
      HoldingTaxPaymentStatus.UNPAID,
      HoldingTaxPaymentStatus.PARTIAL,
    ];

    const [
      totalCitizens,
      totalCertificates,
      pendingCertificates,
      verifiedRelief,
      unreadNotifications,
      overdueTaxes,
      revenueAggregate,
      citizensToday,
      certificatesToday,
      approvedCertificatesToday,
      recentAuditLogs,
      pendingCertificateItems,
      reliefApplicationItems,
      notificationAlerts,
      overdueTaxItems,
      certificateTrendRows,
      revenueTrendRows,
    ] = await Promise.all([
      prisma.citizen.count({ where: { deletedAt: null } }),
      prisma.certificate.count({ where: { deletedAt: null } }),
      prisma.certificate.count({
        where: {
          status: CertificateStatus.PENDING,
          deletedAt: null,
        },
      }),
      prisma.beneficiary.count({
        where: {
          status: BeneficiaryStatus.VERIFIED,
          isLocked: { not: true },
          deletedAt: null,
        },
      }),
      prisma.notification.count({
        where: {
          recipientId: userId,
          recipientType: "user",
          isArchived: false,
          deletedAt: null,
          readAt: null,
        },
      }),
      prisma.holdingTax.count({
        where: {
          status: { in: overdueStatuses },
          deletedAt: null,
        },
      }),
      prisma.cashbook.aggregate({
        where: {
          transactionType: TransactionType.INCOME,
          status: EntryStatus.APPROVED,
          deletedAt: null,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.citizen.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          deletedAt: null,
        },
      }),
      prisma.certificate.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          deletedAt: null,
        },
      }),
      prisma.certificate.count({
        where: {
          status: CertificateStatus.APPROVED,
          approvedAt: { gte: todayStart, lte: todayEnd },
          deletedAt: null,
        },
      }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.certificate.findMany({
        where: {
          status: CertificateStatus.PENDING,
          deletedAt: null,
        },
        take: 4,
        orderBy: { createdAt: "desc" },
        include: {
          citizen: {
            select: {
              name: true,
              nameBn: true,
            },
          },
        },
      }),
      prisma.beneficiary.findMany({
        where: {
          status: BeneficiaryStatus.VERIFIED,
          isLocked: { not: true },
          deletedAt: null,
        },
        take: 4,
        orderBy: { createdAt: "desc" },
        include: {
          citizen: {
            select: {
              name: true,
              nameBn: true,
            },
          },
          program: {
            select: {
              name: true,
              nameBn: true,
            },
          },
        },
      }),
      prisma.notification.findMany({
        where: {
          recipientId: userId,
          recipientType: "user",
          isArchived: false,
          deletedAt: null,
          readAt: null,
        },
        take: 4,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          createdAt: true,
        },
      }),
      prisma.holdingTax.findMany({
        where: {
          status: { in: overdueStatuses },
          deletedAt: null,
        },
        take: 3,
        orderBy: { dueDate: "asc" },
        include: {
          citizen: {
            select: {
              name: true,
              nameBn: true,
            },
          },
        },
      }),
      prisma.certificate.findMany({
        where: {
          createdAt: { gte: trendStart },
          deletedAt: null,
        },
        select: {
          createdAt: true,
        },
      }),
      prisma.cashbook.findMany({
        where: {
          transactionDate: { gte: trendStart },
          transactionType: TransactionType.INCOME,
          status: EntryStatus.APPROVED,
          deletedAt: null,
        },
        select: {
          transactionDate: true,
          amount: true,
        },
      }),
    ]);

    const monthlyTrend = buildMonthBuckets(6);
    const trendMap = new Map(monthlyTrend.map((point) => [point.label, point]));

    for (const item of certificateTrendRows) {
      const bucket = trendMap.get(monthKey(item.createdAt));
      if (bucket) {
        bucket.certificates += 1;
      }
    }

    for (const item of revenueTrendRows) {
      const bucket = trendMap.get(monthKey(item.transactionDate));
      if (bucket) {
        bucket.revenue += item.amount;
      }
    }

    const recentActivity: DashboardActivityItem[] = recentAuditLogs.map((log) => ({
      id: log.id,
      action: formatActivityAction(log.description, log.action, log.entityType),
      user: log.user?.name || log.user?.email || "System",
      createdAt: log.createdAt.toISOString(),
    }));

    const tasks: DashboardTaskItem[] = [
      {
        id: "pending-certificates",
        title: "Pending certificate approvals",
        priority: pendingCertificates > 0 ? "HIGH" : "LOW",
        count: pendingCertificates,
      },
      {
        id: "verified-relief",
        title: "Verified relief applications",
        priority: verifiedRelief > 0 ? "MEDIUM" : "LOW",
        count: verifiedRelief,
      },
      {
        id: "overdue-taxes",
        title: "Overdue holding tax cases",
        priority: overdueTaxes > 0 ? "HIGH" : "LOW",
        count: overdueTaxes,
      },
      {
        id: "unread-notifications",
        title: "Unread notifications",
        priority: unreadNotifications > 0 ? "MEDIUM" : "LOW",
        count: unreadNotifications,
      },
    ];

    const applications: DashboardApplicationItem[] = [
      ...pendingCertificateItems.map((certificate) => ({
        id: `cert-${certificate.id}`,
        type: certificate.type.replace(/_/g, " "),
        applicant:
          certificate.applicantName ||
          certificate.citizen?.nameBn ||
          certificate.citizen?.name ||
          "Applicant",
        status: certificate.status,
        createdAt: certificate.createdAt.toISOString(),
      })),
      ...reliefApplicationItems.map((item) => ({
        id: `relief-${item.id}`,
        type: item.program?.nameBn || item.program?.name || "Relief program",
        applicant: item.citizen?.nameBn || item.citizen?.name || "Citizen",
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 4)
      .map(({ createdAt: _createdAt, ...application }) => application);

    const alerts: DashboardAlertItem[] = [
      ...notificationAlerts.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        severity: toAlertSeverity(notification.type),
        createdAt: notification.createdAt.toISOString(),
      })),
      ...overdueTaxItems.map((tax) => ({
        id: `tax-${tax.id}`,
        title: "Holding tax due",
        message: `${
          tax.citizen?.nameBn || tax.citizen?.name || "Citizen"
        } (${tax.holdingInfo.holdingNo}) has balance due ${tax.balance}`,
        severity: "warning" as const,
        createdAt: tax.dueDate.toISOString(),
      })),
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 4);

    return {
      role,
      stats: {
        totalCitizens,
        totalCertificates,
        pendingRequests: pendingCertificates + verifiedRelief,
        revenueCollected: revenueAggregate._sum.amount || 0,
        tasksToday: citizensToday + certificatesToday,
        applicationsQueue: pendingCertificates + verifiedRelief,
        urgentAlerts: unreadNotifications + overdueTaxes,
        completedToday: approvedCertificatesToday,
        myCertificates: 0,
        pendingCertificates: 0,
        myTaxRecords: 0,
        totalTaxDue: 0,
      },
      monthlyTrend,
      recentActivity,
      tasks,
      applications,
      alerts,
    };
  }

  private static async getCitizenSummary(
    userId: string,
    citizenId: string | null
  ): Promise<DashboardSummary> {
    if (!citizenId) {
      return {
        role: "CITIZEN",
        stats: {
          totalCitizens: 0,
          totalCertificates: 0,
          pendingRequests: 0,
          revenueCollected: 0,
          tasksToday: 0,
          applicationsQueue: 0,
          urgentAlerts: 0,
          completedToday: 0,
          myCertificates: 0,
          pendingCertificates: 0,
          myTaxRecords: 0,
          totalTaxDue: 0,
        },
        monthlyTrend: [],
        recentActivity: [],
        tasks: [],
        applications: [],
        alerts: [],
      };
    }

    const [
      myCertificates,
      pendingCertificates,
      myTaxRecords,
      taxRecords,
      certificateItems,
      notificationAlerts,
    ] = await Promise.all([
      prisma.certificate.count({
        where: {
          citizenId,
          deletedAt: null,
        },
      }),
      prisma.certificate.count({
        where: {
          citizenId,
          status: CertificateStatus.PENDING,
          deletedAt: null,
        },
      }),
      prisma.holdingTax.count({
        where: {
          citizenId,
          deletedAt: null,
        },
      }),
      prisma.holdingTax.findMany({
        where: {
          citizenId,
          deletedAt: null,
        },
        select: {
          balance: true,
          status: true,
          dueDate: true,
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.certificate.findMany({
        where: {
          citizenId,
          deletedAt: null,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          referenceNo: true,
          createdAt: true,
        },
      }),
      prisma.notification.findMany({
        where: {
          recipientId: userId,
          recipientType: "user",
          isArchived: false,
          deletedAt: null,
        },
        take: 4,
        orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          createdAt: true,
          readAt: true,
        },
      }),
    ]);

    const totalTaxDue = taxRecords.reduce(
      (sum, tax) => sum + Math.max(0, tax.balance || 0),
      0
    );
    const unpaidTaxStatuses: HoldingTaxPaymentStatus[] = [
      HoldingTaxPaymentStatus.UNPAID,
      HoldingTaxPaymentStatus.PARTIAL,
      HoldingTaxPaymentStatus.OVERDUE,
    ];
    const unpaidTaxes = taxRecords.filter((tax) =>
      unpaidTaxStatuses.includes(tax.status)
    ).length;

    const applications: DashboardApplicationItem[] = certificateItems.map((certificate) => ({
      id: certificate.id,
      type: certificate.type.replace(/_/g, " "),
      applicant: certificate.referenceNo,
      status: certificate.status,
    }));

    const alerts: DashboardAlertItem[] = notificationAlerts.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      severity: notification.readAt ? "info" : toAlertSeverity(notification.type),
      createdAt: notification.createdAt.toISOString(),
    }));

    const recentActivity: DashboardActivityItem[] = certificateItems.map((certificate) => ({
      id: certificate.id,
      action: `${certificate.type.replace(/_/g, " ")} application ${certificate.status.toLowerCase()}`,
      user: certificate.referenceNo,
      createdAt: certificate.createdAt.toISOString(),
    }));

    const tasks: DashboardTaskItem[] = [
      {
        id: "pending-certificates",
        title: "Pending certificate applications",
        priority: pendingCertificates > 0 ? "MEDIUM" : "LOW",
        count: pendingCertificates,
      },
      {
        id: "unpaid-taxes",
        title: "Unpaid tax records",
        priority: unpaidTaxes > 0 ? "HIGH" : "LOW",
        count: unpaidTaxes,
      },
      {
        id: "notifications",
        title: "Unread notifications",
        priority: alerts.some((alert) => alert.severity !== "info") ? "MEDIUM" : "LOW",
        count: notificationAlerts.filter((notification) => !notification.readAt).length,
      },
    ];

    return {
      role: "CITIZEN",
      stats: {
        totalCitizens: 0,
        totalCertificates: 0,
        pendingRequests: 0,
        revenueCollected: 0,
        tasksToday: 0,
        applicationsQueue: 0,
        urgentAlerts: alerts.filter((alert) => alert.severity !== "info").length,
        completedToday: 0,
        myCertificates,
        pendingCertificates,
        myTaxRecords,
        totalTaxDue,
      },
      monthlyTrend: [],
      recentActivity,
      tasks,
      applications,
      alerts,
    };
  }
}
