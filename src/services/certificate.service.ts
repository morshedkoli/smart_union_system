import mongoose from "mongoose";
import QRCode from "qrcode";
import { connectDB } from "@/lib/mongodb";
import {
  Certificate,
  CertificateStatus,
  CertificateType,
  ICertificate,
  Citizen,
  CertificateTemplate,
} from "@/models";
import { AuditLog, AuditAction, EntityType, Severity } from "@/models/AuditLog";
import { CertificateTemplateService } from "./certificate-template.service";
import { HoldingTaxService } from "./holding-tax.service";
import { deepSanitize } from "@/lib/sanitize";

interface CreateCertificateData {
  citizenId: string;
  type: CertificateType;
  templateId: string;
  dataSnapshot: Record<string, unknown>;
}

interface UpdateCertificateData {
  finalText?: string;
  dataSnapshot?: Record<string, unknown>;
}

const SYSTEM_USER_ID = "000000000000000000000001";

export class CertificateService {
  static async list(status?: CertificateStatus): Promise<ICertificate[]> {
    await connectDB();
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const certificates = await Certificate.find(filter)
      .populate("citizen", "name nameBn nid")
      .populate("template", "name nameBn")
      .sort({ createdAt: -1 })
      .lean();

    return certificates as ICertificate[];
  }

