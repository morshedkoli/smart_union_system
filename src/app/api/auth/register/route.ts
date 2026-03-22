import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { standardRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";
import { sanitizeEmail, deepSanitize } from "@/lib/sanitize";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await standardRateLimit(request);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Too many requests. Please try again later.",
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
      registerSchema.parse(body);
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

    // Sanitize input
    const sanitizedData = deepSanitize({
      email: sanitizeEmail(body.email),
      password: body.password,
      name: body.name,
      phone: body.phone,
      role: body.role,
    });

    const result = await AuthService.register(sanitizedData);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const response = NextResponse.json(result, { status: 201 });

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
