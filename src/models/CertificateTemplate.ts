import mongoose, { Schema, Document, Model } from "mongoose";
import { CertificateType } from "./Certificate";
import { SUPPORTED_CERTIFICATE_PLACEHOLDERS } from "@/lib/certificate-template";

export enum TemplateStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DRAFT = "DRAFT",
}

export interface ITemplateField {
  name: string;
  label: string;
  labelBn?: string;
  type: "text" | "number" | "date" | "select" | "textarea" | "checkbox";
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  defaultValue?: string | number | boolean;
  order: number;
}

export interface ICertificateTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  nameEn: string;
  nameBn: string;
  certificateType: CertificateType;
  description?: string;
  version: number;
  status: TemplateStatus;
  fee: number;
  validityDays?: number;
  headerHtml?: string;
  bodyHtml: string;
  footerHtml?: string;
  stylesCss?: string;
  fields: ITemplateField[];
  placeholders: string[];
  paperSize: string;
  orientation: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  showQrCode: boolean;
  qrPosition: string;
  showLogo: boolean;
  showSeal: boolean;
  showWatermark: boolean;
  watermarkText?: string;
  showBorder: boolean;
  borderStyle?: string;
  isDefault: boolean;
  unionParishad?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const TemplateFieldSchema = new Schema<ITemplateField>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    labelBn: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["text", "number", "date", "select", "textarea", "checkbox"],
    },
    required: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
    },
    options: [{
      type: String,
    }],
    validation: {
      minLength: { type: Number },
      maxLength: { type: Number },
      min: { type: Number },
      max: { type: Number },
      pattern: { type: String },
    },
    defaultValue: {
      type: Schema.Types.Mixed,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const CertificateTemplateSchema = new Schema<ICertificateTemplate>(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
    },
    nameEn: {
      type: String,
      required: [true, "English name is required"],
      trim: true,
    },
    nameBn: {
      type: String,
      required: [true, "Bengali name is required"],
      trim: true,
    },
    certificateType: {
      type: String,
      required: [true, "Certificate type is required"],
      enum: Object.values(CertificateType),
    },
    description: {
      type: String,
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: Object.values(TemplateStatus),
      default: TemplateStatus.DRAFT,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    validityDays: {
      type: Number,
      min: 0,
    },
    headerHtml: {
      type: String,
    },
    bodyHtml: {
      type: String,
      required: [true, "Body HTML is required"],
    },
    footerHtml: {
      type: String,
    },
    stylesCss: {
      type: String,
    },
    fields: [TemplateFieldSchema],
    placeholders: [{
      type: String,
    }],
    paperSize: {
      type: String,
      default: "A4",
      enum: ["A4", "A5", "Letter", "Legal"],
    },
    orientation: {
      type: String,
      default: "portrait",
      enum: ["portrait", "landscape"],
    },
    marginTop: {
      type: Number,
      default: 20,
    },
    marginBottom: {
      type: Number,
      default: 20,
    },
    marginLeft: {
      type: Number,
      default: 20,
    },
    marginRight: {
      type: Number,
      default: 20,
    },
    showQrCode: {
      type: Boolean,
      default: true,
    },
    qrPosition: {
      type: String,
      default: "bottom-right",
      enum: ["top-left", "top-right", "bottom-left", "bottom-right", "center"],
    },
    showLogo: {
      type: Boolean,
      default: true,
    },
    showSeal: {
      type: Boolean,
      default: true,
    },
    showWatermark: {
      type: Boolean,
      default: false,
    },
    watermarkText: {
      type: String,
    },
    showBorder: {
      type: Boolean,
      default: true,
    },
    borderStyle: {
      type: String,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    unionParishad: {
      type: Schema.Types.ObjectId,
      ref: "UnionParishad",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
CertificateTemplateSchema.index({ certificateType: 1 });
CertificateTemplateSchema.index({ status: 1 });
CertificateTemplateSchema.index({ isDefault: 1 });
CertificateTemplateSchema.index({ deletedAt: 1 });
CertificateTemplateSchema.index({ unionParishad: 1 });

// Compound indexes
CertificateTemplateSchema.index({ certificateType: 1, isDefault: 1 });
CertificateTemplateSchema.index({ certificateType: 1, status: 1 });

// Soft delete filter
CertificateTemplateSchema.pre("find", function () {
  this.where({ deletedAt: null });
});

CertificateTemplateSchema.pre("findOne", function () {
  this.where({ deletedAt: null });
});

// Ensure only one default template per type
CertificateTemplateSchema.pre("save", async function () {
  if (this.isDefault && this.isModified("isDefault")) {
    await mongoose.model("CertificateTemplate").updateMany(
      {
        certificateType: this.certificateType,
        _id: { $ne: this._id },
        deletedAt: null,
      },
      { isDefault: false }
    );
  }
});

// Extract placeholders from HTML
CertificateTemplateSchema.pre("save", function () {
  const fullHtml = `${this.headerHtml || ""}${this.bodyHtml}${this.footerHtml || ""}`;
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  while ((match = placeholderRegex.exec(fullHtml)) !== null) {
    const key = match[1].trim();
    if (SUPPORTED_CERTIFICATE_PLACEHOLDERS.includes(key as (typeof SUPPORTED_CERTIFICATE_PLACEHOLDERS)[number])) {
      if (!placeholders.includes(key)) {
        placeholders.push(key);
      }
    }
  }
  this.placeholders = placeholders;
});

// Methods
CertificateTemplateSchema.methods.softDelete = function (): Promise<ICertificateTemplate> {
  this.deletedAt = new Date();
  return this.save();
};

CertificateTemplateSchema.methods.duplicate = async function (): Promise<ICertificateTemplate> {
  const duplicate = new (mongoose.model("CertificateTemplate"))({
    ...this.toObject(),
    _id: undefined,
    name: `${this.name} (Copy)`,
    nameEn: `${this.nameEn} (Copy)`,
    nameBn: `${this.nameBn} (কপি)`,
    status: TemplateStatus.DRAFT,
    isDefault: false,
    version: 1,
    createdAt: undefined,
    updatedAt: undefined,
  });
  return duplicate.save();
};

export const CertificateTemplate: Model<ICertificateTemplate> =
  mongoose.models.CertificateTemplate ||
  mongoose.model<ICertificateTemplate>("CertificateTemplate", CertificateTemplateSchema);

export default CertificateTemplate;
