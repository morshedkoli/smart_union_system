import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";
import { Role, JWTPayload } from "@/types/auth";

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export type RouteHandler = (
  request: AuthenticatedRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Middleware to check if the request is authenticated
 */
export function checkAuth(handler: RouteHandler): RouteHandler {
  return async (request: AuthenticatedRequest, context) => {
    const cookieToken = request.cookies.get("auth-token")?.value;
    const headerToken = getTokenFromHeader(request.headers.get("authorization"));
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Attach user to request
    request.user = payload;

    return handler(request, context);
  };
}

/**
 * Middleware to check if the user has the required role
 */
export function checkRole(...allowedRoles: Role[]): (handler: RouteHandler) => RouteHandler {
  return (handler: RouteHandler) => {
    return checkAuth(async (request: AuthenticatedRequest, context) => {
      if (!request.user) {
        return NextResponse.json(
          { success: false, message: "Authentication required" },
          { status: 401 }
        );
      }

      if (!allowedRoles.includes(request.user.role)) {
        return NextResponse.json(
          { success: false, message: "Insufficient permissions" },
          { status: 403 }
        );
      }

      return handler(request, context);
    });
  };
}

/**
 * Middleware to check if user is admin (SECRETARY)
 */
export function checkAdmin(handler: RouteHandler): RouteHandler {
  return checkRole("SECRETARY")(handler);
}

/**
 * Middleware to check if user is super admin (SECRETARY)
 */
export function checkSuperAdmin(handler: RouteHandler): RouteHandler {
  return checkRole("SECRETARY")(handler);
}

/**
 * Combined middleware helper
 */
export function withAuth<T extends RouteHandler>(handler: T): T {
  return checkAuth(handler) as T;
}

export function withRole<T extends RouteHandler>(...roles: Role[]): (handler: T) => T {
  return (handler: T) => checkRole(...roles)(handler) as T;
}
