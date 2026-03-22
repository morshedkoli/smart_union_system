import { z } from "zod";
import mongoose from "mongoose";
import { CertificateType, CertificateStatus } from "@/models/Certificate";
import { Gender, MaritalStatus, CitizenStatus } from "@/models/Citizen";
import { HoldingType, BuildingType, PaymentMethod, PaymentStatus } from "@/models/HoldingTax";
import { ReliefType, ProgramStatus, FundingSource } from "@/models/ReliefProgram";
import { BeneficiaryStatus, DistributionStatus } from "@/models/Beneficiary";
import { TransactionType, TransactionCategory, PaymentMode, EntryStatus } from "@/models/Cashbook";
import { UserRole, UserStatus } from "@/models/User";

// Helper to validate MongoDB ObjectId
export const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: "Invalid ObjectId" }
);

// Helper for dates
export const dateSchema = z.union([z.date(), z.string().datetime()]).transform((val) =>
  typeof val === "string" ? new Date(val) : val
);

// Address schema
export const addressSchema = z.object({
  village: z.string().trim().optional(),
  ward: z.number().int().min(1).max(9),
  postOffice: z.string().trim().optional(),
  postCode: z.string().trim().optional(),
  upazila: z.string().trim().optional(),
  district: z.string().trim().optional(),
  division: z.string().trim().optional(),
  fullAddress: z.string().trim().optional(),
});

// User schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().regex(/^(?:\+?880|0)?1[3-9]\d{8}$/, "Invalid Bangladesh mobile number").optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// Citizen schemas
export const createCitizenSchema = z.object({
  nid: z.string().regex(/^\d{10}$|^\d{13}$|^\d{17}$/, "Invalid NID number").optional(),
  birthCertificateNo: z.string().optional(),
  name: z.string().min(2).max(150),
  nameEn: z.string().optional(),
  nameBn: z.string().min(2).max(150),
  fatherName: z.string().min(2).max(150),
  fatherNameBn: z.string().optional(),
  motherName: z.string().min(2).max(150),
  motherNameBn: z.string().optional(),
  dateOfBirth: dateSchema,
  gender: z.nativeEnum(Gender),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  religion: z.string().optional(),
  occupation: z.string().optional(),
  mobile: z.string().regex(/^(?:\+?880|0)?1[3-9]\d{8}$/, "Invalid mobile number").optional(),
  email: z.string().email().optional(),
  presentAddress: addressSchema,
  permanentAddress: addressSchema,
  holdingNo: z.string().optional(),
  isFreedomFighter: z.boolean().optional(),
  isDisabled: z.boolean().optional(),
  isWidow: z.boolean().optional(),
});

export const updateCitizenSchema = createCitizenSchema.partial();

// Certificate schemas
export const createCertificateSchema = z.object({
  citizenId: objectIdSchema,
  type: z.nativeEnum(CertificateType),
  templateId: objectIdSchema,
  dataSnapshot: z.record(z.unknown()).optional(),
});

export const updateCertificateSchema = z.object({
  finalText: z.string().optional(),
  dataSnapshot: z.record(z.unknown()).optional(),
});

export const submitCertificateSchema = z.object({
  certificateId: objectIdSchema,
  action: z.literal("submit"),
});

// Holding Tax schemas
export const holdingInfoSchema = z.object({
  holdingNo: z.string().min(1),
  mouza: z.string().optional(),
  jlNo: z.string().optional(),
  daagNo: z.string().optional(),
  plotNo: z.string().optional(),
  ward: z.number().int().min(1).max(9),
  area: z.number().positive(),
  areaUnit: z.enum(["decimal", "katha", "bigha", "acre", "sqft", "sqm"]).optional(),
  holdingType: z.nativeEnum(HoldingType),
  buildingType: z.nativeEnum(BuildingType).optional(),
  floors: z.number().int().min(0).optional(),
});

export const createHoldingTaxSchema = z.object({
  citizenId: objectIdSchema,
  holdingInfo: holdingInfoSchema,
  fiscalYear: z.string().regex(/^\d{4}-\d{4}$/, "Fiscal year must be in format YYYY-YYYY"),
  assessment: z.object({
    assessedValue: z.number().positive(),
    taxRate: z.number().min(0).max(100),
    annualTax: z.number().positive(),
  }),
  arrears: z.number().min(0).optional(),
  rebate: z.number().min(0).optional(),
  dueDate: dateSchema,
});

export const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionId: z.string().optional(),
  bankName: z.string().optional(),
  chequeNo: z.string().optional(),
  notes: z.string().optional(),
});

// Relief Program schemas
export const eligibilityCriteriaSchema = z.object({
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
  maxIncome: z.number().min(0).optional(),
  wards: z.array(z.number().int().min(1).max(9)).optional(),
  genders: z.array(z.nativeEnum(Gender)).optional(),
  maritalStatuses: z.array(z.nativeEnum(MaritalStatus)).optional(),
  isFreedomFighter: z.boolean().optional(),
  isDisabled: z.boolean().optional(),
  isWidow: z.boolean().optional(),
  isOrphan: z.boolean().optional(),
});

export const createReliefProgramSchema = z.object({
  name: z.string().min(2),
  nameEn: z.string().min(2),
  nameBn: z.string().min(2),
  type: z.nativeEnum(ReliefType),
  fundingSource: z.nativeEnum(FundingSource),
  startDate: dateSchema,
  endDate: dateSchema.optional(),
  targetBeneficiaries: z.number().int().min(1),
  budgetTotal: z.number().positive(),
  criteria: eligibilityCriteriaSchema.optional(),
});

export const createBeneficiarySchema = z.object({
  programId: objectIdSchema,
  citizenId: objectIdSchema,
  totalEntitlement: z.number().positive(),
  notes: z.string().optional(),
  priorityReason: z.string().optional(),
});

export const reviewBeneficiarySchema = z.object({
  status: z.enum([BeneficiaryStatus.VERIFIED, BeneficiaryStatus.REJECTED]),
  note: z.string().optional(),
});

// Finance/Cashbook schemas
export const createTransactionSchema = z.object({
  transactionDate: dateSchema,
  transactionType: z.nativeEnum(TransactionType),
  category: z.nativeEnum(TransactionCategory),
  description: z.string().min(1).max(500),
  descriptionBn: z.string().optional(),
  amount: z.number().positive(),
  voucherNo: z.string().min(1),
  paymentMode: z.nativeEnum(PaymentMode),
  subCategory: z.string().optional(),
  referenceNo: z.string().optional(),
  referenceType: z.string().optional(),
  paidTo: z.string().optional(),
  receivedFrom: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  chequeNo: z.string().optional(),
  chequeDate: dateSchema.optional(),
  transactionId: z.string().optional(),
  budgetHead: z.string().optional(),
  projectCode: z.string().optional(),
  remarks: z.string().optional(),
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const searchSchema = z.object({
  query: z.string().optional(),
  ...paginationSchema.shape,
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCitizenInput = z.infer<typeof createCitizenSchema>;
export type UpdateCitizenInput = z.infer<typeof updateCitizenSchema>;
export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
export type CreateHoldingTaxInput = z.infer<typeof createHoldingTaxSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type CreateReliefProgramInput = z.infer<typeof createReliefProgramSchema>;
export type CreateBeneficiaryInput = z.infer<typeof createBeneficiarySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
