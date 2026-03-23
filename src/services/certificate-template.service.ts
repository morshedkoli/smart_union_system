import { prisma } from "@/lib/db";
import { isValidObjectId } from "@/lib/prisma-utils";
import {
  SUPPORTED_CERTIFICATE_PLACEHOLDERS,
  SupportedCertificatePlaceholder,
} from "@/lib/certificate-template";
import { withPrismaReadRetry } from "@/lib/prisma-retry";
import type { CertificateTemplate, CertificateType, TemplateStatus, Prisma } from "@prisma/client";

// Re-export enum values for backward compatibility
export { CertificateType, TemplateStatus } from "@prisma/client";

export interface CertificateTemplateUpsertData {
  name: string;
  nameEn: string;
  nameBn: string;
  certificateType: CertificateType;
  bodyHtml: string;
  headerHtml?: string;
  footerHtml?: string;
  stylesCss?: string;
  fee?: number;
  status?: TemplateStatus;
  isDefault?: boolean;
}

export interface CertificatePreviewData {
  name?: string;
  name_en?: string;
  name_bn?: string;
  father_name?: string;
  father_name_en?: string;
  father_name_bn?: string;
  mother_name?: string;
  mother_name_en?: string;
  mother_name_bn?: string;
}

function extractPlaceholders(content: {
  headerHtml?: string;
  bodyHtml: string;
  footerHtml?: string;
}): string[] {
  const fullHtml = `${content.headerHtml || ""}${content.bodyHtml}${content.footerHtml || ""}`;
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null = null;

  while ((match = placeholderRegex.exec(fullHtml)) !== null) {
    found.add(match[1].trim());
  }

  return Array.from(found);
}

function validateTemplatePlaceholders(content: {
  headerHtml?: string;
  bodyHtml: string;
  footerHtml?: string;
}): { valid: boolean; invalidPlaceholders: string[] } {
  const used = extractPlaceholders(content);
  const invalidPlaceholders = used.filter(
    (item) =>
      !SUPPORTED_CERTIFICATE_PLACEHOLDERS.includes(item as SupportedCertificatePlaceholder)
  );
  return {
    valid: invalidPlaceholders.length === 0,
    invalidPlaceholders,
  };
}

export class CertificateTemplateService {
  static async list(status?: TemplateStatus): Promise<CertificateTemplate[]> {
    const where: Prisma.CertificateTemplateWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const templates = await prisma.certificateTemplate.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
    return templates;
  }

  static async getById(id: string): Promise<CertificateTemplate | null> {
    if (!isValidObjectId(id)) {
      return null;
    }

    const template = await withPrismaReadRetry(() =>
      prisma.certificateTemplate.findUnique({
        where: { id },
      })
    );
    return template;
  }

