import mongoose, { Schema, Document, Model } from "mongoose";

export enum CertificateType {
  BIRTH = "BIRTH",
  DEATH = "DEATH",
  CITIZENSHIP = "CITIZENSHIP",
  CHARACTER = "CHARACTER",
  INHERITORSHIP = "INHERITORSHIP",
  TRADE_LICENSE = "TRADE_LICENSE",
  NOC = "NOC",
  MARITAL_STATUS = "MARITAL_STATUS",
  INCOME = "INCOME",
  RESIDENCE = "RESIDENCE",
  FAMILY_MEMBER = "FAMILY_MEMBER",
  LAND_POSSESSION = "LAND_POSSESSION",
}

export enum CertificateStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  REVOKED = "REVOKED",
  EXPIRED = "EXPIRED",
}

export interface ICertificateMetadata {
  // Birth certificate
  birthPlace?: string;
  birthTime?: string;
  birthOrder?: number;
  hospitalName?: string;

  // Death certificate
  deathDate?: Date;
  deathPlace?: string;
  causeOfDeath?: string;
  deathRegistrationNo?: string;

  // Trade license
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  tradeCategory?: string;
  licenseCategory?: string;

  // Character certificate
  purpose?: string;
  validityPeriod?: number;

  // Inheritorship
  deceasedName?: string;
  deceasedNid?: string;
  deceasedDeathDate?: Date;
  heirs?: Array<{
    name: string;
    relation: string;
    share?: string;
    nid?: string;
  }>;

  // NOC
  nocType?: string;
  nocPurpose?: string;

  // Income certificate
  annualIncome?: number;
  incomeSource?: string;

  // General
  witnesses?: Array<{
    name: string;
    nid?: string;
    address?: string;
  }>;
  additionalInfo?: Record<string, unknown>;
}

