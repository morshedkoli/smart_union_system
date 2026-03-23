import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import {
  generateCertificateNo,
  generateCertificateReferenceNo,
  isValidObjectId,
} from "@/lib/prisma-utils";
import { isCertificateValid } from "@/lib/prisma-virtuals";
import { deepSanitize } from "@/lib/sanitize";
import { withPrismaReadRetry, isTransientPrismaError } from "@/lib/prisma-retry";
import { CertificateTemplateService } from "./certificate-template.service";
import { HoldingTaxService } from "./holding-tax.service";
import type {
  Certificate,
  CertificateTemplate,
  Citizen,
  CertificateType,
  CertificateStatus,
  Prisma,
  PrintHistoryEntry,
} from "@prisma/client";

// Re-export enum values for backward compatibility
export { CertificateType, CertificateStatus } from "@prisma/client";

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

type CertificateSnapshot = {
  name?: string;
  name_en?: string;
  name_bn?: string;
  father_name?: string;
  father_name_en?: string;
  father_name_bn?: string;
  mother_name?: string;
  mother_name_en?: string;
  mother_name_bn?: string;
};

export interface CertificateWithRelations extends Certificate {
  citizen?: Pick<Citizen, "id" | "name" | "nameBn" | "nid" | "fatherName">;
  template?: Pick<CertificateTemplate, "id" | "name" | "nameBn"> | null;
}

const SYSTEM_USER_ID = "000000000000000000000001";

