import { NextRequest, NextResponse } from "next/server";
import { HoldingTaxService } from "@/services/holding-tax.service";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const body = await request.json();

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid amount is required" },
        { status: 400 }
      );
    }

    if (!body.paymentMethod) {
      return NextResponse.json(
        { success: false, message: "Payment method is required" },
        { status: 400 }
      );
    }

    const collectedBy = payload.userId || body.collectedBy;

    const result = await HoldingTaxService.addPayment(id, body, collectedBy);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Add payment error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add payment" },
      { status: 500 }
    );
  }
}
