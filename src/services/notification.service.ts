import { connectDB } from "@/lib/mongodb";
import {
  Beneficiary,
  BeneficiaryStatus,
  Certificate,
  CertificateStatus,
  HoldingTax,
  PaymentStatus,
} from "@/models";

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
    await connectDB();

    const unpaidStatuses = [PaymentStatus.UNPAID, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE];

    const [taxUnpaidCount, pendingCertificateCount, pendingReliefCount, unpaidTaxes, pendingCertificates, pendingRelief] =
      await Promise.all([
        HoldingTax.countDocuments({ status: { $in: unpaidStatuses }, deletedAt: null }),
        Certificate.countDocuments({ status: CertificateStatus.SUBMITTED, deletedAt: null }),
        Beneficiary.countDocuments({
          status: BeneficiaryStatus.VERIFIED,
          isLocked: { $ne: true },
          deletedAt: null,
        }),
        HoldingTax.find({ status: { $in: unpaidStatuses }, deletedAt: null })
          .populate("citizen", "name nameBn")
          .select("citizen holdingInfo balance dueDate referenceNo")
          .sort({ dueDate: 1 })
          .limit(limitPerType)
          .lean(),
        Certificate.find({ status: CertificateStatus.SUBMITTED, deletedAt: null })
          .populate("citizen", "name nameBn")
          .select("referenceNo applicantName createdAt citizen")
          .sort({ createdAt: -1 })
          .limit(limitPerType)
          .lean(),
        Beneficiary.find({
          status: BeneficiaryStatus.VERIFIED,
          isLocked: { $ne: true },
          deletedAt: null,
        })
          .populate("citizen", "name nameBn")
          .populate("program", "name nameBn")
          .select("beneficiaryNo createdAt citizen program")
          .sort({ createdAt: -1 })
          .limit(limitPerType)
          .lean(),
      ]);

    const taxAlerts: NotificationAlertItem[] = unpaidTaxes.map((tax) => {
      const citizen = tax.citizen as unknown as { _id: { toString: () => string }; name?: string; nameBn?: string };
      const citizenName = citizen?.nameBn || citizen?.name || "Citizen";
      return {
        id: `tax-${tax._id.toString()}`,
        kind: "TAX_UNPAID",
        title: "Unpaid holding tax",
        message: `${citizenName} (${tax.holdingInfo.holdingNo}) due ৳${tax.balance}`,
        severity: "warning",
        createdAt: tax.dueDate ? new Date(tax.dueDate).toISOString() : new Date().toISOString(),
        link: `/dashboard/citizens/${citizen?._id?.toString?.() || ""}`,
      };
    });

    const certificateAlerts: NotificationAlertItem[] = pendingCertificates.map((certificate) => ({
      id: `cert-${certificate._id.toString()}`,
      kind: "PENDING_APPROVAL",
      title: "Certificate pending approval",
      message: `${certificate.applicantName} (${certificate.referenceNo})`,
      severity: "info",
      createdAt: new Date(certificate.createdAt).toISOString(),
      link: "/dashboard/certificates/approvals",
    }));

    const reliefAlerts: NotificationAlertItem[] = pendingRelief.map((item) => {
      const citizen = item.citizen as unknown as { name?: string; nameBn?: string };
      const program = item.program as unknown as { name?: string; nameBn?: string };
      const citizenName = citizen?.nameBn || citizen?.name || "Citizen";
      const programName = program?.nameBn || program?.name || "Relief program";
      return {
        id: `relief-${item._id.toString()}`,
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

