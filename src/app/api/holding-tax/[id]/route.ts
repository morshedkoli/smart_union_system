import { NextRequest, NextResponse } from "next/server";
import { HoldingTaxService } from "@/services/holding-tax.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "history") {
      const result = await HoldingTaxService.getPaymentHistory(id);
      if (!result.tax) {
        return NextResponse.json(
          { success: false, message: "Holding tax not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, ...result });
    }

    const receiptNo = searchParams.get("receiptNo");
    if (receiptNo) {
      const result = await HoldingTaxService.getReceipt(id, receiptNo);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    const tax = await HoldingTaxService.getById(id);

    if (!tax) {
      return NextResponse.json(
        { success: false, message: "Holding tax not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, tax });
  } catch (error) {
    console.error("Get holding tax error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch holding tax" },
      { status: 500 }
    );
  }
}
