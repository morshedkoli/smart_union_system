import { prisma } from "@/lib/db";
import { CertificateStatus, BeneficiaryStatus, HoldingTaxPaymentStatus } from "@prisma/client";

export interface NotificationAlertItem {
  id: string;
  kind: "TAX_UNPAID" | "PENDING_APPROVAL";
  title: string;
  message: string;
  severity: "warning" | "info";
  createdAt: string;
  link: string;
}

export interface NotificationSummary {
  unreadCount: number;
  counts: {
    taxUnpaid: number;
    pendingCertificateApprovals: number;
    pendingReliefApprovals: number;
  };
  alerts: NotificationAlertItem[];
}

export class NotificationService {
  static async getAlerts(limitPerType = 5): Promise<NotificationSummary> {
    const unpaidStatuses: HoldingTaxPaymentStatus[] = ["UNPAID", "PARTIAL", "OVERDUE"];

    const [taxUnpaidCount, pendingCertificateCount, pendingReliefCount, unpaidTaxes, pendingCertificates, pendingRelief] =
      await Promise.all([
        prisma.holdingTax.count({
          where: { status: { in: unpaidStatuses }, deletedAt: null },
        }),
        prisma.certificate.count({
          where: { status: CertificateStatus.PENDING, deletedAt: null },
        }),
        prisma.beneficiary.count({
          where: {
            status: BeneficiaryStatus.VERIFIED,
            isLocked: { not: true },
            deletedAt: null,
          },
        }),
        prisma.holdingTax.findMany({
          where: { status: { in: unpaidStatuses }, deletedAt: null },
          include: {
            citizen: { select: { id: true, name: true, nameBn: true } },
          },
          orderBy: { dueDate: "asc" },
          take: limitPerType,
        }),
        prisma.certificate.findMany({
          where: { status: CertificateStatus.PENDING, deletedAt: null },
          include: {
            citizen: { select: { name: true, nameBn: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limitPerType,
        }),
        prisma.beneficiary.findMany({
          where: {
            status: BeneficiaryStatus.VERIFIED,
            isLocked: { not: true },
            deletedAt: null,
          },
          include: {
            citizen: { select: { name: true, nameBn: true } },
            program: { select: { name: true, nameBn: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limitPerType,
        }),
      ]);

    const taxAlerts: NotificationAlertItem[] = unpaidTaxes.map((tax) => {
      const citizenName = tax.citizen?.nameBn || tax.citizen?.name || "Citizen";
      return {
        id: `tax-${tax.id}`,
        kind: "TAX_UNPAID",
        title: "Unpaid holding tax",
        message: `${citizenName} (${tax.holdingInfo.holdingNo}) due ৳${tax.balance}`,
        severity: "warning",
        createdAt: tax.dueDate ? new Date(tax.dueDate).toISOString() : new Date().toISOString(),
        link: `/dashboard/citizens/${tax.citizen?.id || ""}`,
      };
    });

    const certificateAlerts: NotificationAlertItem[] = pendingCertificates.map((certificate) => ({
      id: `cert-${certificate.id}`,
      kind: "PENDING_APPROVAL",
      title: "Certificate pending approval",
      message: `${certificate.applicantName || certificate.citizen?.name || "Applicant"} (${certificate.referenceNo})`,
      severity: "info",
      createdAt: new Date(certificate.createdAt).toISOString(),
      link: "/dashboard/certificates/approvals",
    }));

    const reliefAlerts: NotificationAlertItem[] = pendingRelief.map((item) => {
      const citizenName = item.citizen?.nameBn || item.citizen?.name || "Citizen";
      const programName = item.program?.nameBn || item.program?.name || "Relief program";
      return {
        id: `relief-${item.id}`,
        kind: "PENDING_APPROVAL",
        title: "Relief pending approval",
        message: `${citizenName} - ${programName}`,
        severity: "info",
        createdAt: new Date(item.createdAt).toISOString(),
        link: "/dashboard/relief",
      };
    });

    const alerts = [...taxAlerts, ...certificateAlerts, ...reliefAlerts]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limitPerType * 3);

    return {
      unreadCount: taxUnpaidCount + pendingCertificateCount + pendingReliefCount,
      counts: {
        taxUnpaid: taxUnpaidCount,
        pendingCertificateApprovals: pendingCertificateCount,
        pendingReliefApprovals: pendingReliefCount,
      },
      alerts,
    };
  }
}
