import { NextRequest, NextResponse } from "next/server";
import { CitizenService } from "@/services/citizen.service";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Get user from token
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
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    // Only SECRETARY can view pending citizens
    if (payload.role !== "SECRETARY") {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;

    const result = await CitizenService.getPendingCitizens({ page, limit });
    const pendingCount = await CitizenService.getPendingCount();

    return NextResponse.json({
      success: true,
      ...result,
      pendingCount,
    });
  } catch (error) {
    console.error("Pending citizens list error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch pending citizens" },
      { status: 500 }
    );
  }
}
