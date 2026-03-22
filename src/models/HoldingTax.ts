import mongoose, { Schema, Document, Model } from "mongoose";

export enum HoldingType {
  RESIDENTIAL = "RESIDENTIAL",
  COMMERCIAL = "COMMERCIAL",
  AGRICULTURAL = "AGRICULTURAL",
  MIXED = "MIXED",
  VACANT = "VACANT",
}

export enum BuildingType {
  PUCCA = "PUCCA",
  SEMI_PUCCA = "SEMI_PUCCA",
  KUTCHA = "KUTCHA",
  TIN_SHED = "TIN_SHED",
  MULTI_STOREY = "MULTI_STOREY",
}

export enum PaymentStatus {
  UNPAID = "UNPAID",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  WAIVED = "WAIVED",
}

export enum PaymentMethod {
  CASH = "CASH",
  BANK = "BANK",
  MOBILE_BANKING = "MOBILE_BANKING",
  ONLINE = "ONLINE",
  CHEQUE = "CHEQUE",
}

export interface IHoldingInfo {
  holdingNo: string;
  mouza?: string;
  jlNo?: string;
  daagNo?: string;
  khatianNo?: string;
  plotNo?: string;
  ward: number;
  area: number;
  areaUnit: string;
  holdingType: HoldingType;
  buildingType?: BuildingType;
  floors?: number;
  rooms?: number;
  yearBuilt?: number;
}

export interface ITaxAssessment {
  assessedValue: number;
  taxRate: number;
  annualTax: number;
  assessmentDate: Date;
  assessedBy?: mongoose.Types.ObjectId;
  notes?: string;
}

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  receiptNo: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  bankName?: string;
  chequeNo?: string;
  collectedBy: mongoose.Types.ObjectId;
  notes?: string;
}

