import { NextRequest, NextResponse } from "next/server";
import { HoldingTaxService, PaymentMethod } from "@/services/holding-tax.service";
import { checkHoldingTax } from "@/server-middleware/holding-tax.middleware";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

const getHandler = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const citizenId = searchParams.get("citizenId");
    const fiscalYear = searchParams.get("fiscalYear");

    if (citizenId) {
      const taxes = await HoldingTaxService.getBycitizenId(citizenId);
      return NextResponse.json({ success: true, taxes });
    }

    // Get stats if no citizenId
    const stats = await HoldingTaxService.getStats(fiscalYear || undefined);
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Get holding tax error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch holding tax data" },
      { status: 500 }
    );
  }
};

export async function POST(request: NextRequest) {
  try {
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

    if (body.action === "check-service") {
      if (!body.citizenId) {
        return NextResponse.json(
          { success: false, message: "citizenId is required" },
          { status: 400 }
        );
      }

      const result = await checkHoldingTax(body.citizenId, { blockService: true });
      return NextResponse.json({ success: true, ...result });
    }

    if (body.action === "mark-paid") {
      if (!body.taxId) {
        return NextResponse.json(
          { success: false, message: "taxId is required" },
          { status: 400 }
        );
      }

      const paymentMethod = body.paymentMethod as PaymentMethod | undefined;
      if (!paymentMethod) {
        return NextResponse.json(
          { success: false, message: "paymentMethod is required" },
          { status: 400 }
        );
      }

      const collectedBy = payload.userId;
      const result = await HoldingTaxService.markAsPaid(
        body.taxId,
        paymentMethod,
        collectedBy,
        body.notes
      );

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    }

    const requiredFields = ["citizenId", "holdingInfo", "fiscalYear", "assessment", "dueDate"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    if (!body.holdingInfo.holdingNo || !body.holdingInfo.ward) {
      return NextResponse.json(
        { success: false, message: "Holding number and ward are required" },
        { status: 400 }
      );
    }

    const result = await HoldingTaxService.create(body, payload.userId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create holding tax error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create holding tax" },
      { status: 500 }
    );
  }
}

export const GET = getHandler;