export interface ICertificate extends Document {
  _id: mongoose.Types.ObjectId;
  certificateNo: string;
  referenceNo: string;
  type: CertificateType;
  citizen: mongoose.Types.ObjectId;
  applicantName: string;
  applicantNameBn?: string;
  finalText: string;
  dataSnapshot: Record<string, unknown>;
  applicationDate: Date;
  issueDate?: Date;
  validFrom?: Date;
  validUntil?: Date;
  status: CertificateStatus;
  metadata: ICertificateMetadata;
  fee: number;
  feeReceiptNo?: string;
  feePaid: boolean;
  template?: mongoose.Types.ObjectId;
  qrCode: string;
  qrData: string;
  verificationUrl: string;
  printCount: number;
  lastPrintedAt?: Date;
  printHistory: Array<{
    printedAt: Date;
    printedBy?: mongoose.Types.ObjectId;
    method: "PREVIEW" | "PRINT";
    note?: string;
  }>;
  issuedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  revokedBy?: mongoose.Types.ObjectId;
  revokedAt?: Date;
  revocationReason?: string;
  remarks?: string;
  attachments?: string[];
  unionParishad?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const CertificateMetadataSchema = new Schema<ICertificateMetadata>(
  {
    birthPlace: { type: String },
    birthTime: { type: String },
    birthOrder: { type: Number },
    hospitalName: { type: String },
    deathDate: { type: Date },
    deathPlace: { type: String },
    causeOfDeath: { type: String },
    deathRegistrationNo: { type: String },
    businessName: { type: String },
    businessType: { type: String },
    businessAddress: { type: String },
    tradeCategory: { type: String },
    licenseCategory: { type: String },
    purpose: { type: String },
    validityPeriod: { type: Number },
    deceasedName: { type: String },
    deceasedNid: { type: String },
    deceasedDeathDate: { type: Date },
    heirs: [{
      name: { type: String, required: true },
      relation: { type: String, required: true },
      share: { type: String },
      nid: { type: String },
    }],
    nocType: { type: String },
    nocPurpose: { type: String },
    annualIncome: { type: Number },
    incomeSource: { type: String },
    witnesses: [{
      name: { type: String, required: true },
      nid: { type: String },
      address: { type: String },
    }],
    additionalInfo: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const CertificateSchema = new Schema<ICertificate>(
  {
    certificateNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    referenceNo: {
      type: String,
      required: [true, "Reference number is required"],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Certificate type is required"],
      enum: Object.values(CertificateType),
    },
    citizen: {
      type: Schema.Types.ObjectId,
      ref: "Citizen",
      required: [true, "Citizen is required"],
    },
    applicantName: {
      type: String,
      required: [true, "Applicant name is required"],
      trim: true,
    },
    applicantNameBn: {
      type: String,
      trim: true,
    },
    finalText: {
      type: String,
      required: [true, "Final text is required"],
    },
    dataSnapshot: {
      type: Schema.Types.Mixed,
      required: [true, "Data snapshot is required"],
      default: {},
    },
    applicationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    issueDate: {
      type: Date,
    },
    validFrom: {
      type: Date,
    },
    validUntil: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(CertificateStatus),
      default: CertificateStatus.PENDING,
    },
    metadata: {
      type: CertificateMetadataSchema,
      default: {},
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
    feeReceiptNo: {
      type: String,
      trim: true,
    },
    feePaid: {
      type: Boolean,
      default: false,
    },
    template: {
      type: Schema.Types.ObjectId,
      ref: "CertificateTemplate",
    },
    qrCode: {
      type: String,
      required: true,
    },
    qrData: {
      type: String,
      required: true,
    },
    verificationUrl: {
      type: String,
      required: true,
    },
    printCount: {
      type: Number,
      default: 0,
    },
    lastPrintedAt: {
      type: Date,
    },
    printHistory: [
      {
        printedAt: { type: Date, required: true, default: Date.now },
        printedBy: { type: Schema.Types.ObjectId, ref: "User" },
        method: { type: String, enum: ["PREVIEW", "PRINT"], required: true },
        note: { type: String },
      },
    ],
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    revokedAt: {
      type: Date,
    },
    revocationReason: {
      type: String,
    },
    remarks: {
      type: String,
    },
    attachments: [{
      type: String,
    }],
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
CertificateSchema.index({ certificateNo: 1 }, { unique: true });
CertificateSchema.index({ referenceNo: 1 }, { unique: true });
CertificateSchema.index({ citizen: 1 });
CertificateSchema.index({ type: 1 });
CertificateSchema.index({ status: 1 });
CertificateSchema.index({ applicationDate: -1 });
CertificateSchema.index({ issueDate: -1 });
CertificateSchema.index({ qrCode: 1 });
CertificateSchema.index({ deletedAt: 1 });
CertificateSchema.index({ unionParishad: 1 });
CertificateSchema.index({ feeReceiptNo: 1 }, { sparse: true });

// Compound indexes
CertificateSchema.index({ citizen: 1, type: 1 });
CertificateSchema.index({ type: 1, status: 1 });
CertificateSchema.index({ unionParishad: 1, type: 1, status: 1 });

// Soft delete filter
CertificateSchema.pre("find", function () {
  this.where({ deletedAt: null });
});

CertificateSchema.pre("findOne", function () {
  this.where({ deletedAt: null });
});

// Make certificate immutable after approval - validation happens via methods
// The approve() method locks the certificate after approval

// Virtual for validity status
CertificateSchema.virtual("isValid").get(function () {
  if (this.status !== CertificateStatus.APPROVED) return false;
  if (this.validUntil && new Date() > this.validUntil) return false;
  return true;
});

// Methods
CertificateSchema.methods.approve = async function (
  approvedBy: mongoose.Types.ObjectId
): Promise<ICertificate> {
  this.status = CertificateStatus.APPROVED;
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.issueDate = new Date();
  return this.save();
};

CertificateSchema.methods.reject = async function (
  rejectedBy: mongoose.Types.ObjectId,
  reason: string
): Promise<ICertificate> {
  this.status = CertificateStatus.REJECTED;
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

CertificateSchema.methods.revoke = async function (
  revokedBy: mongoose.Types.ObjectId,
  reason: string
): Promise<ICertificate> {
  this.status = CertificateStatus.REVOKED;
  this.revokedBy = revokedBy;
  this.revokedAt = new Date();
  this.revocationReason = reason;
  return this.save();
};

CertificateSchema.methods.softDelete = async function (): Promise<ICertificate> {
  // Prevent deletion of approved certificates
  if (this.status === CertificateStatus.APPROVED) {
    throw new Error("Cannot delete approved certificate");
  }
  this.deletedAt = new Date();
  return this.save();
};

// Static method to generate certificate number
CertificateSchema.statics.generateCertificateNo = async function (
  type: CertificateType,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const typeCode = type.substring(0, 3).toUpperCase();
  const prefix = `${typeCode}-${currentYear}`;
  const count = await this.countDocuments({
    certificateNo: { $regex: `^${prefix}` },
  });
  return `${prefix}-${(count + 1).toString().padStart(6, "0")}`;
};

export const Certificate: Model<ICertificate> =
  mongoose.models.Certificate || mongoose.model<ICertificate>("Certificate", CertificateSchema);

export default Certificate;
