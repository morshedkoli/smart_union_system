import { prisma, type PrismaTransactionClient } from "@/lib/db";
import {
  generateHoldingTaxReferenceNo,
  generateReceiptNo,
  isValidObjectId,
  getCurrentFiscalYear,
} from "@/lib/prisma-utils";
import {
  calculateHoldingTaxBalance,
  determinePaymentStatus,
} from "@/lib/prisma-virtuals";
import { deepSanitize } from "@/lib/sanitize";
import type {
  HoldingTax,
  Citizen,
  HoldingTaxPaymentStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";

// Re-export enum values for backward compatibility
export {
  HoldingTaxPaymentStatus as PaymentStatus,
  HoldingType,
  BuildingType,
  PaymentMethod,
} from "@prisma/client";

export interface HoldingTaxCreateData {
  citizenId: string;
  holdingInfo: {
    holdingNo: string;
    mouza?: string;
    jlNo?: string;
    daagNo?: string;
    khatianNo?: string;
    plotNo?: string;
    ward: number;
    area: number;
    areaUnit?: string;
    holdingType: string;
    buildingType?: string;
    floors?: number;
    rooms?: number;
    yearBuilt?: number;
  };
  fiscalYear: string;
  assessment: {
    assessedValue: number;
    taxRate: number;
    annualTax: number;
  };
  arrears?: number;
  rebate?: number;
  penalty?: number;
  dueDate: Date;
}

export interface PaymentData {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  bankName?: string;
  chequeNo?: string;
  notes?: string;
}

// Interface for HoldingTax with related Citizen
export interface HoldingTaxWithCitizen extends HoldingTax {
  citizen?: {
    id: string;
    name: string;
    nameBn: string;
    nid?: string | null;
    mobile?: string | null;
  };
}

const SYSTEM_COLLECTOR_ID = "000000000000000000000001";

function getCollectorId(collectedBy?: string): string {
  if (collectedBy && isValidObjectId(collectedBy)) {
    return collectedBy;
  }
  return SYSTEM_COLLECTOR_ID;
}

async function logAudit(
  tx: PrismaTransactionClient,
  data: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    description?: string;
    severity?: string;
    changes?: object;
  }
): Promise<void> {
  try {
    if (isValidObjectId(data.userId)) {
      await tx.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          entityName: data.entityName,
          description: data.description,
          severity: data.severity || "LOW",
          changes: data.changes,
        },
      });
    }
  } catch {
    console.error("Failed to create audit log");
  }
}

async function logAuditStandalone(data: {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  description?: string;
  severity?: string;
  changes?: object;
}): Promise<void> {
  try {
    if (data.userId && isValidObjectId(data.userId)) {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          entityName: data.entityName,
          description: data.description,
          severity: data.severity || "LOW",
          changes: data.changes,
        },
      });
    }
  } catch {
    console.error("Failed to create audit log");
  }
}

export class HoldingTaxService {
  static async getByCitizenId(citizenId: string): Promise<HoldingTax[]> {
    if (!isValidObjectId(citizenId)) {
      return [];
    }

    const taxes = await prisma.holdingTax.findMany({
      where: {
        citizenId,
        deletedAt: null,
      },
      orderBy: { fiscalYear: "desc" },
    });

    return taxes;
  }

  // Alias for backward compatibility
  static async getBycitizenId(citizenId: string): Promise<HoldingTax[]> {
    return this.getByCitizenId(citizenId);
  }

  static async getById(id: string): Promise<HoldingTaxWithCitizen | null> {
    if (!isValidObjectId(id)) {
      return null;
    }

    const tax = await prisma.holdingTax.findUnique({
      where: { id },
      include: {
        citizen: {
          select: {
            id: true,
            name: true,
            nameBn: true,
            nid: true,
            mobile: true,
          },
        },
      },
    });

    return tax;
  }

