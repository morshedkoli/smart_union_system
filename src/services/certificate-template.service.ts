import mongoose from "mongoose";
import {
  CertificateTemplate,
  ICertificateTemplate,
  CertificateType,
  TemplateStatus,
} from "@/models";
import { connectDB } from "@/lib/mongodb";
import {
  SUPPORTED_CERTIFICATE_PLACEHOLDERS,
  SupportedCertificatePlaceholder,
} from "@/lib/certificate-template";

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
  father_name?: string;
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
  static async list(): Promise<ICertificateTemplate[]> {
    await connectDB();
    const templates = await CertificateTemplate.find().sort({ updatedAt: -1 }).lean();
    return templates as ICertificateTemplate[];
  }

  static async getById(id: string): Promise<ICertificateTemplate | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const template = await CertificateTemplate.findById(id).lean();
    return template as ICertificateTemplate | null;
  }

  static async create(
    data: CertificateTemplateUpsertData
  ): Promise<{ success: boolean; template?: ICertificateTemplate; message: string }> {
    await connectDB();

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

    const template = await CertificateTemplate.create({
      ...data,
      fee: data.fee ?? 0,
      status: data.status ?? TemplateStatus.DRAFT,
      isDefault: data.isDefault ?? false,
    });

    return {
      success: true,
      template: template.toObject() as ICertificateTemplate,
      message: "Template created successfully",
    };
  }

  static async update(
    id: string,
    data: Partial<CertificateTemplateUpsertData>
  ): Promise<{ success: boolean; template?: ICertificateTemplate; message: string }> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: "Invalid template ID" };
    }

    const template = await CertificateTemplate.findById(id);
    if (!template) {
      return { success: false, message: "Template not found" };
    }

    const nextContent = {
      headerHtml: data.headerHtml ?? template.headerHtml,
      bodyHtml: data.bodyHtml ?? template.bodyHtml,
      footerHtml: data.footerHtml ?? template.footerHtml,
    };
    const placeholderValidation = validateTemplatePlaceholders(nextContent);
    if (!placeholderValidation.valid) {
      return {
        success: false,
        message: `Unsupported placeholders found: ${placeholderValidation.invalidPlaceholders.join(", ")}`,
      };
    }

    Object.assign(template, data);
    await template.save();

    return {
      success: true,
      template: template.toObject() as ICertificateTemplate,
      message: "Template updated successfully",
    };
  }

  static buildPreviewHtml(
    content: {
      bodyHtml: string;
      headerHtml?: string;
      footerHtml?: string;
      stylesCss?: string;
    },
    previewData: CertificatePreviewData
  ): string {
    const placeholderValidation = validateTemplatePlaceholders(content);
    if (!placeholderValidation.valid) {
      throw new Error(
        `Unsupported placeholders found: ${placeholderValidation.invalidPlaceholders.join(", ")}`
      );
    }

    const defaultData: Record<SupportedCertificatePlaceholder, string> = {
      name: "Rahim Uddin",
      father_name: "Karim Uddin",
    };

    const mergedData: Record<SupportedCertificatePlaceholder, string> = {
      name: previewData.name?.trim() || defaultData.name,
      father_name: previewData.father_name?.trim() || defaultData.father_name,
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

    return {
      success: true,
      previewHtml: this.buildPreviewHtml(
        {
          headerHtml: template.headerHtml,
          bodyHtml: template.bodyHtml,
          footerHtml: template.footerHtml,
          stylesCss: template.stylesCss,
        },
        previewData
      ),
      message: "Preview generated successfully",
    };
  }
}

