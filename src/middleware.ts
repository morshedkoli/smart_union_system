import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { jwtVerify } from "jose";

// Role-based route protection
const roleProtectedRoutes: Record<string, string[]> = {
  // Secretary only routes
  "/dashboard/users": ["SECRETARY"],
  "/dashboard/settings": ["SECRETARY"],
  "/dashboard/certificates/templates": ["SECRETARY"],
  "/dashboard/certificates/approvals": ["SECRETARY"],
  "/dashboard/reports": ["SECRETARY"],
  "/dashboard/finance": ["SECRETARY"],
  "/dashboard/excel": ["SECRETARY"],
  "/dashboard/relief": ["SECRETARY"],

  // Secretary and Entrepreneur routes
  "/dashboard/citizens": ["SECRETARY", "ENTREPRENEUR"],
  "/dashboard/certificates": ["SECRETARY", "ENTREPRENEUR"],
  "/dashboard/certificates/apply": ["SECRETARY", "ENTREPRENEUR"],
  "/dashboard/search": ["SECRETARY", "ENTREPRENEUR"],
  "/dashboard/taxes": ["SECRETARY", "ENTREPRENEUR"],

  // Citizen only routes
  "/dashboard/my-certificates": ["CITIZEN"],
  "/dashboard/apply-certificate": ["CITIZEN"],
  "/dashboard/my-taxes": ["CITIZEN"],

  // All authenticated users
  "/dashboard": ["SECRETARY", "ENTREPRENEUR", "CITIZEN"],
  "/dashboard/profile": ["SECRETARY", "ENTREPRENEUR", "CITIZEN"],
};

// Verify JWT token without database call (Edge compatible)
async function verifyTokenEdge(token: string): Promise<{ userId: string; role: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-change-in-production");
    const { payload } = await jwtVerify(token, secret);

    if (payload.userId && payload.role) {
      return {
        userId: payload.userId as string,
        role: payload.role as string,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected dashboard route
  const isDashboardRoute = pathname.includes("/dashboard");

  if (!isDashboardRoute) {
    // Handle internationalization for non-dashboard routes
    const intlMiddleware = createMiddleware(routing);
    return intlMiddleware(request);
  }

  // Extract locale from path
  const locale = pathname.split('/')[1];
  const routeWithoutLocale = pathname.replace(`/${locale}`, '');

  // Check if route needs protection
  const allowedRoles = roleProtectedRoutes[routeWithoutLocale];

  if (!allowedRoles) {
    // Route not explicitly protected, allow access
    const intlMiddleware = createMiddleware(routing);
    return intlMiddleware(request);
  }

  // Check authentication
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    // Redirect to login if no token
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  try {
    const payload = await verifyTokenEdge(token);

    if (!payload) {
      // Invalid token, redirect to login
      const response = NextResponse.redirect(new URL(`/${locale}/login`, request.url));
      response.cookies.delete("auth-token");
      return response;
    }

    // Check role authorization using JWT payload (no database call needed)
    // SECRETARY has access to all routes
    if (payload.role !== "SECRETARY" && !allowedRoles.includes(payload.role)) {
      // Access denied, redirect to dashboard home
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    // User is authorized, continue with internationalization
    const intlMiddleware = createMiddleware(routing);
    return intlMiddleware(request);

  } catch (error) {
    console.error("Auth middleware error:", error);
    // Token verification failed, redirect to login
    const response = NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    response.cookies.delete("auth-token");
    return response;
  }
}

export default authMiddleware;

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Next.js internals (_next)
  // - Static files (images, fonts, etc.)
  // - Favicon
  matcher: ["/((?!api|_next|.*\\..*|favicon.ico).*)"],
};
