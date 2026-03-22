import mongoose, { Schema, Document, Model } from "mongoose";

export enum NotificationType {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
  ALERT = "ALERT",
}

export enum NotificationChannel {
  IN_APP = "IN_APP",
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH = "PUSH",
}

export enum NotificationCategory {
  SYSTEM = "SYSTEM",
  CERTIFICATE = "CERTIFICATE",
  TAX = "TAX",
  RELIEF = "RELIEF",
  PAYMENT = "PAYMENT",
  REMINDER = "REMINDER",
  ANNOUNCEMENT = "ANNOUNCEMENT",
  APPROVAL = "APPROVAL",
  TASK = "TASK",
}

export enum NotificationStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
  FAILED = "FAILED",
  ARCHIVED = "ARCHIVED",
}

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  recipientType: "user" | "citizen";
  recipientEmail?: string;
  recipientPhone?: string;
  sender?: mongoose.Types.ObjectId;
  type: NotificationType;
  category: NotificationCategory;
  channel: NotificationChannel;
  title: string;
  titleBn?: string;
  message: string;
  messageBn?: string;
  link?: string;
  linkText?: string;
  icon?: string;
  image?: string;
  data?: Record<string, unknown>;
  entityType?: string;
  entityId?: mongoose.Types.ObjectId;
  priority: number;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  scheduledFor?: Date;
  expiresAt?: Date;
  isArchived: boolean;
  unionParishad?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      required: [true, "Recipient is required"],
      refPath: "recipientType",
    },
    recipientType: {
      type: String,
      required: true,
      enum: ["user", "citizen"],
      default: "user",
    },
    recipientEmail: {
      type: String,
    },
    recipientPhone: {
      type: String,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(NotificationType),
      default: NotificationType.INFO,
    },
    category: {
      type: String,
      required: true,
      enum: Object.values(NotificationCategory),
      default: NotificationCategory.SYSTEM,
    },
    channel: {
      type: String,
      required: true,
      enum: Object.values(NotificationChannel),
      default: NotificationChannel.IN_APP,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 200,
    },
    titleBn: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    messageBn: {
      type: String,
      trim: true,
    },
    link: {
      type: String,
    },
    linkText: {
      type: String,
    },
    icon: {
      type: String,
    },
    image: {
      type: String,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    entityType: {
      type: String,
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.PENDING,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    scheduledFor: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    unionParishad: {
      type: Schema.Types.ObjectId,
      ref: "UnionParishad",
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
NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ recipientType: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ category: 1 });
NotificationSchema.index({ channel: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ priority: -1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ scheduledFor: 1 });
NotificationSchema.index({ expiresAt: 1 });
NotificationSchema.index({ isArchived: 1 });
NotificationSchema.index({ deletedAt: 1 });
NotificationSchema.index({ unionParishad: 1 });

// Compound indexes
NotificationSchema.index({ recipient: 1, status: 1 });
NotificationSchema.index({ recipient: 1, isArchived: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, readAt: 1 });
NotificationSchema.index({ channel: 1, status: 1, scheduledFor: 1 });

// TTL index to auto-delete expired notifications
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Soft delete filter
NotificationSchema.pre("find", function () {
  this.where({ deletedAt: null });
});

NotificationSchema.pre("findOne", function () {
  this.where({ deletedAt: null });
});

// Virtual for isRead
NotificationSchema.virtual("isRead").get(function () {
  return !!this.readAt;
});

// Virtual for isExpired
NotificationSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Methods
NotificationSchema.methods.markAsRead = async function (): Promise<INotification> {
  this.status = NotificationStatus.READ;
  this.readAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsSent = async function (): Promise<INotification> {
  this.status = NotificationStatus.SENT;
  this.sentAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsDelivered = async function (): Promise<INotification> {
  this.status = NotificationStatus.DELIVERED;
  this.deliveredAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsFailed = async function (
  reason: string
): Promise<INotification> {
  this.status = NotificationStatus.FAILED;
  this.failedAt = new Date();
  this.failureReason = reason;
  this.retryCount += 1;
  return this.save();
};

NotificationSchema.methods.archive = async function (): Promise<INotification> {
  this.isArchived = true;
  this.status = NotificationStatus.ARCHIVED;
  return this.save();
};

NotificationSchema.methods.softDelete = function (): Promise<INotification> {
  this.deletedAt = new Date();
  return this.save();
};

// Static methods
NotificationSchema.statics.getUnreadCount = async function (
  recipientId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    recipient: recipientId,
    readAt: null,
    status: { $in: [NotificationStatus.SENT, NotificationStatus.DELIVERED] },
    isArchived: false,
    deletedAt: null,
  });
};

NotificationSchema.statics.getUnread = async function (
  recipientId: mongoose.Types.ObjectId,
  limit: number = 20
): Promise<INotification[]> {
  return this.find({
    recipient: recipientId,
    readAt: null,
    status: { $in: [NotificationStatus.SENT, NotificationStatus.DELIVERED] },
    isArchived: false,
    deletedAt: null,
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .lean();
};

NotificationSchema.statics.markAllAsRead = async function (
  recipientId: mongoose.Types.ObjectId
): Promise<void> {
  await this.updateMany(
    {
      recipient: recipientId,
      readAt: null,
      deletedAt: null,
    },
    {
      status: NotificationStatus.READ,
      readAt: new Date(),
    }
  );
};

NotificationSchema.statics.getPendingToSend = async function (
  channel: NotificationChannel,
  limit: number = 100
): Promise<INotification[]> {
  const now = new Date();
  return this.find({
    channel,
    status: NotificationStatus.PENDING,
    $or: [
      { scheduledFor: null },
      { scheduledFor: { $lte: now } },
    ],
    retryCount: { $lt: 3 },
    deletedAt: null,
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