export interface IHoldingTax extends Document {
  _id: mongoose.Types.ObjectId;
  referenceNo: string;
  citizen: mongoose.Types.ObjectId;
  holdingInfo: IHoldingInfo;
  fiscalYear: string;
  assessment: ITaxAssessment;
  arrears: number;
  rebate: number;
  penalty: number;
  totalDue: number;
  totalPaid: number;
  balance: number;
  dueDate: Date;
  status: PaymentStatus;
  payments: IPayment[];
  lastPaymentDate?: Date;
  demandNoticeDate?: Date;
  demandNoticeSent: boolean;
  unionParishad?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const HoldingInfoSchema = new Schema<IHoldingInfo>(
  {
    holdingNo: {
      type: String,
      required: [true, "Holding number is required"],
      trim: true,
    },
    mouza: { type: String, trim: true },
    jlNo: { type: String, trim: true },
    daagNo: { type: String, trim: true },
    khatianNo: { type: String, trim: true },
    plotNo: { type: String, trim: true },
    ward: {
      type: Number,
      required: true,
      min: 1,
      max: 9,
    },
    area: {
      type: Number,
      required: true,
      min: 0,
    },
    areaUnit: {
      type: String,
      default: "decimal",
      enum: ["decimal", "katha", "bigha", "acre", "sqft", "sqm"],
    },
    holdingType: {
      type: String,
      required: true,
      enum: Object.values(HoldingType),
    },
    buildingType: {
      type: String,
      enum: Object.values(BuildingType),
    },
    floors: { type: Number, min: 0 },
    rooms: { type: Number, min: 0 },
    yearBuilt: { type: Number },
  },
  { _id: false }
);

const TaxAssessmentSchema = new Schema<ITaxAssessment>(
  {
    assessedValue: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    annualTax: {
      type: Number,
      required: true,
      min: 0,
    },
    assessmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    assessedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: { type: String },
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPayment>(
  {
    receiptNo: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: Object.values(PaymentMethod),
    },
    transactionId: { type: String, trim: true },
    bankName: { type: String, trim: true },
    chequeNo: { type: String, trim: true },
    collectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

const HoldingTaxSchema = new Schema<IHoldingTax>(
  {
    referenceNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    citizen: {
      type: Schema.Types.ObjectId,
      ref: "Citizen",
      required: [true, "Citizen is required"],
    },
    holdingInfo: {
      type: HoldingInfoSchema,
      required: true,
    },
    fiscalYear: {
      type: String,
      required: [true, "Fiscal year is required"],
      match: [/^\d{4}-\d{4}$/, "Fiscal year must be in format YYYY-YYYY"],
    },
    assessment: {
      type: TaxAssessmentSchema,
      required: true,
    },
    arrears: {
      type: Number,
      default: 0,
      min: 0,
    },
    rebate: {
      type: Number,
      default: 0,
      min: 0,
    },
    penalty: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDue: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.UNPAID,
    },
    payments: [PaymentSchema],
    lastPaymentDate: {
      type: Date,
    },
    demandNoticeDate: {
      type: Date,
    },
    demandNoticeSent: {
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
HoldingTaxSchema.index({ referenceNo: 1 }, { unique: true });
HoldingTaxSchema.index({ citizen: 1 });
HoldingTaxSchema.index({ "holdingInfo.holdingNo": 1 });
HoldingTaxSchema.index({ "holdingInfo.ward": 1 });
HoldingTaxSchema.index({ fiscalYear: 1 });
HoldingTaxSchema.index({ status: 1 });
HoldingTaxSchema.index({ dueDate: 1 });
HoldingTaxSchema.index({ deletedAt: 1 });
HoldingTaxSchema.index({ unionParishad: 1 });
HoldingTaxSchema.index({ "payments.receiptNo": 1 });

// Compound indexes
HoldingTaxSchema.index({ citizen: 1, fiscalYear: 1 });
HoldingTaxSchema.index({ status: 1, dueDate: 1 });

// Soft delete filter
HoldingTaxSchema.pre("find", function () {
  this.where({ deletedAt: null });
});

HoldingTaxSchema.pre("findOne", function () {
  this.where({ deletedAt: null });
});

// Pre-save hook to calculate balance and update status
HoldingTaxSchema.pre("save", function () {
  // Calculate total due
  this.totalDue = this.assessment.annualTax + this.arrears + this.penalty - this.rebate;

  // Calculate balance
  this.balance = this.totalDue - this.totalPaid;

  // Update status based on payment
  if (this.balance <= 0) {
    this.status = PaymentStatus.PAID;
  } else if (this.totalPaid > 0) {
    this.status = PaymentStatus.PARTIAL;
  } else if (new Date() > this.dueDate) {
    this.status = PaymentStatus.OVERDUE;
  } else {
    this.status = PaymentStatus.UNPAID;
  }

  
});

// Methods
HoldingTaxSchema.methods.addPayment = async function (
  payment: Omit<IPayment, "_id">
): Promise<IHoldingTax> {
  this.payments.push(payment);
  this.totalPaid = this.payments.reduce((sum: number, p: IPayment) => sum + p.amount, 0);
  this.lastPaymentDate = payment.paymentDate;
  return this.save();
};

HoldingTaxSchema.methods.softDelete = function (): Promise<IHoldingTax> {
  this.deletedAt = new Date();
  return this.save();
};

// Static method to generate reference number
HoldingTaxSchema.statics.generateReferenceNo = async function (
  fiscalYear: string,
  ward: number
): Promise<string> {
  const prefix = `HT-${fiscalYear.replace("-", "")}-W${ward.toString().padStart(2, "0")}`;
  const count = await this.countDocuments({
    referenceNo: { $regex: `^${prefix}` },
  });
  return `${prefix}-${(count + 1).toString().padStart(5, "0")}`;
};

export const HoldingTax: Model<IHoldingTax> =
  mongoose.models.HoldingTax || mongoose.model<IHoldingTax>("HoldingTax", HoldingTaxSchema);

export default HoldingTax;
