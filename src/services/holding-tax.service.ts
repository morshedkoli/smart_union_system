import { connectDB } from "@/lib/mongodb";
import {
  HoldingTax,
  IHoldingTax,
  PaymentStatus,
  PaymentMethod,
  HoldingType,
  BuildingType,
} from "@/models";
import { AuditLog, AuditAction, EntityType, Severity } from "@/models/AuditLog";
import mongoose from "mongoose";
import { deepSanitize } from "@/lib/sanitize";

export interface HoldingTaxCreateData {
  citizenId: string;
  holdingInfo: {
    holdingNo: string;
    mouza?: string;
    jlNo?: string;
    daagNo?: string;
    plotNo?: string;
    ward: number;
    area: number;
    areaUnit?: string;
    holdingType: HoldingType;
    buildingType?: BuildingType;
    floors?: number;
  };
  fiscalYear: string;
  assessment: {
    assessedValue: number;
    taxRate: number;
    annualTax: number;
  };
  arrears?: number;
  rebate?: number;
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

const SYSTEM_COLLECTOR_ID = "000000000000000000000001";

function getCollectorObjectId(collectedBy?: string): mongoose.Types.ObjectId {
  if (collectedBy && mongoose.Types.ObjectId.isValid(collectedBy)) {
    return new mongoose.Types.ObjectId(collectedBy);
  }
  return new mongoose.Types.ObjectId(SYSTEM_COLLECTOR_ID);
}

export class HoldingTaxService {
  static async getByCitizenId(citizenId: string): Promise<IHoldingTax[]> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(citizenId)) {
      return [];
    }

    const taxes = await HoldingTax.find({
      citizen: new mongoose.Types.ObjectId(citizenId),
    })
      .sort({ fiscalYear: -1 })
      .lean();

