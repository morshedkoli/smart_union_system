import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production)
const store: RateLimitStore = {};

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000); // Clean every minute

function getClientIp(request: NextRequest): string {
  // Get IP from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a default (in production, use proper IP detection)
  return "unknown";
}

export function createRateLimit(config: RateLimitConfig) {
  return async function rateLimit(
    request: NextRequest
  ): Promise<{ success: boolean; limit: number; remaining: number; resetTime: number }> {
    const ip = getClientIp(request);
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();
    
    const record = store[key];
    
    if (!record || record.resetTime < now) {
      // Create new record
      store[key] = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }
    
    if (record.count >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }
    
    record.count++;
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  };
}

// Pre-configured rate limiters
export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per 15 minutes
});

export const standardRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

export const generousRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
});

// Middleware wrapper for API routes
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  rateLimiter = standardRateLimit
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    const result = await rateLimiter(request);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
            "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    const response = await handler(request);
    
    // Add rate limit headers to response
    response.headers.set("X-RateLimit-Limit", result.limit.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000).toString());
    
    return response;
  };
}
