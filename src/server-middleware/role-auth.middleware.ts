import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: "SECRETARY" | "ENTREPRENEUR" | "CITIZEN";
  status: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser;
}

export type RolePermission = "SECRETARY" | "ENTREPRENEUR" | "CITIZEN";

// Role hierarchy - higher roles include permissions of lower roles
const ROLE_HIERARCHY: Record<string, number> = {
  CITIZEN: 1,
  ENTREPRENEUR: 2,
  SECRETARY: 3,
};

// Check if user has required role or higher
export function hasRoleOrHigher(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return null;
    }

    const user = await AuthService.getUserById(payload.userId);
    if (!user || user.status !== "ACTIVE") {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "SECRETARY" | "ENTREPRENEUR" | "CITIZEN",
      status: user.status,
    };
  } catch {
    return null;
  }
}

export function requireAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const authRequest = request as AuthenticatedRequest;
    authRequest.user = user;
    return handler(authRequest);
  };
}

export function requireRole(roles: RolePermission | RolePermission[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return function (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
    return requireAuth(async (request: AuthenticatedRequest) => {
      const hasAccess = allowedRoles.some(role =>
        hasRoleOrHigher(request.user.role, role)
      );

      if (!hasAccess) {
        return NextResponse.json(
          {
            success: false,
            message: "Insufficient permissions",
            requiredRoles: allowedRoles,
            userRole: request.user.role
          },
          { status: 403 }
        );
      }

      return handler(request);
    });
  };
}

// Specific role middlewares
export const requireSecretary = requireRole("SECRETARY");
export const requireEntrepreneur = requireRole("ENTREPRENEUR");
export const requireCitizen = requireRole("CITIZEN");

// Combined role middlewares
export const requireSecretaryOrEntrepreneur = requireRole(["SECRETARY", "ENTREPRENEUR"]);
export const requireAnyRole = requireRole(["SECRETARY", "ENTREPRENEUR", "CITIZEN"]);

// Legacy compatibility - map old names to new system
export const checkAdmin = requireSecretary; // SECRETARY replaces SUPER_ADMIN
export const checkOperator = requireEntrepreneur; // ENTREPRENEUR replaces OPERATOR