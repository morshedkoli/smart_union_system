import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User, IUser, UserRole, UserStatus } from "@/models/User";
import { signToken } from "@/lib/auth";
import mongoose from "mongoose";
import { AuditLog, AuditAction, EntityType, Severity } from "@/models/AuditLog";

const SALT_ROUNDS = 12;

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  nameEn?: string;
  nameBn?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: UserResponse;
  token?: string;
}

function toUserResponse(user: IUser): UserResponse {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    nameEn: user.nameEn,
    nameBn: user.nameBn,
    phone: user.phone,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: UserRole;
  }): Promise<{ success: boolean; user?: UserResponse; message: string }> {
    await connectDB();

    const existingUser = await User.findOne({
      email: data.email.toLowerCase(),
      deletedAt: null,
    });

    if (existingUser) {
      return { success: false, message: "Email already registered" };
    }

    const hashedPassword = await this.hashPassword(data.password);

    const user = await User.create({
      email: data.email.toLowerCase(),
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      role: data.role || UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
    });

    // Log audit
    await AuditLog.log({
      action: AuditAction.CREATE,
      entityType: EntityType.USER,
      entityId: user._id,
      entityName: user.name,
      description: `User registered: ${user.email}`,
      severity: Severity.LOW,
    });

    return {
      success: true,
      user: toUserResponse(user),
      message: "Registration successful",
    };
  }

  static async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    await connectDB();

    const user = await User.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    }).select("+password");

    if (!user) {
      await AuditLog.log({
        action: AuditAction.LOGIN_FAILED,
        entityType: EntityType.USER,
        description: `Failed login attempt for email: ${email}`,
        severity: Severity.MEDIUM,
        ipAddress,
        userAgent,
        isSuccess: false,
        errorMessage: "User not found",
      });
      return { success: false, message: "Invalid email or password" };
    }

    if (user.status !== UserStatus.ACTIVE) {
      await AuditLog.log({
        action: AuditAction.LOGIN_FAILED,
        entityType: EntityType.USER,
        entityId: user._id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        description: `Failed login - account not active: ${email}`,
        severity: Severity.MEDIUM,
        ipAddress,
        userAgent,
        isSuccess: false,
        errorMessage: "Account is not active",
      });
      return { success: false, message: "Account is not active. Please contact administrator." };
    }

    const isValid = await this.verifyPassword(password, user.password);

    if (!isValid) {
      await AuditLog.log({
        action: AuditAction.LOGIN_FAILED,
        entityType: EntityType.USER,
        entityId: user._id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        description: `Failed login - invalid password: ${email}`,
        severity: Severity.MEDIUM,
        ipAddress,
        userAgent,
        isSuccess: false,
        errorMessage: "Invalid password",
      });
      return { success: false, message: "Invalid email or password" };
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await user.save();

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Log successful login
    await AuditLog.log({
      action: AuditAction.LOGIN,
      entityType: EntityType.USER,
      entityId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      description: `User logged in: ${user.email}`,
      severity: Severity.LOW,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: "Login successful",
      user: toUserResponse(user),
      token,
    };
  }

  static async logout(userId: string): Promise<void> {
    await connectDB();
    
    await AuditLog.log({
      action: AuditAction.LOGOUT,
      entityType: EntityType.USER,
      entityId: new mongoose.Types.ObjectId(userId),
      description: `User logged out`,
      severity: Severity.LOW,
    });
  }

  static async getUserById(id: string): Promise<UserResponse | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const user = await User.findById(id);
    return user ? toUserResponse(user) : null;
  }

  static async getUserByEmail(email: string): Promise<UserResponse | null> {
    await connectDB();

    const user = await User.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    });

    return user ? toUserResponse(user) : null;
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { success: false, message: "Invalid user ID" };
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const isValid = await this.verifyPassword(currentPassword, user.password);

    if (!isValid) {
      return { success: false, message: "Current password is incorrect" };
    }

    const hashedPassword = await this.hashPassword(newPassword);

    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Log password change
    await AuditLog.log({
      action: AuditAction.PASSWORD_CHANGE,
      entityType: EntityType.USER,
      entityId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      description: `Password changed for user: ${user.email}`,
      severity: Severity.HIGH,
    });

    return { success: true, message: "Password changed successfully" };
  }

  static async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    await connectDB();

    const user = await User.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    });

    if (!user) {
      // Don't reveal if email exists
      return { success: true, message: "If the email exists, a reset link will be sent" };
    }

    // Log password reset request
    await AuditLog.log({
      action: AuditAction.PASSWORD_RESET,
      entityType: EntityType.USER,
      entityId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      description: `Password reset requested for: ${user.email}`,
      severity: Severity.MEDIUM,
    });

    // In production, generate reset token and send email
    return { success: true, message: "If the email exists, a reset link will be sent" };
  }

  static async updateUser(
    userId: string,
    data: Partial<{
      name: string;
      nameEn: string;
      nameBn: string;
      phone: string;
    }>
  ): Promise<UserResponse | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { ...data, updatedAt: new Date() },
      { new: true }
    );

    if (user) {
      // Log update
      await AuditLog.log({
        action: AuditAction.UPDATE,
        entityType: EntityType.USER,
        entityId: user._id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        description: `User profile updated: ${user.email}`,
        severity: Severity.LOW,
      });
    }

    return user ? toUserResponse(user) : null;
  }
}
