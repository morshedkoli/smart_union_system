import mongoose, { Schema, Document, Model } from "mongoose";

export enum AuditAction {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  SOFT_DELETE = "SOFT_DELETE",
  RESTORE = "RESTORE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  LOGIN_FAILED = "LOGIN_FAILED",
  PASSWORD_CHANGE = "PASSWORD_CHANGE",
  PASSWORD_RESET = "PASSWORD_RESET",
  APPROVE = "APPROVE",
  REJECT = "REJECT",
  REVOKE = "REVOKE",
  PRINT = "PRINT",
  DOWNLOAD = "DOWNLOAD",
  EXPORT = "EXPORT",
  IMPORT = "IMPORT",
  VERIFY = "VERIFY",
  PAYMENT = "PAYMENT",
  DISTRIBUTE = "DISTRIBUTE",
}

export enum EntityType {
  USER = "USER",
  CITIZEN = "CITIZEN",
  CERTIFICATE = "CERTIFICATE",
  CERTIFICATE_TEMPLATE = "CERTIFICATE_TEMPLATE",
  HOLDING_TAX = "HOLDING_TAX",
  RELIEF_PROGRAM = "RELIEF_PROGRAM",
  BENEFICIARY = "BENEFICIARY",
  CASHBOOK = "CASHBOOK",
  NOTIFICATION = "NOTIFICATION",
  SETTING = "SETTING",
  UNION_PARISHAD = "UNION_PARISHAD",
}

export enum Severity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface IChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  fields?: string[];
}

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: mongoose.Types.ObjectId;
  entityName?: string;
  description: string;
  changes?: IChanges;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  severity: Severity;
  isSuccess: boolean;
  errorMessage?: string;
  duration?: number;
  unionParishad?: mongoose.Types.ObjectId;
  createdAt: Date;
}

interface AuditLogModel extends Model<IAuditLog> {
  log(data: {
    user?: mongoose.Types.ObjectId;
    userName?: string;
    userEmail?: string;
    userRole?: string;
    action: AuditAction;
    entityType: EntityType;
    entityId?: mongoose.Types.ObjectId;
    entityName?: string;
    description: string;
    changes?: IChanges;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    severity?: Severity;
    isSuccess?: boolean;
    errorMessage?: string;
    duration?: number;
    unionParishad?: mongoose.Types.ObjectId;
  }): Promise<IAuditLog>;
  getUserActivity(userId: mongoose.Types.ObjectId, limit?: number): Promise<IAuditLog[]>;
  getEntityHistory(entityType: EntityType, entityId: mongoose.Types.ObjectId, limit?: number): Promise<IAuditLog[]>;
}

const ChangesSchema = new Schema<IChanges>(
  {
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    fields: [{ type: String }],
  },
  { _id: false }
);

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    userName: {
      type: String,
    },
    userEmail: {
      type: String,
    },
    userRole: {
      type: String,
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      enum: Object.values(AuditAction),
    },
    entityType: {
      type: String,
      required: [true, "Entity type is required"],
      enum: Object.values(EntityType),
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    entityName: {
      type: String,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    changes: ChangesSchema,
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    sessionId: {
      type: String,
    },
    requestId: {
      type: String,
    },
    severity: {
      type: String,
      enum: Object.values(Severity),
      default: Severity.LOW,
    },
    isSuccess: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
    },
    duration: {
      type: Number,
    },
    unionParishad: {
      type: Schema.Types.ObjectId,
      ref: "UnionParishad",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
AuditLogSchema.index({ user: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ entityType: 1 });
AuditLogSchema.index({ entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ ipAddress: 1 });
AuditLogSchema.index({ severity: 1 });
AuditLogSchema.index({ isSuccess: 1 });
AuditLogSchema.index({ unionParishad: 1 });
AuditLogSchema.index({ sessionId: 1 });

// Compound indexes
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ user: 1, action: 1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ unionParishad: 1, createdAt: -1 });

// TTL index to auto-delete old logs after 2 years
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

// Static method to create audit log
AuditLogSchema.statics.log = async function (data: {
  user?: mongoose.Types.ObjectId;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: mongoose.Types.ObjectId;
  entityName?: string;
  description: string;
  changes?: IChanges;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  severity?: Severity;
  isSuccess?: boolean;
  errorMessage?: string;
  duration?: number;
  unionParishad?: mongoose.Types.ObjectId;
}): Promise<IAuditLog> {
  return this.create({
    ...data,
    severity: data.severity || Severity.LOW,
    isSuccess: data.isSuccess !== undefined ? data.isSuccess : true,
  });
};

// Static method to get user activity
AuditLogSchema.statics.getUserActivity = async function (
  userId: mongoose.Types.ObjectId,
  limit: number = 50
): Promise<IAuditLog[]> {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get entity history
AuditLogSchema.statics.getEntityHistory = async function (
  entityType: EntityType,
  entityId: mongoose.Types.ObjectId,
  limit: number = 100
): Promise<IAuditLog[]> {
  return this.find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "name email")
    .lean();
};

export const AuditLog: AuditLogModel =
  (mongoose.models.AuditLog as AuditLogModel) || mongoose.model<IAuditLog, AuditLogModel>("AuditLog", AuditLogSchema);

export default AuditLog;
