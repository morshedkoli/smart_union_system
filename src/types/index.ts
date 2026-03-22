export interface Citizen {
  id: string;
  nid?: string;
  birthCertNo?: string;
  name: string;
  nameEn?: string;
  nameBn: string;
  fatherName: string;
  fatherNameBn?: string;
  motherName: string;
  motherNameBn?: string;
  dateOfBirth: Date;
  gender: Gender;
  religion?: string;
  maritalStatus: MaritalStatus;
  occupation?: string;
  phone?: string;
  email?: string;
  presentAddress: string;
  permanentAddress: string;
  wardNo: number;
  holdingNo?: string;
  photo?: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type MaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
export type Status = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Certificate {
  id: string;
  certificateNo: string;
  type: CertificateType;
  citizenId: string;
  citizen?: Citizen;
  issuedById: string;
  issuedAt: Date;
  validUntil?: Date;
  status: CertificateStatus;
  approvedAt?: Date;
  approvedById?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  qrCode?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CertificateType =
  | "BIRTH"
  | "DEATH"
  | "CITIZENSHIP"
  | "CHARACTER"
  | "INHERITORSHIP"
  | "TRADE_LICENSE"
  | "NOC";

export type CertificateStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";

export interface Tax {
  id: string;
  receiptNo: string;
  type: TaxType;
  citizenId: string;
  citizen?: Citizen;
  holdingId?: string;
  fiscalYear: string;
  amount: number;
  arrears: number;
  penalty: number;
  totalAmount: number;
  paidAmount: number;
  dueDate: Date;
  paidAt?: Date;
  status: PaymentStatus;
  paymentMethod?: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TaxType =
  | "HOLDING_TAX"
  | "TRADE_LICENSE_FEE"
  | "BIRTH_CERTIFICATE_FEE"
  | "DEATH_CERTIFICATE_FEE"
  | "OTHER_FEE";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE" | "WAIVED";

export interface Holding {
  id: string;
  holdingNo: string;
  citizenId: string;
  citizen?: Citizen;
  wardNo: number;
  mouza?: string;
  jlNo?: string;
  plot?: string;
  area?: number;
  landType?: string;
  buildingType?: string;
  assessedValue: number;
  annualTax: number;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnionParishad {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
  district: string;
  upazila: string;
  division: string;
  chairman?: string;
  chairmanPhone?: string;
  totalWards: number;
  logo?: string;
  seal?: string;
  signatureChairman?: string;
  signatureSecretary?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}