  static async getByType(certificateType: CertificateType): Promise<CertificateTemplate[]> {
    const templates = await prisma.certificateTemplate.findMany({
      where: {
        certificateType,
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
    });
    return templates;
  }

  static async getDefaultByType(certificateType: CertificateType): Promise<CertificateTemplate | null> {
    const template = await prisma.certificateTemplate.findFirst({
      where: {
        certificateType,
        isDefault: true,
        status: "ACTIVE",
        deletedAt: null,
      },
    });
    return template;
  }

  static async create(
    data: CertificateTemplateUpsertData,
    createdBy?: string
  ): Promise<{ success: boolean; template?: CertificateTemplate; message: string }> {
    if (!data.name || !data.nameEn || !data.nameBn || !data.bodyHtml || !data.certificateType) {
      return { success: false, message: "Missing required fields" };
    }

    const placeholderValidation = validateTemplatePlaceholders({
      headerHtml: data.headerHtml,
      bodyHtml: data.bodyHtml,
      footerHtml: data.footerHtml,
    });
    if (!placeholderValidation.valid) {
      return {
        success: false,
        message: `Unsupported placeholders found: ${placeholderValidation.invalidPlaceholders.join(", ")}`,
      };
    }

    try {
      const template = await prisma.$transaction(async (tx) => {
        // If setting as default, unset other defaults for this type
        if (data.isDefault) {
          await tx.certificateTemplate.updateMany({
            where: {
              certificateType: data.certificateType,
              isDefault: true,
              deletedAt: null,
            },
            data: { isDefault: false },
          });
        }

        const placeholders = extractPlaceholders({
          headerHtml: data.headerHtml,
          bodyHtml: data.bodyHtml,
          footerHtml: data.footerHtml,
        });

        const created = await tx.certificateTemplate.create({
          data: {
            name: data.name,
            nameEn: data.nameEn,
            nameBn: data.nameBn,
            certificateType: data.certificateType,
            bodyHtml: data.bodyHtml,
            headerHtml: data.headerHtml,
            footerHtml: data.footerHtml,
            stylesCss: data.stylesCss,
            fee: data.fee ?? 0,
            status: data.status ?? "DRAFT",
            isDefault: data.isDefault ?? false,
            placeholders,
            createdById: createdBy,
            updatedById: createdBy,
          },
        });

        // Log audit
        if (createdBy && isValidObjectId(createdBy)) {
          await tx.auditLog.create({
            data: {
              userId: createdBy,
              action: "CREATE",
              entityType: "CERTIFICATE_TEMPLATE",
              entityId: created.id,
              entityName: created.name,
              description: `Certificate template created: ${created.name}`,
              severity: "LOW",
            },
          });
        }

        return created;
      });

      return {
        success: true,
        template,
        message: "Template created successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create template",
      };
    }
  }

  static async update(
    id: string,
    data: Partial<CertificateTemplateUpsertData>,
    updatedBy?: string
  ): Promise<{ success: boolean; template?: CertificateTemplate; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid template ID" };
    }

    try {
      const template = await prisma.$transaction(async (tx) => {
        const existing = await tx.certificateTemplate.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new Error("Template not found");
        }

        const nextContent = {
          headerHtml: data.headerHtml ?? existing.headerHtml ?? undefined,
          bodyHtml: data.bodyHtml ?? existing.bodyHtml,
          footerHtml: data.footerHtml ?? existing.footerHtml ?? undefined,
        };
        const placeholderValidation = validateTemplatePlaceholders(nextContent);
        if (!placeholderValidation.valid) {
          throw new Error(
            `Unsupported placeholders found: ${placeholderValidation.invalidPlaceholders.join(", ")}`
          );
        }

        // Track changes for audit
        const changes: { before: Record<string, unknown>; after: Record<string, unknown> } = {
          before: {},
          after: {},
        };

        const updateData: Prisma.CertificateTemplateUpdateInput = {
          updatedById: updatedBy,
        };

        if (data.name !== undefined) {
          changes.before.name = existing.name;
          changes.after.name = data.name;
          updateData.name = data.name;
        }
        if (data.nameEn !== undefined) {
          changes.before.nameEn = existing.nameEn;
          changes.after.nameEn = data.nameEn;
          updateData.nameEn = data.nameEn;
        }
        if (data.nameBn !== undefined) {
          changes.before.nameBn = existing.nameBn;
          changes.after.nameBn = data.nameBn;
          updateData.nameBn = data.nameBn;
        }
        if (data.certificateType !== undefined) {
          changes.before.certificateType = existing.certificateType;
          changes.after.certificateType = data.certificateType;
          updateData.certificateType = data.certificateType;
        }
        if (data.bodyHtml !== undefined) {
          changes.before.bodyHtml = existing.bodyHtml;
          changes.after.bodyHtml = data.bodyHtml;
          updateData.bodyHtml = data.bodyHtml;
        }
        if (data.headerHtml !== undefined) {
          changes.before.headerHtml = existing.headerHtml;
          changes.after.headerHtml = data.headerHtml;
          updateData.headerHtml = data.headerHtml;
        }
        if (data.footerHtml !== undefined) {
          changes.before.footerHtml = existing.footerHtml;
          changes.after.footerHtml = data.footerHtml;
          updateData.footerHtml = data.footerHtml;
        }
        if (data.stylesCss !== undefined) {
          changes.before.stylesCss = existing.stylesCss;
          changes.after.stylesCss = data.stylesCss;
          updateData.stylesCss = data.stylesCss;
        }
        if (data.fee !== undefined) {
          changes.before.fee = existing.fee;
          changes.after.fee = data.fee;
          updateData.fee = data.fee;
        }
        if (data.status !== undefined) {
          changes.before.status = existing.status;
          changes.after.status = data.status;
          updateData.status = data.status;
        }
        if (data.isDefault !== undefined) {
          changes.before.isDefault = existing.isDefault;
          changes.after.isDefault = data.isDefault;
          updateData.isDefault = data.isDefault;

          // If setting as default, unset other defaults for this type
          if (data.isDefault) {
            const targetType = data.certificateType ?? existing.certificateType;
            await tx.certificateTemplate.updateMany({
              where: {
                certificateType: targetType,
                isDefault: true,
                id: { not: id },
                deletedAt: null,
              },
              data: { isDefault: false },
            });
          }
        }

        // Update placeholders if content changed
        if (data.bodyHtml || data.headerHtml || data.footerHtml) {
          const placeholders = extractPlaceholders(nextContent);
          updateData.placeholders = placeholders;
        }

        await tx.certificateTemplate.updateMany({
          where: { id },
          data: updateData,
        });

        const updated = await tx.certificateTemplate.findUnique({
          where: { id },
        });

        if (!updated) {
          throw new Error("Template not found after update");
        }

        // Log audit
        if (updatedBy && isValidObjectId(updatedBy) && Object.keys(changes.before).length > 0) {
          await tx.auditLog.create({
            data: {
              userId: updatedBy,
              action: "UPDATE",
              entityType: "CERTIFICATE_TEMPLATE",
              entityId: existing.id,
              entityName: existing.name,
              description: `Certificate template updated: ${existing.name}`,
              severity: "LOW",
              changes: changes as Prisma.InputJsonObject,
            },
          });
        }

        return updated;
      });

      return {
        success: true,
        template,
        message: "Template updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update template",
      };
    }
  }

  static async delete(id: string, deletedBy?: string): Promise<{ success: boolean; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid template ID" };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const template = await tx.certificateTemplate.findUnique({
          where: { id },
        });

        if (!template) {
          throw new Error("Template not found");
        }

        // Soft delete
        await tx.certificateTemplate.updateMany({
          where: { id },
          data: {
            deletedAt: new Date(),
            updatedById: deletedBy,
          },
        });

        // Log audit
        if (deletedBy && isValidObjectId(deletedBy)) {
          await tx.auditLog.create({
            data: {
              userId: deletedBy,
              action: "SOFT_DELETE",
              entityType: "CERTIFICATE_TEMPLATE",
              entityId: template.id,
              entityName: template.name,
              description: `Certificate template deleted: ${template.name}`,
              severity: "MEDIUM",
            },
          });
        }
      });

      return { success: true, message: "Template deleted successfully" };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete template",
      };
    }
  }

  static buildPreviewHtml(
    content: {
      bodyHtml: string;
      headerHtml?: string | null;
      footerHtml?: string | null;
      stylesCss?: string | null;
    },
    previewData: CertificatePreviewData
  ): string {
    const placeholderValidation = validateTemplatePlaceholders({
      headerHtml: content.headerHtml ?? undefined,
      bodyHtml: content.bodyHtml,
      footerHtml: content.footerHtml ?? undefined,
    });
    if (!placeholderValidation.valid) {
      throw new Error(
        `Unsupported placeholders found: ${placeholderValidation.invalidPlaceholders.join(", ")}`
      );
    }

    const defaultData: Record<SupportedCertificatePlaceholder, string> = {
      name: "Rahim Uddin",
      name_en: "Rahim Uddin",
      name_bn: "রহিম উদ্দিন",
      father_name: "Karim Uddin",
      father_name_en: "Karim Uddin",
      father_name_bn: "করিম উদ্দিন",
      mother_name: "Amena Begum",
      mother_name_en: "Amena Begum",
      mother_name_bn: "আমেনা বেগম",
    };

    const mergedData: Record<SupportedCertificatePlaceholder, string> = {
      name: previewData.name?.trim() || defaultData.name,
      name_en: previewData.name_en?.trim() || previewData.name?.trim() || defaultData.name_en,
      name_bn: previewData.name_bn?.trim() || defaultData.name_bn,
      father_name: previewData.father_name?.trim() || defaultData.father_name,
      father_name_en:
        previewData.father_name_en?.trim() ||
        previewData.father_name?.trim() ||
        defaultData.father_name_en,
      father_name_bn: previewData.father_name_bn?.trim() || defaultData.father_name_bn,
      mother_name: previewData.mother_name?.trim() || defaultData.mother_name,
      mother_name_en:
        previewData.mother_name_en?.trim() ||
        previewData.mother_name?.trim() ||
        defaultData.mother_name_en,
      mother_name_bn: previewData.mother_name_bn?.trim() || defaultData.mother_name_bn,
    };

    const replacePlaceholders = (input: string): string => {
      return input.replace(/\{\{\s*([^}]+)\s*\}\}/g, (fullMatch, placeholder: string) => {
        const key = placeholder.trim() as SupportedCertificatePlaceholder;
        if (SUPPORTED_CERTIFICATE_PLACEHOLDERS.includes(key)) {
          return mergedData[key];
        }
        return fullMatch;
      });
    };

    const fullHtml = `${content.headerHtml || ""}${content.bodyHtml}${content.footerHtml || ""}`;
    const renderedHtml = replacePlaceholders(fullHtml);

    if (content.stylesCss?.trim()) {
      return `<style>${content.stylesCss}</style>${renderedHtml}`;
    }

    return renderedHtml;
  }

  static async previewByTemplateId(
    templateId: string,
    previewData: CertificatePreviewData
  ): Promise<{ success: boolean; previewHtml?: string; message: string }> {
    const template = await this.getById(templateId);
    if (!template) {
      return { success: false, message: "Template not found" };
    }

    try {
      const previewHtml = this.buildPreviewHtml(
        {
          headerHtml: template.headerHtml,
          bodyHtml: template.bodyHtml,
          footerHtml: template.footerHtml,
          stylesCss: template.stylesCss,
        },
        previewData
      );

      return {
        success: true,
        previewHtml,
        message: "Preview generated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to generate preview",
      };
    }
  }

  static async setAsDefault(
    id: string,
    updatedBy?: string
  ): Promise<{ success: boolean; template?: CertificateTemplate; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid template ID" };
    }

    try {
      const template = await prisma.$transaction(async (tx) => {
        const existing = await tx.certificateTemplate.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new Error("Template not found");
        }

        // Unset other defaults for this type
        await tx.certificateTemplate.updateMany({
          where: {
            certificateType: existing.certificateType,
            isDefault: true,
            id: { not: id },
            deletedAt: null,
          },
          data: { isDefault: false },
        });

        // Set this one as default
        await tx.certificateTemplate.updateMany({
          where: { id },
          data: {
            isDefault: true,
            updatedById: updatedBy,
          },
        });

        const updated = await tx.certificateTemplate.findUnique({
          where: { id },
        });

        if (!updated) {
          throw new Error("Template not found after update");
        }

        // Log audit
        if (updatedBy && isValidObjectId(updatedBy)) {
          await tx.auditLog.create({
            data: {
              userId: updatedBy,
              action: "UPDATE",
              entityType: "CERTIFICATE_TEMPLATE",
              entityId: existing.id,
              entityName: existing.name,
              description: `Certificate template set as default: ${existing.name}`,
              severity: "LOW",
            },
          });
        }

        return updated;
      });

      return {
        success: true,
        template,
        message: "Template set as default successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to set template as default",
      };
    }
  }

  static async activate(
    id: string,
    updatedBy?: string
  ): Promise<{ success: boolean; template?: CertificateTemplate; message: string }> {
    return this.update(id, { status: "ACTIVE" }, updatedBy);
  }

  static async deactivate(
    id: string,
    updatedBy?: string
  ): Promise<{ success: boolean; template?: CertificateTemplate; message: string }> {
    return this.update(id, { status: "INACTIVE" }, updatedBy);
  }
}