  static async getById(id: string): Promise<ICertificate | null> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    const certificate = await Certificate.findById(id)
      .populate("citizen", "name nameBn fatherName nid")
      .populate("template", "name nameBn")
      .lean();
    return certificate as ICertificate | null;
  }

  static async create(
    data: CreateCertificateData,
    userId?: string
  ): Promise<{ success: boolean; certificate?: ICertificate; message: string }> {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Sanitize input
      const sanitizedData = deepSanitize(data);

      if (!mongoose.Types.ObjectId.isValid(sanitizedData.citizenId)) {
        await session.abortTransaction();
        return { success: false, message: "Invalid citizen ID" };
      }
      if (!mongoose.Types.ObjectId.isValid(sanitizedData.templateId)) {
        await session.abortTransaction();
        return { success: false, message: "Invalid template ID" };
      }

      const [citizen, template] = await Promise.all([
        Citizen.findById(sanitizedData.citizenId).session(session).lean(),
        CertificateTemplate.findById(sanitizedData.templateId).session(session).lean(),
      ]);

      if (!citizen) {
        await session.abortTransaction();
        return { success: false, message: "Citizen not found" };
      }
      if (!template) {
        await session.abortTransaction();
        return { success: false, message: "Template not found" };
      }

      const certificateNo = await (
        Certificate as typeof Certificate & {
          generateCertificateNo: (type: CertificateType, year?: number) => Promise<string>;
        }
      ).generateCertificateNo(sanitizedData.type);

      // Generate unique reference number
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const referenceNo = `REF-${timestamp}-${random}`;

      const finalText = CertificateTemplateService.buildPreviewHtml(
        {
          headerHtml: template.headerHtml,
          bodyHtml: template.bodyHtml,
          footerHtml: template.footerHtml,
          stylesCss: template.stylesCss,
        },
        sanitizedData.dataSnapshot
      );

      const ownerId =
        userId && mongoose.Types.ObjectId.isValid(userId) ? userId : SYSTEM_USER_ID;

      const [certificate] = await Certificate.create([{
        certificateNo,
        referenceNo,
        type: sanitizedData.type,
        citizen: new mongoose.Types.ObjectId(sanitizedData.citizenId),
        applicantName: (sanitizedData.dataSnapshot?.name as string) || (citizen.name as string),
        applicantNameBn: citizen.nameBn,
        finalText,
        dataSnapshot: sanitizedData.dataSnapshot,
        status: CertificateStatus.DRAFT,
        metadata: {},
        fee: template.fee || 0,
        feePaid: true,
        template: new mongoose.Types.ObjectId(sanitizedData.templateId),
        qrCode: referenceNo,
        qrData: referenceNo,
        verificationUrl: `/verify/${referenceNo}`,
        createdBy: new mongoose.Types.ObjectId(ownerId),
        updatedBy: new mongoose.Types.ObjectId(ownerId),
      }], { session });

      // Log audit
      await AuditLog.log({
        user: new mongoose.Types.ObjectId(ownerId),
        action: AuditAction.CREATE,
        entityType: EntityType.CERTIFICATE,
        entityId: certificate._id,
        entityName: certificate.applicantName,
        description: `Certificate draft created: ${certificateNo} for ${citizen.name}`,
        severity: Severity.LOW,
      });

      await session.commitTransaction();

      return {
        success: true,
        certificate: certificate.toObject() as ICertificate,
        message: "Certificate draft created successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async update(
    id: string,
    data: UpdateCertificateData,
    userId?: string
  ): Promise<{ success: boolean; certificate?: ICertificate; message: string }> {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        await session.abortTransaction();
        return { success: false, message: "Invalid certificate ID" };
      }

      // Sanitize input
      const sanitizedData = deepSanitize(data);

      const certificate = await Certificate.findById(id).session(session).populate("template");
      if (!certificate) {
        await session.abortTransaction();
        return { success: false, message: "Certificate not found" };
      }

      if (certificate.status === CertificateStatus.APPROVED) {
        await session.abortTransaction();
        return { success: false, message: "Approved certificate is locked and cannot be edited" };
      }

      // Track changes
      const changes: { before: Record<string, unknown>; after: Record<string, unknown> } = {
        before: {},
        after: {},
      };

      if (sanitizedData.dataSnapshot) {
        const template = certificate.template as unknown as {
          headerHtml?: string;
          bodyHtml: string;
          footerHtml?: string;
          stylesCss?: string;
        };
        const finalText = CertificateTemplateService.buildPreviewHtml(
          {
            headerHtml: template.headerHtml,
            bodyHtml: template.bodyHtml,
            footerHtml: template.footerHtml,
            stylesCss: template.stylesCss,
          },
          sanitizedData.dataSnapshot
        );

        changes.before.dataSnapshot = certificate.dataSnapshot;
        changes.after.dataSnapshot = sanitizedData.dataSnapshot;

        certificate.dataSnapshot = sanitizedData.dataSnapshot;
        certificate.finalText = finalText;
        if (sanitizedData.dataSnapshot.name) {
          certificate.applicantName = sanitizedData.dataSnapshot.name as string;
        }
      }

      if (sanitizedData.finalText) {
        changes.before.finalText = certificate.finalText;
        changes.after.finalText = sanitizedData.finalText;
        certificate.finalText = sanitizedData.finalText;
      }

      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        certificate.updatedBy = new mongoose.Types.ObjectId(userId);
      }

      await certificate.save({ session });

      // Log audit
      if (userId && (changes.before.dataSnapshot || changes.before.finalText)) {
        await AuditLog.log({
          user: new mongoose.Types.ObjectId(userId),
          action: AuditAction.UPDATE,
          entityType: EntityType.CERTIFICATE,
          entityId: certificate._id,
          entityName: certificate.applicantName,
          description: `Certificate updated: ${certificate.certificateNo}`,
          changes,
          severity: Severity.LOW,
        });
      }

      await session.commitTransaction();

      return {
        success: true,
        certificate: certificate.toObject() as ICertificate,
        message: "Certificate updated successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async submit(
    id: string,
    userId?: string
  ): Promise<{ success: boolean; certificate?: ICertificate; message: string }> {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        await session.abortTransaction();
        return { success: false, message: "Invalid certificate ID" };
      }

      const certificate = await Certificate.findById(id).session(session);
      if (!certificate) {
        await session.abortTransaction();
        return { success: false, message: "Certificate not found" };
      }
      if (certificate.status === CertificateStatus.APPROVED) {
        await session.abortTransaction();
        return { success: false, message: "Approved certificate is already locked" };
      }

      certificate.status = CertificateStatus.SUBMITTED;
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        certificate.updatedBy = new mongoose.Types.ObjectId(userId);
      }

      await certificate.save({ session });

      // Log audit
      if (userId) {
        await AuditLog.log({
          user: new mongoose.Types.ObjectId(userId),
          action: AuditAction.UPDATE,
          entityType: EntityType.CERTIFICATE,
          entityId: certificate._id,
          entityName: certificate.applicantName,
          description: `Certificate submitted for approval: ${certificate.certificateNo}`,
          severity: Severity.LOW,
        });
      }

      await session.commitTransaction();

      return {
        success: true,
        certificate: certificate.toObject() as ICertificate,
        message: "Certificate submitted for approval",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async approve(
    id: string,
    userId?: string
  ): Promise<{ success: boolean; certificate?: ICertificate; message: string }> {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        await session.abortTransaction();
        return { success: false, message: "Invalid certificate ID" };
      }

      const certificate = await Certificate.findById(id).session(session);
      if (!certificate) {
        await session.abortTransaction();
        return { success: false, message: "Certificate not found" };
      }
      if (certificate.status === CertificateStatus.APPROVED) {
        await session.abortTransaction();
        return { success: false, message: "Certificate already approved" };
      }

      const approverId =
        userId && mongoose.Types.ObjectId.isValid(userId) ? userId : SYSTEM_USER_ID;
      const verificationPath = `/verify/${certificate.referenceNo}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verificationPath);

      certificate.status = CertificateStatus.APPROVED;
      certificate.approvedBy = new mongoose.Types.ObjectId(approverId);
      certificate.approvedAt = new Date();
      certificate.issueDate = new Date();
      certificate.verificationUrl = verificationPath;
      certificate.qrData = verificationPath;
      certificate.qrCode = qrCodeDataUrl;
      certificate.updatedBy = new mongoose.Types.ObjectId(approverId);

      await certificate.save({ session });

      // Log audit
      await AuditLog.log({
        user: new mongoose.Types.ObjectId(approverId),
        action: AuditAction.APPROVE,
        entityType: EntityType.CERTIFICATE,
        entityId: certificate._id,
        entityName: certificate.applicantName,
        description: `Certificate approved: ${certificate.certificateNo}`,
        severity: Severity.MEDIUM,
      });

      await session.commitTransaction();

      return {
        success: true,
        certificate: certificate.toObject() as ICertificate,
        message: "Certificate approved and locked",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async reject(
    id: string,
    reason: string,
    userId?: string
  ): Promise<{ success: boolean; certificate?: ICertificate; message: string }> {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        await session.abortTransaction();
        return { success: false, message: "Invalid certificate ID" };
      }

      const certificate = await Certificate.findById(id).session(session);
      if (!certificate) {
        await session.abortTransaction();
        return { success: false, message: "Certificate not found" };
      }

      if (certificate.status === CertificateStatus.APPROVED) {
        await session.abortTransaction();
        return { success: false, message: "Cannot reject approved certificate" };
      }

      const rejectorId =
        userId && mongoose.Types.ObjectId.isValid(userId) ? userId : SYSTEM_USER_ID;

      certificate.status = CertificateStatus.REJECTED;
      certificate.rejectedBy = new mongoose.Types.ObjectId(rejectorId);
      certificate.rejectedAt = new Date();
      certificate.rejectionReason = reason;
      certificate.updatedBy = new mongoose.Types.ObjectId(rejectorId);

      await certificate.save({ session });

      // Log audit
      await AuditLog.log({
        user: new mongoose.Types.ObjectId(rejectorId),
        action: AuditAction.REJECT,
        entityType: EntityType.CERTIFICATE,
        entityId: certificate._id,
        entityName: certificate.applicantName,
        description: `Certificate rejected: ${certificate.certificateNo}. Reason: ${reason}`,
        severity: Severity.MEDIUM,
      });

      await session.commitTransaction();

      return {
        success: true,
        certificate: certificate.toObject() as ICertificate,
        message: "Certificate rejected",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async verifyByReference(referenceNo: string): Promise<{
    success: boolean;
    valid: boolean;
    certificate?: {
      referenceNo: string;
      certificateNo: string;
      applicantName: string;
      type: CertificateType;
      issueDate?: Date;
      status: CertificateStatus;
      finalText: string;
      verificationUrl: string;
    };
    message: string;
  }> {
    await connectDB();

    const certificate = await Certificate.findOne({ referenceNo })
      .select("referenceNo certificateNo applicantName type issueDate status finalText verificationUrl")
      .lean();

    if (!certificate) {
      return {
        success: true,
        valid: false,
        message: "Certificate not found",
      };
    }

    const isValid = certificate.status === CertificateStatus.APPROVED;
    return {
      success: true,
      valid: isValid,
      certificate: certificate as {
        referenceNo: string;
        certificateNo: string;
        applicantName: string;
        type: CertificateType;
        issueDate?: Date;
        status: CertificateStatus;
        finalText: string;
        verificationUrl: string;
      },
      message: isValid ? "Certificate is valid" : "Certificate is invalid",
    };
  }

  static async getPdfDataById(id: string): Promise<{
    success: boolean;
    data?: {
      unionName: string;
      referenceNo: string;
      certificateNo: string;
      applicantName: string;
      certificateType: string;
      issueDate?: string;
      finalText: string;
      qrCodeDataUrl?: string;
      signatureLabel?: string;
    };
    message: string;
  }> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    const certificate = await Certificate.findById(id).lean();
    if (!certificate) {
      return { success: false, message: "Certificate not found" };
    }
    if (certificate.status !== CertificateStatus.APPROVED) {
      return { success: false, message: "Only approved certificates are print-ready" };
    }

    return {
      success: true,
      data: {
        unionName: "Smart Union Parishad",
        referenceNo: certificate.referenceNo,
        certificateNo: certificate.certificateNo,
        applicantName: certificate.applicantName,
        certificateType: certificate.type,
        issueDate: certificate.issueDate ? certificate.issueDate.toISOString() : undefined,
        finalText: certificate.finalText,
        qrCodeDataUrl: certificate.qrCode,
        signatureLabel: "Chairman / Authorized Officer",
      },
      message: "Certificate PDF data prepared",
    };
  }

  static async getPrintPreview(id: string): Promise<{
    success: boolean;
    preview?: {
      certificateId: string;
      referenceNo: string;
      finalText: string;
      applicantName: string;
      status: CertificateStatus;
      printCount: number;
      lastPrintedAt?: Date;
    };
    message: string;
  }> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    const certificate = await Certificate.findById(id)
      .select("referenceNo finalText applicantName status printCount lastPrintedAt")
      .lean();

    if (!certificate) {
      return { success: false, message: "Certificate not found" };
    }
    if (certificate.status !== CertificateStatus.APPROVED) {
      return { success: false, message: "Only approved certificates can be previewed for print" };
    }

    return {
      success: true,
      preview: {
        certificateId: id,
        referenceNo: certificate.referenceNo,
        finalText: certificate.finalText,
        applicantName: certificate.applicantName,
        status: certificate.status,
        printCount: certificate.printCount || 0,
        lastPrintedAt: certificate.lastPrintedAt,
      },
      message: "Print preview ready",
    };
  }

  static async getPrintHistory(id: string): Promise<{
    success: boolean;
    history?: Array<{
      printedAt: Date;
      printedBy?: string;
      method: "PREVIEW" | "PRINT";
      note?: string;
    }>;
    message: string;
  }> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    const certificate = await Certificate.findById(id)
      .populate("printHistory.printedBy", "name")
      .select("printHistory")
      .lean();

    if (!certificate) {
      return { success: false, message: "Certificate not found" };
    }

    const history = (certificate.printHistory || []).map((entry: any) => ({
      printedAt: entry.printedAt,
      printedBy: entry.printedBy?.name,
      method: entry.method as "PREVIEW" | "PRINT",
      note: entry.note,
    }));

    return {
      success: true,
      history,
      message: "Print history loaded",
    };
  }

  static async registerPrint(
    id: string,
    userId?: string,
    method: "PREVIEW" | "PRINT" = "PRINT",
    note?: string
  ): Promise<{ success: boolean; message: string }> {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        await session.abortTransaction();
        return { success: false, message: "Invalid certificate ID" };
      }

      const certificate = await Certificate.findById(id)
        .select("citizen status printCount printHistory")
        .session(session);

      if (!certificate) {
        await session.abortTransaction();
        return { success: false, message: "Certificate not found" };
      }
      if (certificate.status !== CertificateStatus.APPROVED) {
        await session.abortTransaction();
        return { success: false, message: "Only approved certificates can be printed" };
      }

      const citizenId = certificate.citizen.toString();
      const taxCheck = await HoldingTaxService.checkUnpaidTax(citizenId);
      if (taxCheck.hasUnpaid) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Print is blocked until all holding tax dues are cleared",
        };
      }

      const historyEntry: {
        printedAt: Date;
        printedBy?: mongoose.Types.ObjectId;
        method: "PREVIEW" | "PRINT";
        note?: string;
      } = {
        printedAt: new Date(),
        method,
        note,
      };

      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        historyEntry.printedBy = new mongoose.Types.ObjectId(userId);
      }

      certificate.printHistory = [...(certificate.printHistory || []), historyEntry];
      if (method === "PRINT") {
        certificate.printCount = (certificate.printCount || 0) + 1;
        certificate.lastPrintedAt = new Date();
      }

      await certificate.save({ session });

      // Log audit
      if (userId) {
        await AuditLog.log({
          user: new mongoose.Types.ObjectId(userId),
          action: AuditAction.PRINT,
          entityType: EntityType.CERTIFICATE,
          entityId: certificate._id,
          description: `Certificate ${method.toLowerCase()}: ${certificate._id}`,
          severity: Severity.LOW,
        });
      }

      await session.commitTransaction();

      return {
        success: true,
        message: method === "PRINT" ? "Print recorded" : "Preview recorded",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
