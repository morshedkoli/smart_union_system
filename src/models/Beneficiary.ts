import mongoose, { Schema, Document, Model } from "mongoose";

export enum BeneficiaryStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  COMPLETED = "COMPLETED",
  WITHDRAWN = "WITHDRAWN",
}

export enum DistributionStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  DISTRIBUTED = "DISTRIBUTED",
  PARTIAL = "PARTIAL",
  FAILED = "FAILED",
  RETURNED = "RETURNED",
}

export interface IDistribution {
  _id: mongoose.Types.ObjectId;
  distributionNo: string;
  scheduledDate: Date;
  distributedDate?: Date;
  status: DistributionStatus;
  amount?: number;
  items?: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  collectedBy?: string;
  collectorNid?: string;
  collectorRelation?: string;
  collectorSignature?: string;
  distributedBy?: mongoose.Types.ObjectId;
  receiptNo?: string;
  remarks?: string;
  photo?: string;
}

export interface IBeneficiary extends Document {
  _id: mongoose.Types.ObjectId;
  beneficiaryNo: string;
  program: mongoose.Types.ObjectId;
  citizen: mongoose.Types.ObjectId;
  applicationDate: Date;
  status: BeneficiaryStatus;
  priorityScore?: number;
  priorityReason?: string;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  totalEntitlement: number;
  totalReceived: number;
  remainingEntitlement: number;
  distributions: IDistribution[];
  lastDistributionDate?: Date;
  nextDistributionDate?: Date;
  bankAccount?: {
    bankName: string;
    branchName: string;
    accountNo: string;
    accountName: string;
  };
  mobileBanking?: {
    provider: string;
    accountNo: string;
  };
  nomineeNid?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineePhone?: string;
  documents?: string[];
  notes?: string;
  isLocked: boolean;
  lockedAt?: Date;
  unionParishad?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const DistributionSchema = new Schema<IDistribution>(
  {
    distributionNo: {
      type: String,
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    distributedDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(DistributionStatus),
      default: DistributionStatus.PENDING,
    },
    amount: {
      type: Number,
      min: 0,
    },
    items: [{
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, required: true },
    }],
    collectedBy: {
      type: String,
    },
    collectorNid: {
      type: String,
    },
    collectorRelation: {
      type: String,
    },
    collectorSignature: {
      type: String,
    },
    distributedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    receiptNo: {
      type: String,
    },
    remarks: {
      type: String,
    },
    photo: {
      type: String,
    },
  },
  { timestamps: true }
);

const BeneficiarySchema = new Schema<IBeneficiary>(
  {
    beneficiaryNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: "ReliefProgram",
      required: [true, "Program is required"],
    },
    citizen: {
      type: Schema.Types.ObjectId,
      ref: "Citizen",
      required: [true, "Citizen is required"],
    },
    applicationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(BeneficiaryStatus),
      default: BeneficiaryStatus.PENDING,
    },
    priorityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    priorityReason: {
      type: String,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
    },
    totalEntitlement: {
      type: Number,
      required: true,
      min: 0,
    },
    totalReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingEntitlement: {
      type: Number,
      default: 0,
    },
    distributions: [DistributionSchema],
    lastDistributionDate: {
      type: Date,
    },
    nextDistributionDate: {
      type: Date,
    },
    bankAccount: {
      bankName: { type: String },
      branchName: { type: String },
      accountNo: { type: String },
      accountName: { type: String },
    },
    mobileBanking: {
      provider: { type: String },
      accountNo: { type: String },
    },
    nomineeNid: {
      type: String,
    },
    nomineeName: {
      type: String,
    },
    nomineeRelation: {
      type: String,
    },
    nomineePhone: {
      type: String,
    },
    documents: [{
      type: String,
    }],
    notes: {
      type: String,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedAt: {
      type: Date,
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
BeneficiarySchema.index({ beneficiaryNo: 1 }, { unique: true });
BeneficiarySchema.index({ program: 1 });
BeneficiarySchema.index({ citizen: 1 });
BeneficiarySchema.index({ status: 1 });
BeneficiarySchema.index({ priorityScore: -1 });
BeneficiarySchema.index({ applicationDate: -1 });
BeneficiarySchema.index({ deletedAt: 1 });
BeneficiarySchema.index({ unionParishad: 1 });
BeneficiarySchema.index({ "distributions.distributionNo": 1 });
BeneficiarySchema.index({ "distributions.receiptNo": 1 });

// Compound indexes
BeneficiarySchema.index({ program: 1, citizen: 1 }, { unique: true });
BeneficiarySchema.index({ program: 1, status: 1 });

// Soft delete filter
BeneficiarySchema.pre("find", function () {
  this.where({ deletedAt: null });
});

BeneficiarySchema.pre("findOne", function () {
  this.where({ deletedAt: null });
});

// Calculate remaining entitlement
BeneficiarySchema.pre("save", function () {
  this.remainingEntitlement = this.totalEntitlement - this.totalReceived;
  if (this.remainingEntitlement <= 0 && this.status === BeneficiaryStatus.ACTIVE) {
    this.status = BeneficiaryStatus.COMPLETED;
  }
});

// Methods
BeneficiarySchema.methods.approve = async function (
  approvedBy: mongoose.Types.ObjectId
): Promise<IBeneficiary> {
  this.status = BeneficiaryStatus.APPROVED;
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.isLocked = true;
  this.lockedAt = new Date();
  return this.save();
};

BeneficiarySchema.methods.reject = async function (
  rejectedBy: mongoose.Types.ObjectId,
  reason: string
): Promise<IBeneficiary> {
  this.status = BeneficiaryStatus.REJECTED;
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

BeneficiarySchema.methods.addDistribution = async function (
  distribution: Omit<IDistribution, "_id">
): Promise<IBeneficiary> {
  this.distributions.push(distribution);

  if (distribution.status === DistributionStatus.DISTRIBUTED) {
    this.totalReceived += distribution.amount || 0;
    this.lastDistributionDate = distribution.distributedDate;
  }

  return this.save();
};

BeneficiarySchema.methods.softDelete = function (): Promise<IBeneficiary> {
  this.deletedAt = new Date();
  return this.save();
};

// Static to generate beneficiary number
BeneficiarySchema.statics.generateBeneficiaryNo = async function (
  programCode: string
): Promise<string> {
  const prefix = `BEN-${programCode}`;
  const count = await this.countDocuments({
    beneficiaryNo: { $regex: `^${prefix}` },
  });
  return `${prefix}-${(count + 1).toString().padStart(5, "0")}`;
};

export const Beneficiary: Model<IBeneficiary> =
  mongoose.models.Beneficiary ||
  mongoose.model<IBeneficiary>("Beneficiary", BeneficiarySchema);

export default Beneficiary;
