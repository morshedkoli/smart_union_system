import mongoose, { Schema, Document, Model } from "mongoose";

export enum ReliefType {
  FOOD = "FOOD",
  CASH = "CASH",
  HOUSING = "HOUSING",
  MEDICAL = "MEDICAL",
  EDUCATION = "EDUCATION",
  AGRICULTURAL = "AGRICULTURAL",
  LIVELIHOOD = "LIVELIHOOD",
  DISASTER = "DISASTER",
  OTHER = "OTHER",
}

export enum ProgramStatus {
  DRAFT = "DRAFT",
  PLANNED = "PLANNED",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum FundingSource {
  GOVERNMENT = "GOVERNMENT",
  NGO = "NGO",
  PRIVATE_DONATION = "PRIVATE_DONATION",
  FOREIGN_AID = "FOREIGN_AID",
  LOCAL_FUND = "LOCAL_FUND",
  MIXED = "MIXED",
}

export interface IEligibilityCriteria {
  minAge?: number;
  maxAge?: number;
  genders?: string[];
  maritalStatuses?: string[];
  maxIncome?: number;
  wards?: number[];
  isFreedomFighter?: boolean;
  isDisabled?: boolean;
  isWidow?: boolean;
  isOrphan?: boolean;
  customCriteria?: string;
}

export interface IBudget {
  totalBudget: number;
  allocatedBudget: number;
  disbursedAmount: number;
  remainingAmount: number;
  costPerBeneficiary?: number;
  currency: string;
}

export interface IReliefProgram extends Document {
  _id: mongoose.Types.ObjectId;
  programCode: string;
  name: string;
  nameEn: string;
  nameBn: string;
  description?: string;
  type: ReliefType;
  category?: string;
  status: ProgramStatus;
  fundingSource: FundingSource;
  fundingAgency?: string;
  startDate: Date;
  endDate?: Date;
  eligibilityCriteria: IEligibilityCriteria;
  budget: IBudget;
  targetBeneficiaries: number;
  currentBeneficiaries: number;
  distributionSchedule?: string;
  distributionMethod?: string;
  itemsDistributed?: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  documents?: string[];
  contactPerson?: string;
  contactPhone?: string;
  unionParishad?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const EligibilityCriteriaSchema = new Schema<IEligibilityCriteria>(
  {
    minAge: { type: Number, min: 0 },
    maxAge: { type: Number, min: 0 },
    genders: [{ type: String }],
    maritalStatuses: [{ type: String }],
    maxIncome: { type: Number, min: 0 },
    wards: [{ type: Number, min: 1, max: 9 }],
    isFreedomFighter: { type: Boolean },
    isDisabled: { type: Boolean },
    isWidow: { type: Boolean },
    isOrphan: { type: Boolean },
    customCriteria: { type: String },
  },
  { _id: false }
);

const BudgetSchema = new Schema<IBudget>(
  {
    totalBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    allocatedBudget: {
      type: Number,
      default: 0,
      min: 0,
    },
    disbursedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
    costPerBeneficiary: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "BDT",
    },
  },
  { _id: false }
);

const ReliefProgramSchema = new Schema<IReliefProgram>(
  {
    programCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Program name is required"],
      trim: true,
    },
    nameEn: {
      type: String,
      required: true,
      trim: true,
    },
    nameBn: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      required: [true, "Relief type is required"],
      enum: Object.values(ReliefType),
    },
    category: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(ProgramStatus),
      default: ProgramStatus.DRAFT,
    },
    fundingSource: {
      type: String,
      required: [true, "Funding source is required"],
      enum: Object.values(FundingSource),
    },
    fundingAgency: {
      type: String,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
    },
    eligibilityCriteria: {
      type: EligibilityCriteriaSchema,
      default: {},
    },
    budget: {
      type: BudgetSchema,
      required: true,
    },
    targetBeneficiaries: {
      type: Number,
      required: true,
      min: 1,
    },
    currentBeneficiaries: {
      type: Number,
      default: 0,
      min: 0,
    },
    distributionSchedule: {
      type: String,
    },
    distributionMethod: {
      type: String,
    },
    itemsDistributed: [{
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, required: true },
    }],
    documents: [{
      type: String,
    }],
    contactPerson: {
      type: String,
    },
    contactPhone: {
      type: String,
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
ReliefProgramSchema.index({ programCode: 1 }, { unique: true });
ReliefProgramSchema.index({ type: 1 });
ReliefProgramSchema.index({ status: 1 });
ReliefProgramSchema.index({ startDate: 1 });
ReliefProgramSchema.index({ endDate: 1 });
ReliefProgramSchema.index({ fundingSource: 1 });
ReliefProgramSchema.index({ deletedAt: 1 });
ReliefProgramSchema.index({ unionParishad: 1 });

// Soft delete filter
ReliefProgramSchema.pre("find", function () {
  this.where({ deletedAt: null });
});

ReliefProgramSchema.pre("findOne", function () {
  this.where({ deletedAt: null });
});

// Calculate remaining budget
ReliefProgramSchema.pre("save", function () {
  this.budget.remainingAmount =
    this.budget.totalBudget - this.budget.disbursedAmount;
  
});

// Virtual for beneficiaries
ReliefProgramSchema.virtual("beneficiaries", {
  ref: "Beneficiary",
  localField: "_id",
  foreignField: "program",
});

// Methods
ReliefProgramSchema.methods.softDelete = function (): Promise<IReliefProgram> {
  this.deletedAt = new Date();
  return this.save();
};

// Static to generate program code
ReliefProgramSchema.statics.generateProgramCode = async function (
  type: ReliefType,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const typeCode = type.substring(0, 3).toUpperCase();
  const prefix = `RP-${typeCode}-${currentYear}`;
  const count = await this.countDocuments({
    programCode: { $regex: `^${prefix}` },
  });
  return `${prefix}-${(count + 1).toString().padStart(4, "0")}`;
};

export const ReliefProgram: Model<IReliefProgram> =
  mongoose.models.ReliefProgram ||
  mongoose.model<IReliefProgram>("ReliefProgram", ReliefProgramSchema);

export default ReliefProgram;
