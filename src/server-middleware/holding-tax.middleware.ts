import { NextRequest, NextResponse } from "next/server";
import { HoldingTaxService } from "@/services/holding-tax.service";

export interface CheckHoldingTaxOptions {
  citizenId: string;
  blockService?: boolean;
}

export async function checkHoldingTax(
  citizenId: string,
  options: { blockService?: boolean } = {}
): Promise<{
  allowed: boolean;
  hasUnpaidTax: boolean;
  unpaidTaxes: unknown[];
  totalDue: number;
  message?: string;
}> {
  const { hasUnpaid, unpaidTaxes, totalDue } = await HoldingTaxService.checkUnpaidTax(citizenId);

  if (hasUnpaid && options.blockService) {
    return {
      allowed: false,
      hasUnpaidTax: true,
      unpaidTaxes,
      totalDue,
      message: "Cannot proceed. Please clear all pending holding tax before requesting services.",
    };
  }

  return {
    allowed: true,
    hasUnpaidTax: hasUnpaid,
    unpaidTaxes,
    totalDue,
  };
}

export async function withHoldingTaxCheck(
  request: NextRequest,
  handler: (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>,
  context?: { params: Promise<Record<string, string>> },
  options: { blockService?: boolean } = {}
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const citizenId = body.citizenId;

    if (!citizenId) {
      return NextResponse.json(
        { success: false, message: "Citizen ID is required" },
        { status: 400 }
      );
    }

    const taxCheck = await checkHoldingTax(citizenId, options);

    if (!taxCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: taxCheck.message,
          hasUnpaidTax: true,
          totalDue: taxCheck.totalDue,
        },
        { status: 403 }
      );
    }

    // Create new request with original body
    const newRequest = new NextRequest(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    });

    return handler(newRequest, context);
  } catch (error) {
    console.error("Holding tax check error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to check holding tax status" },
      { status: 500 }
    );
  }
}
