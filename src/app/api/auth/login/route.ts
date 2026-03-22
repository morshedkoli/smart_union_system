import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { strictRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";
import { sanitizeEmail } from "@/lib/sanitize";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await strictRateLimit(request);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Too many login attempts. Please try again later.",
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    const body = await request.json();

    // Validate input with Zod
    try {
      loginSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        const errors = validationError.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return NextResponse.json(
          { success: false, message: "Validation failed", errors },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(body.email);

    // Get client IP and user agent for audit
    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const result = await AuthService.login(
      sanitizedEmail,
      body.password,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    const response = NextResponse.json(result, { status: 200 });

    // Set HTTP-only cookie for token
    response.cookies.set("auth-token", result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