async function logAudit(
  tx: {
    auditLog: {
      create: unknown;
    };
  },
  data: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    description?: string;
    severity?: string;
    changes?: Prisma.InputJsonValue;
  }
): Promise<void> {
  try {
    if (isValidObjectId(data.userId)) {
      const createAuditLog = tx.auditLog.create as (args: {
        data: Record<string, unknown>;
      }) => Promise<unknown>;

      await createAuditLog({
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

function toCertificateSnapshot(data: Record<string, unknown> | undefined): CertificateSnapshot {
  return (data || {}) as CertificateSnapshot;
}

function toMetadataJson(data: Record<string, unknown>): Prisma.InputJsonObject {
  return {
    customFields: data as Prisma.InputJsonObject,
  };
}

function toAuditChangesJson(changes: {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}): Prisma.InputJsonObject {
  return {
    before: changes.before as Prisma.InputJsonObject,
    after: changes.after as Prisma.InputJsonObject,
  };
}

export class CertificateService {
  static async list(status?: CertificateStatus): Promise<CertificateWithRelations[]> {
    const where: Prisma.CertificateWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        citizen: {
          select: { id: true, name: true, nameBn: true, nid: true, fatherName: true },
        },
        template: {
          select: { id: true, name: true, nameBn: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return certificates;
  }

  static async getById(id: string): Promise<CertificateWithRelations | null> {
    if (!isValidObjectId(id)) {
      return null;
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        citizen: {
          select: { id: true, name: true, nameBn: true, nid: true, fatherName: true },
        },
        template: {
          select: { id: true, name: true, nameBn: true },
        },
      },
    });

    return certificate;
  }

  static async getByReferenceNo(referenceNo: string): Promise<CertificateWithRelations | null> {
    const certificate = await prisma.certificate.findFirst({
      where: { referenceNo, deletedAt: null },
      include: {
        citizen: {
          select: { id: true, name: true, nameBn: true, nid: true, fatherName: true },
        },
        template: {
          select: { id: true, name: true, nameBn: true },
        },
      },
    });

    return certificate;
  }

  static async create(
    data: CreateCertificateData,
    userId?: string
  ): Promise<{ success: boolean; certificate?: CertificateWithRelations; message: string }> {
    // Sanitize input
    const sanitizedData = deepSanitize(data);

    if (!isValidObjectId(sanitizedData.citizenId)) {
      return { success: false, message: "Invalid citizen ID" };
    }
    if (!isValidObjectId(sanitizedData.templateId)) {
      return { success: false, message: "Invalid template ID" };
    }

    try {
      const certificate = await prisma.$transaction(async (tx) => {
        const [citizen, template] = await Promise.all([
          withPrismaReadRetry(() =>
            tx.citizen.findUnique({
              where: { id: sanitizedData.citizenId },
            })
          ),
          withPrismaReadRetry(() =>
            tx.certificateTemplate.findUnique({
              where: { id: sanitizedData.templateId },
            })
          ),
        ]);

        if (!citizen) {
          throw new Error("Citizen not found");
        }
        if (!template) {
          throw new Error("Template not found");
        }

        // Generate certificate and reference numbers
        const certificateNo = await generateCertificateNo(tx, sanitizedData.type);
        const referenceNo = await generateCertificateReferenceNo(tx, sanitizedData.type);

        // Generate final text from template
        const finalText = CertificateTemplateService.buildPreviewHtml(
          {
            headerHtml: template.headerHtml,
            bodyHtml: template.bodyHtml,
            footerHtml: template.footerHtml,
            stylesCss: template.stylesCss,
          },
          toCertificateSnapshot(sanitizedData.dataSnapshot)
        );

        const ownerId =
          userId && isValidObjectId(userId) ? userId : SYSTEM_USER_ID;

        const created = await tx.certificate.create({
          data: {
            certificateNo,
            referenceNo,
            type: sanitizedData.type,
            citizenId: sanitizedData.citizenId,
            templateId: sanitizedData.templateId,
            applicantName: (sanitizedData.dataSnapshot?.name as string) || citizen.name,
            applicantNameBn:
              (sanitizedData.dataSnapshot?.name_bn as string) || citizen.nameBn,
            finalText,
            metadata: toMetadataJson(sanitizedData.dataSnapshot),
            status: "PENDING",
            fee: template.fee || 0,
            feeStatus: "UNPAID",
            qrCode: referenceNo,
            verificationUrl: `/verify/${referenceNo}`,
            issuedById: ownerId,
            createdById: ownerId,
            updatedById: ownerId,
          },
          include: {
            citizen: {
              select: { id: true, name: true, nameBn: true, nid: true, fatherName: true },
            },
            template: {
              select: { id: true, name: true, nameBn: true },
            },
          },
        });

        // Log audit
        await logAudit(tx, {
          userId: ownerId,
          action: "CREATE",
          entityType: "CERTIFICATE",
          entityId: created.id,
          entityName: created.applicantName || undefined,
          description: `Certificate draft created: ${certificateNo} for ${citizen.name}`,
          severity: "LOW",
        });

        return created;
      });

      return {
        success: true,
        certificate,
        message: "Certificate draft created successfully",
      };
    } catch (error) {
      if (isTransientPrismaError(error)) {
        return {
          success: false,
          message: "Database connection was interrupted. Please try again.",
        };
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create certificate",
      };
    }
  }

  static async update(
    id: string,
    data: UpdateCertificateData,
    userId?: string
  ): Promise<{ success: boolean; certificate?: CertificateWithRelations; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    // Sanitize input
    const sanitizedData = deepSanitize(data);

    try {
      const certificate = await prisma.$transaction(async (tx) => {
        const existing = await tx.certificate.findUnique({
          where: { id },
          include: {
            template: true,
          },
        });

        if (!existing) {
          throw new Error("Certificate not found");
        }

        if (existing.status === "APPROVED") {
          throw new Error("Approved certificate is locked and cannot be edited");
        }

        // Track changes
        const changes: { before: Record<string, unknown>; after: Record<string, unknown> } = {
          before: {},
          after: {},
        };

        const updateData: Prisma.CertificateUpdateInput = {};

        if (sanitizedData.dataSnapshot && existing.template) {
          const finalText = CertificateTemplateService.buildPreviewHtml(
            {
              headerHtml: existing.template.headerHtml,
              bodyHtml: existing.template.bodyHtml,
              footerHtml: existing.template.footerHtml,
              stylesCss: existing.template.stylesCss,
            },
            toCertificateSnapshot(sanitizedData.dataSnapshot)
          );

          changes.before.dataSnapshot = existing.metadata;
          changes.after.dataSnapshot = sanitizedData.dataSnapshot;

          updateData.metadata = toMetadataJson(sanitizedData.dataSnapshot);
          updateData.finalText = finalText;

          if (sanitizedData.dataSnapshot.name) {
            updateData.applicantName = sanitizedData.dataSnapshot.name as string;
          }
          if (sanitizedData.dataSnapshot.name_bn) {
            updateData.applicantNameBn = sanitizedData.dataSnapshot.name_bn as string;
          }
        }

        if (sanitizedData.finalText) {
          changes.before.finalText = existing.finalText;
          changes.after.finalText = sanitizedData.finalText;
          updateData.finalText = sanitizedData.finalText;
        }

        if (userId && isValidObjectId(userId)) {
          updateData.updatedById = userId;
        }

        await tx.certificate.updateMany({
          where: { id },
          data: updateData,
        });

        const updated = await tx.certificate.findUnique({
          where: { id },
          include: {
            citizen: {
              select: { id: true, name: true, nameBn: true, nid: true, fatherName: true },
            },
            template: {
              select: { id: true, name: true, nameBn: true },
            },
          },
        });

        if (!updated) {
          throw new Error("Certificate not found after update");
        }

        // Log audit
        if (userId && (changes.before.dataSnapshot || changes.before.finalText)) {
          await logAudit(tx, {
            userId,
            action: "UPDATE",
            entityType: "CERTIFICATE",
            entityId: existing.id,
            entityName: existing.applicantName || undefined,
            description: `Certificate updated: ${existing.certificateNo}`,
            severity: "LOW",
            changes: toAuditChangesJson(changes),
          });
        }

        return updated;
      });

      return {
        success: true,
        certificate,
        message: "Certificate updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update certificate",
      };
    }
  }

  static async submit(
    id: string,
    userId?: string
  ): Promise<{ success: boolean; certificate?: CertificateWithRelations; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    try {
      const certificate = await prisma.$transaction(async (tx) => {
        const existing = await tx.certificate.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new Error("Certificate not found");
        }
        if (existing.status === "APPROVED") {
          throw new Error("Approved certificate is already locked");
        }

        const updateData: Prisma.CertificateUpdateInput = {
          status: "PENDING", // Using PENDING as submitted state
        };

        if (userId && isValidObjectId(userId)) {
          updateData.updatedById = userId;
        }

        await tx.certificate.updateMany({
          where: { id },
          data: updateData,
        });

        const updated = await tx.certificate.findUnique({
          where: { id },
          include: {
            citizen: {
              select: { id: true, name: true, nameBn: true, nid: true, fatherName: true },
            },
            template: {
              select: { id: true, name: true, nameBn: true },
            },
          },
        });

        if (!updated) {
          throw new Error("Certificate not found after update");
        }

        // Log audit
        if (userId) {
          await logAudit(tx, {
            userId,
            action: "SUBMIT",
            entityType: "CERTIFICATE",
            entityId: existing.id,
            entityName: existing.applicantName || undefined,
            description: `Certificate submitted for approval: ${existing.certificateNo}`,
            severity: "LOW",
          });
        }

        return updated;
      });

      return {
        success: true,
        certificate,
        message: "Certificate submitted for approval",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to submit certificate",
      };
    }
  }

  static async approve(
    id: string,
    userId?: string
  ): Promise<{ success: boolean; certificate?: CertificateWithRelations; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    try {
      const certificate = await prisma.$transaction(async (tx) => {
        const existing = await tx.certificate.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new Error("Certificate not found");
        }
        if (existing.status === "APPROVED") {
          throw new Error("Certificate already approved");
        }

        const approverId =
          userId && isValidObjectId(userId) ? userId : SYSTEM_USER_ID;
        const verificationPath = `/verify/${existing.referenceNo}`;
        const qrCodeDataUrl = await QRCode.toDataURL(verificationPath);

        const now = new Date();

        await tx.certificate.updateMany({
          where: { id },
          data: {
            status: "APPROVED",
            approvedById: approverId,
            approvedAt: now,
            issuedAt: now,
            verificationUrl: verificationPath,
            qrCode: qrCodeDataUrl,
            updatedById: approverId,
          },
        });

        const updated = await tx.certificate.findUnique({
          where: { id },
          include: {
            citizen: {
              select: { id: true, name: true, nameBn: true, nid: true, fatherName: true },
            },
            template: {
              select: { id: true, name: true, nameBn: true },
            },
          },
        });

        if (!updated) {
          throw new Error("Certificate not found after update");
        }

        // Log audit
        await logAudit(tx, {
          userId: approverId,
          action: "APPROVE",
          entityType: "CERTIFICATE",
          entityId: existing.id,
          entityName: existing.applicantName || undefined,
          description: `Certificate approved: ${existing.certificateNo}`,
          severity: "MEDIUM",
        });

        return updated;
      });

      return {
        success: true,
        certificate,
        message: "Certificate approved and locked",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to approve certificate",
      };
    }
  }

  static async reject(
    id: string,
    reason: string,
    userId?: string
  ): Promise<{ success: boolean; certificate?: CertificateWithRelations; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    try {
      const certificate = await prisma.$transaction(async (tx) => {
        const existing = await tx.certificate.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new Error("Certificate not found");
        }

        if (existing.status === "APPROVED") {
          throw new Error("Cannot reject approved certificate");
        }

        const rejectorId =
          userId && isValidObjectId(userId) ? userId : SYSTEM_USER_ID;

        await tx.certificate.updateMany({
          where: { id },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
            rejectionReason: reason,
            updatedById: rejectorId,
          },
        });

        const updated = await tx.certificate.findUnique({
          where: { id },
          include: {
            citizen: {
              select: { id: true, name: true, nameBn: true, nid: true, fatherName: true },
            },
            template: {
              select: { id: true, name: true, nameBn: true },
            },
          },
        });

        if (!updated) {
          throw new Error("Certificate not found after update");
        }

        // Log audit
        await logAudit(tx, {
          userId: rejectorId,
          action: "REJECT",
          entityType: "CERTIFICATE",
          entityId: existing.id,
          entityName: existing.applicantName || undefined,
          description: `Certificate rejected: ${existing.certificateNo}. Reason: ${reason}`,
          severity: "MEDIUM",
        });

        return updated;
      });

      return {
        success: true,
        certificate,
        message: "Certificate rejected",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to reject certificate",
      };
    }
  }

  static async revoke(
    id: string,
    reason: string,
    userId?: string
  ): Promise<{ success: boolean; certificate?: CertificateWithRelations; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    try {
      const certificate = await prisma.$transaction(async (tx) => {
        const existing = await tx.certificate.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new Error("Certificate not found");
        }

        if (existing.status !== "APPROVED") {
          throw new Error("Only approved certificates can be revoked");
        }

        const revokerId =
          userId && isValidObjectId(userId) ? userId : SYSTEM_USER_ID;

        await tx.certificate.updateMany({
          where: { id },
          data: {
            status: "REVOKED",
            rejectionReason: reason,
            updatedById: revokerId,
          },
        });

        const updated = await tx.certificate.findUnique({
          where: { id },
          include: {
            citizen: {
              select: { id: true, name: true, nameBn: true, nid: true, fatherName: true },
            },
            template: {
              select: { id: true, name: true, nameBn: true },
            },
          },
        });

        if (!updated) {
          throw new Error("Certificate not found after update");
        }

        // Log audit
        await logAudit(tx, {
          userId: revokerId,
          action: "REVOKE",
          entityType: "CERTIFICATE",
          entityId: existing.id,
          entityName: existing.applicantName || undefined,
          description: `Certificate revoked: ${existing.certificateNo}. Reason: ${reason}`,
          severity: "HIGH",
        });

        return updated;
      });

      return {
        success: true,
        certificate,
        message: "Certificate revoked",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to revoke certificate",
      };
    }
  }

  static async verifyByReference(referenceNo: string): Promise<{
    success: boolean;
    valid: boolean;
    certificate?: {
      referenceNo: string;
      certificateNo: string;
      applicantName: string | null;
      type: CertificateType;
      issuedAt: Date;
      status: CertificateStatus;
      finalText: string | null;
      verificationUrl: string | null;
    };
    message: string;
  }> {
    const certificate = await prisma.certificate.findFirst({
      where: { referenceNo, deletedAt: null },
      select: {
        referenceNo: true,
        certificateNo: true,
        applicantName: true,
        type: true,
        issuedAt: true,
        status: true,
        finalText: true,
        verificationUrl: true,
        validUntil: true,
      },
    });

    if (!certificate) {
      return {
        success: true,
        valid: false,
        message: "Certificate not found",
      };
    }

    const isValid = isCertificateValid(certificate.status, certificate.validUntil);

    return {
      success: true,
      valid: isValid,
      certificate: {
        referenceNo: certificate.referenceNo,
        certificateNo: certificate.certificateNo,
        applicantName: certificate.applicantName,
        type: certificate.type,
        issuedAt: certificate.issuedAt,
        status: certificate.status,
        finalText: certificate.finalText,
        verificationUrl: certificate.verificationUrl,
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
      applicantName: string | null;
      certificateType: string;
      issueDate?: string;
      finalText: string | null;
      qrCodeDataUrl?: string | null;
      signatureLabel?: string;
    };
    message: string;
  }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id },
    });

    if (!certificate) {
      return { success: false, message: "Certificate not found" };
    }
    if (certificate.status !== "APPROVED") {
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
        issueDate: certificate.issuedAt ? certificate.issuedAt.toISOString() : undefined,
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
      finalText: string | null;
      applicantName: string | null;
      status: CertificateStatus;
      printCount: number;
      lastPrintedAt?: Date | null;
    };
    message: string;
  }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      select: {
        referenceNo: true,
        finalText: true,
        applicantName: true,
        status: true,
        printCount: true,
        lastPrintedAt: true,
      },
    });

    if (!certificate) {
      return { success: false, message: "Certificate not found" };
    }
    if (certificate.status !== "APPROVED") {
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
        printCount: certificate.printCount,
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
      method: string;
      note?: string | null;
    }>;
    message: string;
  }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      select: {
        printHistory: true,
      },
    });

    if (!certificate) {
      return { success: false, message: "Certificate not found" };
    }

    // For each printHistory entry, fetch the user name if printedById exists
    const history = await Promise.all(
      (certificate.printHistory || []).map(async (entry) => {
        let printedByName: string | undefined;
        if (entry.printedById && isValidObjectId(entry.printedById)) {
          const user = await prisma.user.findUnique({
            where: { id: entry.printedById },
            select: { name: true },
          });
          printedByName = user?.name;
        }

        return {
          printedAt: entry.printedAt,
          printedBy: printedByName,
          method: entry.method || "PRINT",
          note: entry.note,
        };
      })
    );

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
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const certificate = await tx.certificate.findUnique({
          where: { id },
          select: {
            id: true,
            citizenId: true,
            status: true,
            printCount: true,
            printHistory: true,
          },
        });

        if (!certificate) {
          throw new Error("Certificate not found");
        }
        if (certificate.status !== "APPROVED") {
          throw new Error("Only approved certificates can be printed");
        }

        // Check for unpaid tax
        const taxCheck = await HoldingTaxService.checkUnpaidTax(certificate.citizenId);
        if (taxCheck.hasUnpaid) {
          throw new Error("Print is blocked until all holding tax dues are cleared");
        }

        const historyEntry: PrintHistoryEntry = {
          printedAt: new Date(),
          printedById: userId && isValidObjectId(userId) ? userId : null,
          method,
          note: note ?? null,
        };

        const newHistory = [...(certificate.printHistory || []), historyEntry];
        const updateData: Prisma.CertificateUpdateInput = {
          printHistory: newHistory,
        };

        if (method === "PRINT") {
          updateData.printCount = (certificate.printCount || 0) + 1;
          updateData.lastPrintedAt = new Date();
        }

        await tx.certificate.updateMany({
          where: { id },
          data: updateData,
        });

        // Log audit
        if (userId) {
          await logAudit(tx, {
            userId,
            action: "PRINT",
            entityType: "CERTIFICATE",
            entityId: certificate.id,
            description: `Certificate ${method.toLowerCase()}: ${certificate.id}`,
            severity: "LOW",
          });
        }
      });

      return {
        success: true,
        message: method === "PRINT" ? "Print recorded" : "Preview recorded",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to register print",
      };
    }
  }

  static async getByCitizenId(citizenId: string): Promise<CertificateWithRelations[]> {
    if (!isValidObjectId(citizenId)) {
      return [];
    }

    const certificates = await prisma.certificate.findMany({
      where: { citizenId, deletedAt: null },
      include: {
        citizen: {
          select: { id: true, name: true, nameBn: true, nid: true, fatherName: true },
        },
        template: {
          select: { id: true, name: true, nameBn: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return certificates;
  }

  static async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    thisMonth: number;
  }> {
    const [total, byStatus, byType, thisMonth] = await Promise.all([
      prisma.certificate.count({ where: { deletedAt: null } }),
      prisma.certificate.groupBy({
        by: ["status"],
        _count: true,
        where: { deletedAt: null },
      }),
      prisma.certificate.groupBy({
        by: ["type"],
        _count: true,
        where: { deletedAt: null },
      }),
      prisma.certificate.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      byType: Object.fromEntries(byType.map((t) => [t.type, t._count])),
      thisMonth,
    };
  }

  static async delete(id: string, deletedBy?: string): Promise<{ success: boolean; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid certificate ID" };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const certificate = await tx.certificate.findUnique({
          where: { id },
        });

        if (!certificate) {
          throw new Error("Certificate not found");
        }

        if (certificate.status === "APPROVED") {
          throw new Error("Cannot delete approved certificate");
        }

        // Soft delete
        await tx.certificate.updateMany({
          where: { id },
          data: {
            deletedAt: new Date(),
            updatedById: deletedBy,
          },
        });

        // Log audit
        if (deletedBy && isValidObjectId(deletedBy)) {
          await logAudit(tx, {
            userId: deletedBy,
            action: "SOFT_DELETE",
            entityType: "CERTIFICATE",
            entityId: certificate.id,
            entityName: certificate.applicantName || undefined,
            description: `Certificate deleted: ${certificate.certificateNo}`,
            severity: "MEDIUM",
          });
        }
      });

      return { success: true, message: "Certificate deleted successfully" };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete certificate",
      };
    }
  }
}
