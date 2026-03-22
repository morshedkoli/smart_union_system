import mongoose, { Schema, Document, Model } from "mongoose";

export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

export enum TransactionCategory {
  // Income categories
  HOLDING_TAX = "HOLDING_TAX",
  TRADE_LICENSE_FEE = "TRADE_LICENSE_FEE",
  CERTIFICATE_FEE = "CERTIFICATE_FEE",
  MARKET_RENT = "MARKET_RENT",
  LEASE_RENT = "LEASE_RENT",
  FINE_PENALTY = "FINE_PENALTY",
  GRANT_GOVERNMENT = "GRANT_GOVERNMENT",
  GRANT_NGO = "GRANT_NGO",
  DONATION = "DONATION",
  OTHER_INCOME = "OTHER_INCOME",

  // Expense categories
  SALARY = "SALARY",
  ALLOWANCE = "ALLOWANCE",
  OFFICE_EXPENSE = "OFFICE_EXPENSE",
  STATIONERY = "STATIONERY",
  ELECTRICITY = "ELECTRICITY",
  WATER = "WATER",
  TELEPHONE = "TELEPHONE",
  INTERNET = "INTERNET",
  MAINTENANCE = "MAINTENANCE",
  CONSTRUCTION = "CONSTRUCTION",
  DEVELOPMENT = "DEVELOPMENT",
  RELIEF_DISTRIBUTION = "RELIEF_DISTRIBUTION",
  TRAVEL = "TRAVEL",
  TRAINING = "TRAINING",
  MEETING = "MEETING",
  ENTERTAINMENT = "ENTERTAINMENT",
  MISCELLANEOUS = "MISCELLANEOUS",
  OTHER_EXPENSE = "OTHER_EXPENSE",
}

export enum PaymentMode {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  CHEQUE = "CHEQUE",
  MOBILE_BANKING = "MOBILE_BANKING",
  ONLINE = "ONLINE",
}

export enum EntryStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  VOID = "VOID",
}

