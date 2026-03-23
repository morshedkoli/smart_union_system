import { NextRequest, NextResponse } from "next/server";
import { CitizenService } from "@/services/citizen.service";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ citizenId: string }> }
) {
  try {
    const { citizenId } = await params;

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

    // Only SECRETARY can reject citizens
    if (payload.role !== "SECRETARY") {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const result = await CitizenService.reject(citizenId, payload.userId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Reject citizen error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reject citizen" },
      { status: 500 }
    );
  }
}
