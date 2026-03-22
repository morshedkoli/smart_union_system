// Database Connection
export { default as connectDB } from "@/lib/mongodb";

// Models
export { User, type IUser, UserRole, UserStatus } from "./User";
export {
  Citizen,
  type ICitizen,
  type IAddress,
  Gender,
  MaritalStatus,
  BloodGroup,
  CitizenStatus,
} from "./Citizen";
export {
  HoldingTax,
  type IHoldingTax,
  type IHoldingInfo,
  type ITaxAssessment,
  type IPayment,
  HoldingType,
  BuildingType,
  PaymentStatus,
  PaymentMethod,
} from "./HoldingTax";
export {
  Certificate,
  type ICertificate,
  type ICertificateMetadata,
  CertificateType,
  CertificateStatus,
} from "./Certificate";
export {
  CertificateTemplate,
  type ICertificateTemplate,
  type ITemplateField,
  TemplateStatus,
} from "./CertificateTemplate";
export {
  ReliefProgram,
  type IReliefProgram,
  type IEligibilityCriteria,
  type IBudget,
  ReliefType,
  ProgramStatus,
  FundingSource,
} from "./ReliefProgram";
export {
  Beneficiary,
  type IBeneficiary,
  type IDistribution,
  BeneficiaryStatus,
  DistributionStatus,
} from "./Beneficiary";
export {
  Cashbook,
  type ICashbook,
  TransactionType,
  TransactionCategory,
  PaymentMode,
  EntryStatus,
} from "./Cashbook";
export {
  AuditLog,
  type IAuditLog,
  type IChanges,
  AuditAction,
  EntityType,
  Severity,
} from "./AuditLog";
export {
  Notification,
  type INotification,
  NotificationType,
  NotificationChannel,
  NotificationCategory,
  NotificationStatus,
} from "./Notification";
