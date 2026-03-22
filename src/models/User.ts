import mongoose, { Schema, Document, Model } from "mongoose";

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
  VIEWER = "VIEWER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  nameEn?: string;
  nameBn?: string;
  phone?: string;
  mobile?: string;
  nid?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  unionParishad?: mongoose.Types.ObjectId;
  permissions: string[];
  lastLoginAt?: Date;
  lastLoginIp?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    nameEn: {
      type: String,
      trim: true,
    },
    nameBn: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^(?:\+?880|0)?1[3-9]\d{8}$/, "Please enter a valid Bangladesh mobile number"],
    },
    nid: {
      type: String,
      trim: true,
      match: [/^\d{10}$|^\d{13}$|^\d{17}$/, "Please enter a valid NID number"],
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.OPERATOR,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    unionParishad: {
      type: Schema.Types.ObjectId,
      ref: "UnionParishad",
    },
    permissions: [{
      type: String,
    }],
    lastLoginAt: {
      type: Date,
    },
    lastLoginIp: {
      type: String,
    },
    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
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
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ mobile: 1 }, { sparse: true });
UserSchema.index({ nid: 1 }, { sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ deletedAt: 1 });
UserSchema.index({ unionParishad: 1 });

// Soft delete filter
UserSchema.pre("find", function () {
  this.where({ deletedAt: null });
});

UserSchema.pre("findOne", function () {
  this.where({ deletedAt: null });
});

// Methods
UserSchema.methods.softDelete = function (): Promise<IUser> {
  this.deletedAt = new Date();
  return this.save();
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