export interface ICashbook extends Document {
  _id: mongoose.Types.ObjectId;
  entryNo: string;
  voucherNo: string;
  transactionDate: Date;
  transactionType: TransactionType;
  category: TransactionCategory;
  subCategory?: string;
  description: string;
  descriptionBn?: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNo?: string;
  referenceType?: string;
  referenceId?: mongoose.Types.ObjectId;
  paidTo?: string;
  receivedFrom?: string;
  bankName?: string;
  bankAccount?: string;
  chequeNo?: string;
  chequeDate?: Date;
  transactionId?: string;
  fiscalYear: string;
  budgetHead?: string;
  projectCode?: string;
  openingBalance: number;
  closingBalance: number;
  status: EntryStatus;
  attachments?: string[];
  remarks?: string;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  voidedAt?: Date;
  voidedBy?: mongoose.Types.ObjectId;
  voidReason?: string;
  unionParishad?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const CashbookSchema = new Schema<ICashbook>(
  {
    entryNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    voucherNo: {
      type: String,
      required: true,
      trim: true,
    },
    transactionDate: {
      type: Date,
      required: [true, "Transaction date is required"],
    },
    transactionType: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: Object.values(TransactionType),
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: Object.values(TransactionCategory),
    },
    subCategory: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    descriptionBn: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    paymentMode: {
      type: String,
      required: [true, "Payment mode is required"],
      enum: Object.values(PaymentMode),
    },
    referenceNo: {
      type: String,
      trim: true,
    },
    referenceType: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    paidTo: {
      type: String,
      trim: true,
    },
    receivedFrom: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    bankAccount: {
      type: String,
      trim: true,
    },
    chequeNo: {
      type: String,
      trim: true,
    },
    chequeDate: {
      type: Date,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    fiscalYear: {
      type: String,
      required: [true, "Fiscal year is required"],
      match: [/^\d{4}-\d{4}$/, "Fiscal year must be in format YYYY-YYYY"],
    },
    budgetHead: {
      type: String,
      trim: true,
    },
    projectCode: {
      type: String,
      trim: true,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    closingBalance: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EntryStatus),
      default: EntryStatus.PENDING,
    },
    attachments: [{
      type: String,
    }],
    remarks: {
      type: String,
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
    voidedAt: {
      type: Date,
    },
    voidedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    voidReason: {
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
CashbookSchema.index({ entryNo: 1 }, { unique: true });
CashbookSchema.index({ voucherNo: 1 });
CashbookSchema.index({ transactionDate: -1 });
CashbookSchema.index({ transactionType: 1 });
CashbookSchema.index({ category: 1 });
CashbookSchema.index({ fiscalYear: 1 });
CashbookSchema.index({ status: 1 });
CashbookSchema.index({ referenceNo: 1 });
CashbookSchema.index({ deletedAt: 1 });
CashbookSchema.index({ unionParishad: 1 });
CashbookSchema.index({ chequeNo: 1 }, { sparse: true });

// Compound indexes
CashbookSchema.index({ fiscalYear: 1, transactionType: 1 });
CashbookSchema.index({ fiscalYear: 1, category: 1 });
CashbookSchema.index({ transactionDate: -1, transactionType: 1 });
CashbookSchema.index({ unionParishad: 1, fiscalYear: 1, status: 1 });

// Soft delete filter
CashbookSchema.pre("find", function () {
  this.where({ deletedAt: null });
});

CashbookSchema.pre("findOne", function () {
  this.where({ deletedAt: null });
});

// Calculate closing balance
CashbookSchema.pre("save", function () {
  if (this.transactionType === TransactionType.INCOME) {
    this.closingBalance = this.openingBalance + this.amount;
  } else {
    this.closingBalance = this.openingBalance - this.amount;
  }
  
});

// Methods
CashbookSchema.methods.approve = async function (
  approvedBy: mongoose.Types.ObjectId
): Promise<ICashbook> {
  this.status = EntryStatus.APPROVED;
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

CashbookSchema.methods.reject = async function (
  rejectedBy: mongoose.Types.ObjectId,
  reason: string
): Promise<ICashbook> {
  this.status = EntryStatus.REJECTED;
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

CashbookSchema.methods.void = async function (
  voidedBy: mongoose.Types.ObjectId,
  reason: string
): Promise<ICashbook> {
  this.status = EntryStatus.VOID;
  this.voidedBy = voidedBy;
  this.voidedAt = new Date();
  this.voidReason = reason;
  return this.save();
};

CashbookSchema.methods.softDelete = function (): Promise<ICashbook> {
  this.deletedAt = new Date();
  return this.save();
};

// Static methods
CashbookSchema.statics.generateEntryNo = async function (
  fiscalYear: string,
  type: TransactionType
): Promise<string> {
  const typeCode = type === TransactionType.INCOME ? "IN" : "EX";
  const prefix = `CB-${fiscalYear.replace("-", "")}-${typeCode}`;
  const count = await this.countDocuments({
    entryNo: { $regex: `^${prefix}` },
  });
  return `${prefix}-${(count + 1).toString().padStart(5, "0")}`;
};

CashbookSchema.statics.getBalance = async function (
  unionParishadId: mongoose.Types.ObjectId,
  fiscalYear: string,
  upToDate?: Date
): Promise<{ income: number; expense: number; balance: number }> {
  const matchStage: Record<string, unknown> = {
    unionParishad: unionParishadId,
    fiscalYear,
    status: EntryStatus.APPROVED,
    deletedAt: null,
  };

  if (upToDate) {
    matchStage.transactionDate = { $lte: upToDate };
  }

  const result = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$transactionType",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const income = result.find((r: { _id: string; total: number }) => r._id === TransactionType.INCOME)?.total || 0;
  const expense = result.find((r: { _id: string; total: number }) => r._id === TransactionType.EXPENSE)?.total || 0;

  return {
    income,
    expense,
    balance: income - expense,
  };
};

export const Cashbook: Model<ICashbook> =
  mongoose.models.Cashbook || mongoose.model<ICashbook>("Cashbook", CashbookSchema);

export default Cashbook;