  static async create(
    data: HoldingTaxCreateData,
    createdBy?: string
  ): Promise<{ success: boolean; tax?: HoldingTax; message: string }> {
    // Sanitize input
    const sanitizedData = deepSanitize(data);

    return prisma
      .$transaction(async (tx) => {
        // Check for existing tax for same holding and fiscal year
        const existing = await tx.holdingTax.findFirst({
          where: {
            citizenId: sanitizedData.citizenId,
            holdingInfo: {
              is: {
                holdingNo: sanitizedData.holdingInfo.holdingNo,
              },
            },
            fiscalYear: sanitizedData.fiscalYear,
            deletedAt: null,
          },
        });

        if (existing) {
          throw new Error("Tax already exists for this holding and fiscal year");
        }

        // Generate reference number
        const referenceNo = await generateHoldingTaxReferenceNo(
          tx,
          sanitizedData.fiscalYear,
          sanitizedData.holdingInfo.ward
        );

        // Calculate totals
        const arrears = sanitizedData.arrears || 0;
        const rebate = sanitizedData.rebate || 0;
        const penalty = sanitizedData.penalty || 0;
        const { totalDue, balance } = calculateHoldingTaxBalance(
          sanitizedData.assessment.annualTax,
          arrears,
          penalty,
          rebate,
          0 // totalPaid starts at 0
        );

        const tax = await tx.holdingTax.create({
          data: {
            referenceNo,
            citizenId: sanitizedData.citizenId,
            holdingInfo: {
              holdingNo: sanitizedData.holdingInfo.holdingNo,
              mouza: sanitizedData.holdingInfo.mouza,
              jlNo: sanitizedData.holdingInfo.jlNo,
              daagNo: sanitizedData.holdingInfo.daagNo,
              khatianNo: sanitizedData.holdingInfo.khatianNo,
              plotNo: sanitizedData.holdingInfo.plotNo,
              ward: sanitizedData.holdingInfo.ward,
              area: sanitizedData.holdingInfo.area,
              areaUnit: sanitizedData.holdingInfo.areaUnit || "decimal",
              holdingType: sanitizedData.holdingInfo.holdingType,
              buildingType: sanitizedData.holdingInfo.buildingType,
              floors: sanitizedData.holdingInfo.floors,
              rooms: sanitizedData.holdingInfo.rooms,
              yearBuilt: sanitizedData.holdingInfo.yearBuilt,
            },
            fiscalYear: sanitizedData.fiscalYear,
            assessment: {
              assessedValue: sanitizedData.assessment.assessedValue,
              taxRate: sanitizedData.assessment.taxRate,
              annualTax: sanitizedData.assessment.annualTax,
              assessmentDate: new Date(),
              assessedById: createdBy,
            },
            arrears,
            rebate,
            penalty,
            totalDue,
            totalPaid: 0,
            balance,
            dueDate: sanitizedData.dueDate,
            status: "UNPAID",
            payments: [],
            createdById: createdBy,
          },
        });

        // Log audit
        if (createdBy) {
          await logAudit(tx, {
            userId: createdBy,
            action: "CREATE",
            entityType: "HOLDING_TAX",
            entityId: tax.id,
            description: `Holding tax created: ${referenceNo} for holding ${sanitizedData.holdingInfo.holdingNo}`,
            severity: "LOW",
          });
        }

        return {
          success: true,
          tax,
          message: "Holding tax created successfully",
        };
      })
      .catch((error) => {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to create holding tax",
        };
      });
  }

  static async addPayment(
    taxId: string,
    payment: PaymentData,
    collectedBy: string
  ): Promise<{ success: boolean; tax?: HoldingTax; receiptNo: string; message: string }> {
    if (!isValidObjectId(taxId)) {
      return { success: false, receiptNo: "", message: "Invalid tax ID" };
    }

    // Sanitize payment data
    const sanitizedPayment = deepSanitize(payment);

    return prisma
      .$transaction(async (tx) => {
        const tax = await tx.holdingTax.findUnique({
          where: { id: taxId },
        });

        if (!tax) {
          throw new Error("Tax record not found");
        }

        if (tax.balance <= 0) {
          throw new Error("Tax already fully paid");
        }

        if (sanitizedPayment.amount > tax.balance) {
          throw new Error("Payment amount exceeds balance");
        }

        // Generate receipt number
        const receiptNo = await generateReceiptNo(tx, tax.fiscalYear);

        const now = new Date();
        const newPayment = {
          receiptNo,
          amount: sanitizedPayment.amount,
          paymentDate: now,
          paymentMethod: sanitizedPayment.paymentMethod,
          transactionId: sanitizedPayment.transactionId,
          bankName: sanitizedPayment.bankName,
          chequeNo: sanitizedPayment.chequeNo,
          collectedById: getCollectorId(collectedBy),
          notes: sanitizedPayment.notes,
          createdAt: now,
          updatedAt: now,
        };

        const newTotalPaid = tax.totalPaid + sanitizedPayment.amount;
        const newBalance = tax.totalDue - newTotalPaid;
        const newStatus = determinePaymentStatus(newBalance, newTotalPaid, tax.dueDate);

        await tx.holdingTax.updateMany({
          where: { id: taxId },
          data: {
            payments: {
              push: newPayment,
            },
            totalPaid: newTotalPaid,
            balance: newBalance,
            lastPaymentDate: now,
            status: newStatus,
          },
        });

        const updatedTax = await tx.holdingTax.findUnique({
          where: { id: taxId },
        });

        if (!updatedTax) {
          throw new Error("Tax record not found after update");
        }

        // Log audit
        await logAudit(tx, {
          userId: getCollectorId(collectedBy),
          action: "PAYMENT",
          entityType: "HOLDING_TAX",
          entityId: tax.id,
          description: `Payment received: ৳${sanitizedPayment.amount} for tax ${tax.referenceNo}. Receipt: ${receiptNo}`,
          severity: "LOW",
        });

        return {
          success: true,
          tax: updatedTax,
          receiptNo,
          message: "Payment recorded successfully",
        };
      })
      .catch((error) => {
        return {
          success: false,
          receiptNo: "",
          message: error instanceof Error ? error.message : "Failed to add payment",
        };
      });
  }

  static async markAsPaid(
    taxId: string,
    paymentMethod: PaymentMethod,
    collectedBy?: string,
    notes?: string
  ): Promise<{ success: boolean; tax?: HoldingTax; receiptNo: string; message: string }> {
    if (!isValidObjectId(taxId)) {
      return { success: false, receiptNo: "", message: "Invalid tax ID" };
    }

    const tax = await prisma.holdingTax.findUnique({
      where: { id: taxId },
    });

    if (!tax) {
      return { success: false, receiptNo: "", message: "Tax record not found" };
    }

    if (tax.balance <= 0) {
      return { success: false, receiptNo: "", message: "Tax already fully paid" };
    }

    return this.addPayment(
      taxId,
      {
        amount: tax.balance,
        paymentMethod,
        notes,
      },
      collectedBy || SYSTEM_COLLECTOR_ID
    );
  }

  static async checkUnpaidTax(
    citizenId: string
  ): Promise<{ hasUnpaid: boolean; unpaidTaxes: HoldingTax[]; totalDue: number }> {
    if (!isValidObjectId(citizenId)) {
      return { hasUnpaid: false, unpaidTaxes: [], totalDue: 0 };
    }

    const unpaidTaxes = await prisma.holdingTax.findMany({
      where: {
        citizenId,
        status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
        deletedAt: null,
      },
    });

    const totalDue = unpaidTaxes.reduce((sum, tax) => sum + tax.balance, 0);

    return {
      hasUnpaid: unpaidTaxes.length > 0,
      unpaidTaxes,
      totalDue,
    };
  }

  static async getOverdueTaxes(wardNo?: number): Promise<HoldingTaxWithCitizen[]> {
    const now = new Date();

    // Build filter for updating overdue records
    const baseWhere: Prisma.HoldingTaxWhereInput = {
      dueDate: { lt: now },
      status: { in: ["UNPAID", "PARTIAL"] },
      deletedAt: null,
    };

    // Update overdue status
    // For nested field filtering, we need to use raw query for ward filtering during update
    if (wardNo) {
      // Use $runCommandRaw for updating with nested field condition
      await prisma.$runCommandRaw({
        update: "holding_taxes",
        updates: [
          {
            q: {
              dueDate: { $lt: now },
              status: { $in: ["UNPAID", "PARTIAL"] },
              deletedAt: null,
              "holdingInfo.ward": wardNo,
            },
            u: { $set: { status: "OVERDUE" } },
            multi: true,
          },
        ],
      });
    } else {
      await prisma.holdingTax.updateMany({
        where: baseWhere,
        data: { status: "OVERDUE" },
      });
    }

    // Fetch overdue taxes with citizen info
    let overdueTaxes: HoldingTaxWithCitizen[];

    if (wardNo) {
      // Use aggregation for nested field filtering
      const result = (await prisma.$runCommandRaw({
        aggregate: "holding_taxes",
        pipeline: [
          {
            $match: {
              status: "OVERDUE",
              deletedAt: null,
              "holdingInfo.ward": wardNo,
            },
          },
          { $sort: { dueDate: 1 } },
          {
            $lookup: {
              from: "citizens",
              localField: "citizenId",
              foreignField: "_id",
              as: "citizenData",
            },
          },
          { $unwind: { path: "$citizenData", preserveNullAndEmptyArrays: true } },
        ],
        cursor: {},
      })) as unknown as {
        cursor: {
          firstBatch: Array<HoldingTax & { citizenData?: Citizen }>;
        };
      };

      overdueTaxes = (result.cursor?.firstBatch || []).map((doc) => ({
        ...doc,
        id: (doc as unknown as { _id: { $oid: string } })._id.$oid || String((doc as unknown as { _id: unknown })._id),
        citizen: doc.citizenData
          ? {
              id: String((doc.citizenData as unknown as { _id: unknown })._id),
              name: doc.citizenData.name,
              nameBn: doc.citizenData.nameBn,
              nid: doc.citizenData.nid,
              mobile: doc.citizenData.mobile,
            }
          : undefined,
      }));
    } else {
      overdueTaxes = await prisma.holdingTax.findMany({
        where: {
          status: "OVERDUE",
          deletedAt: null,
        },
        orderBy: { dueDate: "asc" },
        include: {
          citizen: {
            select: {
              id: true,
              name: true,
              nameBn: true,
              nid: true,
              mobile: true,
            },
          },
        },
      });
    }

    return overdueTaxes;
  }

  static async getPaymentHistory(
    taxId: string
  ): Promise<{ payments: HoldingTax["payments"]; tax: HoldingTaxWithCitizen | null }> {
    if (!isValidObjectId(taxId)) {
      return { payments: [], tax: null };
    }

    const tax = await prisma.holdingTax.findUnique({
      where: { id: taxId },
      include: {
        citizen: {
          select: {
            id: true,
            name: true,
            nameBn: true,
            nid: true,
            mobile: true,
          },
        },
      },
    });

    if (!tax) {
      return { payments: [], tax: null };
    }

    // For collectedBy user info, we'd need to fetch users separately if needed
    // The payments array contains collectedById which can be used to look up users

    return {
      payments: tax.payments,
      tax,
    };
  }

  static async getStats(fiscalYear?: string): Promise<{
    totalAssessed: number;
    totalCollected: number;
    totalPending: number;
    collectionRate: number;
    byWard: Array<{ ward: number; assessed: number; collected: number }>;
  }> {
    const matchStage = fiscalYear
      ? { deletedAt: null, fiscalYear }
      : { deletedAt: null };

    // Use raw aggregation for both overall stats and ward breakdown
    const [overallResult, byWardResult] = await Promise.all([
      prisma.$runCommandRaw({
        aggregate: "holding_taxes",
        pipeline: [
          { $match: matchStage },
          {
            $group: {
              _id: null,
              totalAssessed: { $sum: "$totalDue" },
              totalCollected: { $sum: "$totalPaid" },
            },
          },
        ],
        cursor: {},
      }) as unknown as Promise<{
        cursor: {
          firstBatch: Array<{ _id: null; totalAssessed: number; totalCollected: number }>;
        };
      }>,
      prisma.$runCommandRaw({
        aggregate: "holding_taxes",
        pipeline: [
          { $match: matchStage },
          {
            $group: {
              _id: "$holdingInfo.ward",
              assessed: { $sum: "$totalDue" },
              collected: { $sum: "$totalPaid" },
            },
          },
          { $sort: { _id: 1 } },
        ],
        cursor: {},
      }) as unknown as Promise<{
        cursor: {
          firstBatch: Array<{ _id: number; assessed: number; collected: number }>;
        };
      }>,
    ]);

    const overall = overallResult.cursor?.firstBatch?.[0] || {
      totalAssessed: 0,
      totalCollected: 0,
    };
    const totalPending = overall.totalAssessed - overall.totalCollected;
    const collectionRate =
      overall.totalAssessed > 0
        ? Math.round((overall.totalCollected / overall.totalAssessed) * 100)
        : 0;

    const byWard = (byWardResult.cursor?.firstBatch || []).map((w) => ({
      ward: w._id,
      assessed: w.assessed,
      collected: w.collected,
    }));

    return {
      totalAssessed: overall.totalAssessed,
      totalCollected: overall.totalCollected,
      totalPending,
      collectionRate,
      byWard,
    };
  }

  static async getReceipt(
    taxId: string,
    receiptNo: string
  ): Promise<{
    success: boolean;
    receipt?: {
      receiptNo: string;
      amount: number;
      paymentDate: Date;
      paymentMethod: string;
      citizen: {
        name: string;
        nameBn: string;
        nid?: string | null;
      };
      holdingNo: string;
      fiscalYear: string;
      collectedBy?: string;
    };
    message: string;
  }> {
    if (!isValidObjectId(taxId)) {
      return { success: false, message: "Invalid tax ID" };
    }

    const tax = await prisma.holdingTax.findUnique({
      where: { id: taxId },
      include: {
        citizen: {
          select: {
            name: true,
            nameBn: true,
            nid: true,
          },
        },
      },
    });

    if (!tax) {
      return { success: false, message: "Tax record not found" };
    }

    if (tax.balance > 0) {
      return {
        success: false,
        message: "Receipt print is blocked until full tax payment is completed",
      };
    }

    const payment = tax.payments.find((p) => p.receiptNo === receiptNo);
    if (!payment) {
      return { success: false, message: "Receipt not found" };
    }

    // Fetch collector info if needed
    let collectorName: string | undefined;
    if (payment.collectedById && isValidObjectId(payment.collectedById)) {
      const collector = await prisma.user.findUnique({
        where: { id: payment.collectedById },
        select: { name: true },
      });
      collectorName = collector?.name;
    }

    return {
      success: true,
      receipt: {
        receiptNo: payment.receiptNo,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        citizen: {
          name: tax.citizen.name,
          nameBn: tax.citizen.nameBn,
          nid: tax.citizen.nid,
        },
        holdingNo: tax.holdingInfo.holdingNo,
        fiscalYear: tax.fiscalYear,
        collectedBy: collectorName,
      },
      message: "Receipt found",
    };
  }

  /**
   * Get taxes by fiscal year with pagination
   */
  static async getByFiscalYear(
    fiscalYear: string,
    options: {
      page?: number;
      limit?: number;
      status?: HoldingTaxPaymentStatus;
      wardNo?: number;
    } = {}
  ): Promise<{
    taxes: HoldingTaxWithCitizen[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, status, wardNo } = options;
    const skip = (page - 1) * limit;

    let where: Prisma.HoldingTaxWhereInput = {
      fiscalYear,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    // Ward filtering requires raw query for nested composite type
    if (wardNo) {
      const result = (await prisma.$runCommandRaw({
        aggregate: "holding_taxes",
        pipeline: [
          {
            $match: {
              fiscalYear,
              deletedAt: null,
              "holdingInfo.ward": wardNo,
              ...(status ? { status } : {}),
            },
          },
          {
            $facet: {
              data: [
                { $skip: skip },
                { $limit: limit },
                {
                  $lookup: {
                    from: "citizens",
                    localField: "citizenId",
                    foreignField: "_id",
                    as: "citizenData",
                  },
                },
                { $unwind: { path: "$citizenData", preserveNullAndEmptyArrays: true } },
              ],
              count: [{ $count: "total" }],
            },
          },
        ],
        cursor: {},
      })) as unknown as {
        cursor: {
          firstBatch: Array<{
            data: Array<HoldingTax & { citizenData?: Citizen }>;
            count: Array<{ total: number }>;
          }>;
        };
      };

      const batch = result.cursor?.firstBatch?.[0];
      const taxes = (batch?.data || []).map((doc) => ({
        ...doc,
        id: (doc as unknown as { _id: { $oid: string } })._id.$oid || String((doc as unknown as { _id: unknown })._id),
        citizen: doc.citizenData
          ? {
              id: String((doc.citizenData as unknown as { _id: unknown })._id),
              name: doc.citizenData.name,
              nameBn: doc.citizenData.nameBn,
              nid: doc.citizenData.nid,
              mobile: doc.citizenData.mobile,
            }
          : undefined,
      }));
      const total = batch?.count?.[0]?.total || 0;

      return {
        taxes,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }

    const [taxes, total] = await Promise.all([
      prisma.holdingTax.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          citizen: {
            select: {
              id: true,
              name: true,
              nameBn: true,
              nid: true,
              mobile: true,
            },
          },
        },
      }),
      prisma.holdingTax.count({ where }),
    ]);

    return {
      taxes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get current fiscal year helper
   */
  static getCurrentFiscalYear(): string {
    return getCurrentFiscalYear();
  }

  /**
   * Update holding tax assessment
   */
  static async updateAssessment(
    taxId: string,
    assessment: {
      assessedValue: number;
      taxRate: number;
      annualTax: number;
      notes?: string;
    },
    updatedBy?: string
  ): Promise<{ success: boolean; tax?: HoldingTax; message: string }> {
    if (!isValidObjectId(taxId)) {
      return { success: false, message: "Invalid tax ID" };
    }

    return prisma
      .$transaction(async (tx) => {
        const tax = await tx.holdingTax.findUnique({
          where: { id: taxId },
        });

        if (!tax) {
          throw new Error("Tax record not found");
        }

        // Don't allow reassessment if payments have been made
        if (tax.totalPaid > 0) {
          throw new Error("Cannot reassess tax after payments have been made");
        }

        const sanitizedAssessment = deepSanitize(assessment);

        // Recalculate totals
        const { totalDue, balance } = calculateHoldingTaxBalance(
          sanitizedAssessment.annualTax,
          tax.arrears,
          tax.penalty,
          tax.rebate,
          tax.totalPaid
        );

        await tx.holdingTax.updateMany({
          where: { id: taxId },
          data: {
            assessment: {
              assessedValue: sanitizedAssessment.assessedValue,
              taxRate: sanitizedAssessment.taxRate,
              annualTax: sanitizedAssessment.annualTax,
              assessmentDate: new Date(),
              assessedById: updatedBy,
              notes: sanitizedAssessment.notes,
            },
            totalDue,
            balance,
            updatedById: updatedBy,
          },
        });

        const updatedTax = await tx.holdingTax.findUnique({
          where: { id: taxId },
        });

        if (!updatedTax) {
          throw new Error("Tax record not found after update");
        }

        // Log audit
        if (updatedBy) {
          await logAudit(tx, {
            userId: updatedBy,
            action: "UPDATE",
            entityType: "HOLDING_TAX",
            entityId: tax.id,
            description: `Holding tax reassessed: ${tax.referenceNo}. New annual tax: ৳${sanitizedAssessment.annualTax}`,
            severity: "MEDIUM",
            changes: {
              before: tax.assessment,
              after: sanitizedAssessment,
            },
          });
        }

        return {
          success: true,
          tax: updatedTax,
          message: "Assessment updated successfully",
        };
      })
      .catch((error) => {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to update assessment",
        };
      });
  }

  /**
   * Waive tax (mark as waived)
   */
  static async waiveTax(
    taxId: string,
    reason: string,
    waivedBy: string
  ): Promise<{ success: boolean; tax?: HoldingTax; message: string }> {
    if (!isValidObjectId(taxId)) {
      return { success: false, message: "Invalid tax ID" };
    }

    if (!isValidObjectId(waivedBy)) {
      return { success: false, message: "Invalid user ID" };
    }

    return prisma
      .$transaction(async (tx) => {
        const tax = await tx.holdingTax.findUnique({
          where: { id: taxId },
        });

        if (!tax) {
          throw new Error("Tax record not found");
        }

        if (tax.status === "PAID") {
          throw new Error("Cannot waive a fully paid tax");
        }

        await tx.holdingTax.updateMany({
          where: { id: taxId },
          data: {
            status: "WAIVED",
            updatedById: waivedBy,
          },
        });

        const updatedTax = await tx.holdingTax.findUnique({
          where: { id: taxId },
        });

        if (!updatedTax) {
          throw new Error("Tax record not found after update");
        }

        // Log audit
        await logAudit(tx, {
          userId: waivedBy,
          action: "WAIVE",
          entityType: "HOLDING_TAX",
          entityId: tax.id,
          description: `Holding tax waived: ${tax.referenceNo}. Reason: ${reason}`,
          severity: "HIGH",
        });

        return {
          success: true,
          tax: updatedTax,
          message: "Tax waived successfully",
        };
      })
      .catch((error) => {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to waive tax",
        };
      });
  }

  /**
   * Soft delete holding tax record
   */
  static async delete(
    taxId: string,
    deletedBy?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!isValidObjectId(taxId)) {
      return { success: false, message: "Invalid tax ID" };
    }

    return prisma
      .$transaction(async (tx) => {
        const tax = await tx.holdingTax.findUnique({
          where: { id: taxId },
        });

        if (!tax) {
          throw new Error("Tax record not found");
        }

        await tx.holdingTax.updateMany({
          where: { id: taxId },
          data: {
            deletedAt: new Date(),
            updatedById: deletedBy,
          },
        });

        // Log audit
        if (deletedBy) {
          await logAudit(tx, {
            userId: deletedBy,
            action: "SOFT_DELETE",
            entityType: "HOLDING_TAX",
            entityId: tax.id,
            description: `Holding tax deleted: ${tax.referenceNo}`,
            severity: "HIGH",
          });
        }

        return { success: true, message: "Holding tax deleted successfully" };
      })
      .catch((error) => {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to delete holding tax",
        };
      });
  }
}
