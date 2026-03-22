import mongoose, { Schema, Document, Model } from "mongoose";

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum MaritalStatus {
  SINGLE = "SINGLE",
  MARRIED = "MARRIED",
  DIVORCED = "DIVORCED",
  WIDOWED = "WIDOWED",
}

export enum BloodGroup {
  A_POSITIVE = "A+",
  A_NEGATIVE = "A-",
  B_POSITIVE = "B+",
  B_NEGATIVE = "B-",
  O_POSITIVE = "O+",
  O_NEGATIVE = "O-",
  AB_POSITIVE = "AB+",
  AB_NEGATIVE = "AB-",
}

export enum CitizenStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DECEASED = "DECEASED",
  MIGRATED = "MIGRATED",
}

export interface IAddress {
  village?: string;
  ward: number;
  postOffice?: string;
  postCode?: string;
  upazila?: string;
  district?: string;
  division?: string;
  fullAddress?: string;
}

export interface ICitizen extends Document {
  _id: mongoose.Types.ObjectId;
  registrationNo: string;
  nid?: string;
  birthCertificateNo?: string;
  passportNo?: string;
  name: string;
  nameEn?: string;
  nameBn: string;
  fatherName: string;
  fatherNameBn?: string;
  fatherNid?: string;
  motherName: string;
  motherNameBn?: string;
  motherNid?: string;
  spouseName?: string;
  spouseNid?: string;
  dateOfBirth: Date;
  gender: Gender;
  bloodGroup?: BloodGroup;
  religion?: string;
  maritalStatus: MaritalStatus;
  nationality: string;
  occupation?: string;
  education?: string;
  income?: number;
  mobile?: string;
  email?: string;
  photo?: string;
  signature?: string;
  presentAddress: IAddress;
  permanentAddress: IAddress;
  holdingNo?: string;
  voterNo?: string;
  isFreedomFighter: boolean;
  isDisabled: boolean;
  disabilityType?: string;
  isWidow: boolean;
  isOrphan: boolean;
  familyMembersCount?: number;
  status: CitizenStatus;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  unionParishad?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    village: { type: String, trim: true },
    ward: { type: Number, required: true, min: 1, max: 9 },
    postOffice: { type: String, trim: true },
    postCode: { type: String, trim: true },
    upazila: { type: String, trim: true },
    district: { type: String, trim: true },
    division: { type: String, trim: true },
    fullAddress: { type: String, trim: true },
  },
  { _id: false }
);

const CitizenSchema = new Schema<ICitizen>(
  {
    registrationNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    nid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^\d{10}$|^\d{13}$|^\d{17}$/, "Please enter a valid NID number"],
    },
    birthCertificateNo: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    passportNo: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 150,
    },
    nameEn: {
      type: String,
      trim: true,
    },
    nameBn: {
      type: String,
      required: [true, "Bengali name is required"],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "Father name is required"],
      trim: true,
    },
    fatherNameBn: {
      type: String,
      trim: true,
    },
    fatherNid: {
      type: String,
      trim: true,
    },
    motherName: {
      type: String,
      required: [true, "Mother name is required"],
      trim: true,
    },
    motherNameBn: {
      type: String,
      trim: true,
    },
    motherNid: {
      type: String,
      trim: true,
    },
    spouseName: {
      type: String,
      trim: true,
    },
    spouseNid: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: Object.values(Gender),
    },
    bloodGroup: {
      type: String,
      enum: Object.values(BloodGroup),
    },
    religion: {
      type: String,
      trim: true,
    },
    maritalStatus: {
      type: String,
      enum: Object.values(MaritalStatus),
      default: MaritalStatus.SINGLE,
    },
    nationality: {
      type: String,
      default: "Bangladeshi",
    },
    occupation: {
      type: String,
      trim: true,
    },
    education: {
      type: String,
      trim: true,
    },
    income: {
      type: Number,
      min: 0,
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^(?:\+?880|0)?1[3-9]\d{8}$/, "Please enter a valid Bangladesh mobile number"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    photo: {
      type: String,
    },
    signature: {
      type: String,
    },
    presentAddress: {
      type: AddressSchema,
      required: [true, "Present address is required"],
    },
    permanentAddress: {
      type: AddressSchema,
      required: [true, "Permanent address is required"],
    },
    holdingNo: {
      type: String,
      trim: true,
    },
    voterNo: {
      type: String,
      trim: true,
    },
    isFreedomFighter: {
      type: Boolean,
      default: false,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    disabilityType: {
      type: String,
      trim: true,
    },
    isWidow: {
      type: Boolean,
      default: false,
    },
    isOrphan: {
      type: Boolean,
      default: false,
    },
    familyMembersCount: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      enum: Object.values(CitizenStatus),
      default: CitizenStatus.ACTIVE,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    unionParishad: {
      type: Schema.Types.ObjectId,
      ref: "UnionParishad",
    },
    metadata: {
      type: Schema.Types.Mixed,
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
CitizenSchema.index({ registrationNo: 1 }, { unique: true });
CitizenSchema.index({ nid: 1 }, { sparse: true });
CitizenSchema.index({ birthCertificateNo: 1 }, { sparse: true });
CitizenSchema.index({ mobile: 1 }, { sparse: true });
CitizenSchema.index({ "presentAddress.ward": 1 });
CitizenSchema.index({ "permanentAddress.ward": 1 });
CitizenSchema.index({ holdingNo: 1 });
CitizenSchema.index({ status: 1 });
CitizenSchema.index({ deletedAt: 1 });
CitizenSchema.index({ unionParishad: 1 });
CitizenSchema.index({ name: "text", nameBn: "text", fatherName: "text" });

// Soft delete filter
CitizenSchema.pre("find", function () {
  this.where({ deletedAt: null });
});

CitizenSchema.pre("findOne", function () {
  this.where({ deletedAt: null });
});

// Virtual for age
CitizenSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for certificates
CitizenSchema.virtual("certificates", {
  ref: "Certificate",
  localField: "_id",
  foreignField: "citizen",
});

// Virtual for holding taxes
CitizenSchema.virtual("holdingTaxes", {
  ref: "HoldingTax",
  localField: "_id",
  foreignField: "citizen",
});

// Methods
CitizenSchema.methods.softDelete = function (): Promise<ICitizen> {
  this.deletedAt = new Date();
  return this.save();
};

// Static method to generate registration number
CitizenSchema.statics.generateRegistrationNo = async function (
  wardNo: number,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `CIT-${currentYear}-W${wardNo.toString().padStart(2, "0")}`;
  const count = await this.countDocuments({
    registrationNo: { $regex: `^${prefix}` },
  });
  return `${prefix}-${(count + 1).toString().padStart(5, "0")}`;
};

export const Citizen: Model<ICitizen> =
  mongoose.models.Citizen || mongoose.model<ICitizen>("Citizen", CitizenSchema);

export default Citizen;
