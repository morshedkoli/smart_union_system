import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { isValidObjectId } from "@/lib/prisma-utils";
import { Prisma } from "@prisma/client";
import type { Role, Status, User } from "@prisma/client";

const SALT_ROUNDS = 12;

// Re-export enum values for the new role system
export const UserRole = {
  SECRETARY: "SECRETARY",        // Previously SUPER_ADMIN - Full access
  ENTREPRENEUR: "ENTREPRENEUR",  // Previously OPERATOR - Can add citizens, apply certificates
  CITIZEN: "CITIZEN",           // New role - Citizens with login access
} as const;

export const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type UserRole = Role;
export type UserStatus = Status;

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  nameEn?: string | null;
  nameBn?: string | null;
  phone?: string | null;
  role: Role;
  status: Status;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: UserResponse;
  token?: string;
}

export interface DevQuickLoginAccount {
  role: Role;
  name: string;
  email: string;
  password: string;
}

function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
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

async function logAudit(data: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description?: string;
  severity?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: object;
}): Promise<void> {
  try {
    // Only create audit log if we have a valid userId
    if (data.userId && isValidObjectId(data.userId)) {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId || "",
          entityName: data.entityName,
          description: data.description,
          severity: data.severity || "LOW",
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          changes: data.changes,
        },
      });
    }
  } catch {
    // Silently fail audit logging to not break main flow
    console.error("Failed to create audit log");
  }
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
    role?: Role;
  }): Promise<{ success: boolean; user?: UserResponse; message: string }> {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email.toLowerCase(),
      },
    });

    if (existingUser) {
      return { success: false, message: "Email already registered" };
    }

    const hashedPassword = await this.hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        role: data.role || "ENTREPRENEUR",
        status: "ACTIVE",
      },
    });

    // Log audit
    await logAudit({
      userId: user.id,
      action: "CREATE",
      entityType: "USER",
      entityId: user.id,
      entityName: user.name,
      description: `User registered: ${user.email}`,
      severity: "LOW",
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
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      return { success: false, message: "Invalid email or password" };
    }

    if (user.status !== "ACTIVE") {
      await logAudit({
        userId: user.id,
        action: "LOGIN_FAILED",
        entityType: "USER",
        entityId: user.id,
        entityName: user.name,
        description: `Failed login - account not active: ${email}`,
        severity: "MEDIUM",
        ipAddress,
        userAgent,
      });
      return { success: false, message: "Account is not active. Please contact administrator." };
    }

    const isValid = await this.verifyPassword(password, user.password);

    if (!isValid) {
      await logAudit({
        userId: user.id,
        action: "LOGIN_FAILED",
        entityType: "USER",
        entityId: user.id,
        entityName: user.name,
        description: `Failed login - invalid password: ${email}`,
        severity: "MEDIUM",
        ipAddress,
        userAgent,
      });
      return { success: false, message: "Invalid email or password" };
    }

    // Update last login - wrap in try-catch to not block login if update fails
    let updatedUser = user;
    try {
      await prisma.user.updateMany({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
        },
      });

      // Fetch updated user
      const fetchedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (fetchedUser) {
        updatedUser = fetchedUser;
      }
    } catch (error) {
      // If update fails due to replica set issues, continue with login anyway
      console.warn("Failed to update lastLoginAt:", error);
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Log successful login
    await logAudit({
      userId: user.id,
      action: "LOGIN",
      entityType: "USER",
      entityId: user.id,
      entityName: user.name,
      description: `User logged in: ${user.email}`,
      severity: "LOW",
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: "Login successful",
      user: toUserResponse(updatedUser),
      token,
    };
  }

  static async logout(userId: string): Promise<void> {
    if (!isValidObjectId(userId)) return;

    await logAudit({
      userId,
      action: "LOGOUT",
      entityType: "USER",
      entityId: userId,
      description: `User logged out`,
      severity: "LOW",
    });
  }

  static async getUserById(id: string): Promise<UserResponse | null> {
    if (!isValidObjectId(id)) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    return user ? toUserResponse(user) : null;
  }

  static async getUserByEmail(email: string): Promise<UserResponse | null> {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
      },
    });

    return user ? toUserResponse(user) : null;
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!isValidObjectId(userId)) {
      return { success: false, message: "Invalid user ID" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const isValid = await this.verifyPassword(currentPassword, user.password);

    if (!isValid) {
      return { success: false, message: "Current password is incorrect" };
    }

    const hashedPassword = await this.hashPassword(newPassword);

    // Use updateMany to avoid transaction requirement
    try {
      await prisma.user.updateMany({
        where: { id: userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Failed to update password:", error);
      return { success: false, message: "Failed to update password. Please try again." };
    }

    // Log password change
    await logAudit({
      userId,
      action: "PASSWORD_CHANGE",
      entityType: "USER",
      entityId: userId,
      entityName: user.name,
      description: `Password changed for user: ${user.email}`,
      severity: "HIGH",
    });

    return { success: true, message: "Password changed successfully" };
  }

  static async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      // Don't reveal if email exists
      return { success: true, message: "If the email exists, a reset link will be sent" };
    }

    // Log password reset request
    await logAudit({
      userId: user.id,
      action: "PASSWORD_RESET",
      entityType: "USER",
      entityId: user.id,
      entityName: user.name,
      description: `Password reset requested for: ${user.email}`,
      severity: "MEDIUM",
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
    if (!isValidObjectId(userId)) {
      return null;
    }

    // Use updateMany to avoid transaction requirement
    try {
      await prisma.user.updateMany({
        where: { id: userId },
        data,
      });
    } catch (error) {
      console.error("Failed to update user:", error);
      return null;
    }

    // Fetch updated user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      // Log update
      await logAudit({
        userId,
        action: "UPDATE",
        entityType: "USER",
        entityId: userId,
        entityName: user.name,
        description: `User profile updated: ${user.email}`,
        severity: "LOW",
      });
    }

    return user ? toUserResponse(user) : null;
  }

  static async ensureDevelopmentUsers(): Promise<DevQuickLoginAccount[]> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Development quick login is disabled in production");
    }

    const sharedPassword = process.env.DEV_QUICK_LOGIN_PASSWORD || "Dev@12345";

    const accounts: DevQuickLoginAccount[] = [
      {
        role: "SECRETARY",
        name: "Dev Secretary",
        email: "dev.secretary@smartunion.local",
        password: sharedPassword,
      },
      {
        role: "ENTREPRENEUR",
        name: "Dev Entrepreneur",
        email: "dev.entrepreneur@smartunion.local",
        password: sharedPassword,
      },
      {
        role: "CITIZEN",
        name: "Dev Citizen",
        email: "dev.citizen@smartunion.local",
        password: sharedPassword,
      },
    ];

    // Check if any dev user exists first
    const existingCount = await prisma.user.count({
      where: {
        email: {
          in: accounts.map(acc => acc.email.toLowerCase())
        }
      }
    });

    // Only create users if none exist - create all at once with same hash
    if (existingCount === 0) {
      const hashedPassword = await this.hashPassword(sharedPassword);

      await Promise.all(
        accounts.map(async (account) => {
          const email = account.email.toLowerCase();

          try {
            await prisma.user.create({
              data: {
                email,
                name: account.name,
                password: hashedPassword,
                role: account.role,
                status: "ACTIVE",
              },
            });
          } catch (error) {
            // If duplicate key error, just ignore (another process created it)
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              return;
            }

            throw error;
          }
        })
      );
    }

    return accounts;
  }
}