    return taxes as IHoldingTax[];
  }

  static async getBycitizenId(citizenId: string): Promise<IHoldingTax[]> {
    return this.getByCitizenId(citizenId);
  }

  static async getById(id: string): Promise<IHoldingTax | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const tax = await HoldingTax.findById(id)
      .populate("citizen", "name nameBn nid mobile")
      .lean();

    return tax as IHoldingTax | null;
  }

  static async create(
    data: HoldingTaxCreateData,
    createdBy?: string
  ): Promise<{ success: boolean; tax?: IHoldingTax; message: string }> {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Sanitize input
      const sanitizedData = deepSanitize(data);

      // Check for existing tax for same holding and fiscal year
      const existing = await HoldingTax.findOne({
        citizen: new mongoose.Types.ObjectId(sanitizedData.citizenId),
        "holdingInfo.holdingNo": sanitizedData.holdingInfo.holdingNo,
        fiscalYear: sanitizedData.fiscalYear,
      }).session(session);

      if (existing) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Tax already exists for this holding and fiscal year",
        };
      }

      // Generate reference number
      const referenceNo = await (HoldingTax as typeof HoldingTax & {
        generateReferenceNo: (fiscalYear: string, ward: number) => Promise<string>;
      }).generateReferenceNo(sanitizedData.fiscalYear, sanitizedData.holdingInfo.ward);

      // Calculate totals
      const arrears = sanitizedData.arrears || 0;
      const rebate = sanitizedData.rebate || 0;
      const totalDue = sanitizedData.assessment.annualTax + arrears - rebate;

      const [tax] = await HoldingTax.create([{
        referenceNo,
        citizen: new mongoose.Types.ObjectId(sanitizedData.citizenId),
        holdingInfo: sanitizedData.holdingInfo,
        fiscalYear: sanitizedData.fiscalYear,
        assessment: {
          ...sanitizedData.assessment,
          assessmentDate: new Date(),
          assessedBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
        },
        arrears,
        rebate,
        totalDue,
        totalPaid: 0,
        balance: totalDue,
        dueDate: sanitizedData.dueDate,
        status: PaymentStatus.UNPAID,
        payments: [],
        createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
      }], { session });

      // Log audit
      if (createdBy) {
        await AuditLog.log({
          user: new mongoose.Types.ObjectId(createdBy),
          action: AuditAction.CREATE,
          entityType: EntityType.HOLDING_TAX,
          entityId: tax._id,
          description: `Holding tax created: ${referenceNo} for holding ${sanitizedData.holdingInfo.holdingNo}`,
          severity: Severity.LOW,
        });
      }

      await session.commitTransaction();

      return {
        success: true,
        tax: tax.toObject() as IHoldingTax,
        message: "Holding tax created successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async addPayment(
    taxId: string,
    payment: PaymentData,
    collectedBy: string
  ): Promise<{ success: boolean; tax?: IHoldingTax; receiptNo: string; message: string }> {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!mongoose.Types.ObjectId.isValid(taxId)) {
        await session.abortTransaction();
        return { success: false, receiptNo: "", message: "Invalid tax ID" };
      }

      // Sanitize payment data
      const sanitizedPayment = deepSanitize(payment);

      const tax = await HoldingTax.findById(taxId).session(session);
      if (!tax) {
        await session.abortTransaction();
        return { success: false, receiptNo: "", message: "Tax record not found" };
      }

      if (tax.balance <= 0) {
        await session.abortTransaction();
        return { success: false, receiptNo: "", message: "Tax already fully paid" };
      }

      if (sanitizedPayment.amount > tax.balance) {
        await session.abortTransaction();
        return { success: false, receiptNo: "", message: "Payment amount exceeds balance" };
      }

      // Generate receipt number
      const receiptNo = `RCP-${Date.now().toString(36).toUpperCase()}`;

      const paymentRecord = {
        receiptNo,
        amount: sanitizedPayment.amount,
        paymentDate: new Date(),
        paymentMethod: sanitizedPayment.paymentMethod,
        transactionId: sanitizedPayment.transactionId,
        bankName: sanitizedPayment.bankName,
        chequeNo: sanitizedPayment.chequeNo,
        collectedBy: getCollectorObjectId(collectedBy),
        notes: sanitizedPayment.notes,
      } as unknown as IHoldingTax["payments"][0];

      tax.payments.push(paymentRecord);
      tax.totalPaid += sanitizedPayment.amount;
      tax.balance = tax.totalDue - tax.totalPaid;
      tax.lastPaymentDate = new Date();

      // Update status
      if (tax.balance <= 0) {
        tax.status = PaymentStatus.PAID;
      } else {
        tax.status = PaymentStatus.PARTIAL;
      }

      await tax.save({ session });

      // Log audit
      await AuditLog.log({
        user: getCollectorObjectId(collectedBy),
        action: AuditAction.PAYMENT,
        entityType: EntityType.HOLDING_TAX,
        entityId: tax._id,
        description: `Payment received: ৳${sanitizedPayment.amount} for tax ${tax.referenceNo}. Receipt: ${receiptNo}`,
        severity: Severity.LOW,
      });

      await session.commitTransaction();

      return {
        success: true,
        tax: tax.toObject() as IHoldingTax,
        receiptNo,
        message: "Payment recorded successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async markAsPaid(
    taxId: string,
    paymentMethod: PaymentMethod,
    collectedBy?: string,
    notes?: string
  ): Promise<{ success: boolean; tax?: IHoldingTax; receiptNo: string; message: string }> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(taxId)) {
      return { success: false, receiptNo: "", message: "Invalid tax ID" };
    }

    const tax = await HoldingTax.findById(taxId);
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
  ): Promise<{ hasUnpaid: boolean; unpaidTaxes: IHoldingTax[]; totalDue: number }> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(citizenId)) {
      return { hasUnpaid: false, unpaidTaxes: [], totalDue: 0 };
    }

    const unpaidTaxes = await HoldingTax.find({
      citizen: new mongoose.Types.ObjectId(citizenId),
      status: { $in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] },
      deletedAt: null,
    }).lean();

    const totalDue = unpaidTaxes.reduce((sum, tax) => sum + tax.balance, 0);

    return {
      hasUnpaid: unpaidTaxes.length > 0,
      unpaidTaxes: unpaidTaxes as IHoldingTax[],
      totalDue,
    };
  }

  static async getOverdueTaxes(wardNo?: number): Promise<IHoldingTax[]> {
    await connectDB();

    const now = new Date();
    const filter: Record<string, unknown> = {
      dueDate: { $lt: now },
      status: { $in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
      deletedAt: null,
    };

    if (wardNo) {
      filter["holdingInfo.ward"] = wardNo;
    }

    // Update overdue status
    await HoldingTax.updateMany(filter, { status: PaymentStatus.OVERDUE });

    const taxes = await HoldingTax.find({
      ...filter,
      status: PaymentStatus.OVERDUE,
    })
      .populate("citizen", "name nameBn nid mobile")
      .sort({ dueDate: 1 })
      .lean();

    return taxes as IHoldingTax[];
  }

  static async getPaymentHistory(
    taxId: string
  ): Promise<{ payments: IHoldingTax["payments"]; tax: IHoldingTax | null }> {
    await connectDB();

    const tax = await HoldingTax.findById(taxId)
      .populate("citizen", "name nameBn nid")
      .populate("payments.collectedBy", "name")
      .lean();

    if (!tax) {
      return { payments: [], tax: null };
    }

    return {
      payments: tax.payments,
      tax: tax as IHoldingTax,
    };
  }

  static async getStats(fiscalYear?: string): Promise<{
    totalAssessed: number;
    totalCollected: number;
    totalPending: number;
    collectionRate: number;
    byWard: Array<{ ward: number; assessed: number; collected: number }>;
  }> {
    await connectDB();

    const matchStage: Record<string, unknown> = { deletedAt: null };
    if (fiscalYear) {
      matchStage.fiscalYear = fiscalYear;
    }

    const [overall, byWard] = await Promise.all([
      HoldingTax.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalAssessed: { $sum: "$totalDue" },
            totalCollected: { $sum: "$totalPaid" },
          },
        },
      ]),
      HoldingTax.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$holdingInfo.ward",
            assessed: { $sum: "$totalDue" },
            collected: { $sum: "$totalPaid" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const stats = overall[0] || { totalAssessed: 0, totalCollected: 0 };
    const totalPending = stats.totalAssessed - stats.totalCollected;
    const collectionRate =
      stats.totalAssessed > 0
        ? Math.round((stats.totalCollected / stats.totalAssessed) * 100)
        : 0;

    return {
      totalAssessed: stats.totalAssessed,
      totalCollected: stats.totalCollected,
      totalPending,
      collectionRate,
      byWard: byWard.map((w) => ({
        ward: w._id,
        assessed: w.assessed,
        collected: w.collected,
      })),
    };
  }

  static async getReceipt(taxId: string, receiptNo: string): Promise<{
    success: boolean;
    receipt?: {
      receiptNo: string;
      amount: number;
      paymentDate: Date;
      paymentMethod: string;
      citizen: {
        name: string;
        nameBn: string;
        nid?: string;
      };
      holdingNo: string;
      fiscalYear: string;
      collectedBy?: string;
    };
    message: string;
  }> {
    await connectDB();

    const tax = await HoldingTax.findById(taxId)
      .populate("citizen", "name nameBn nid")
      .populate("payments.collectedBy", "name")
      .lean();

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

    const citizen = tax.citizen as unknown as { name: string; nameBn: string; nid?: string };
    const collectedBy = payment.collectedBy as unknown as { name: string } | undefined;

    return {
      success: true,
      receipt: {
        receiptNo: payment.receiptNo,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        citizen: {
          name: citizen.name,
          nameBn: citizen.nameBn,
          nid: citizen.nid,
        },
        holdingNo: tax.holdingInfo.holdingNo,
        fiscalYear: tax.fiscalYear,
        collectedBy: collectedBy?.name,
      },
      message: "Receipt found",
    };
  }
}
