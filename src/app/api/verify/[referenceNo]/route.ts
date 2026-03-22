import { NextRequest, NextResponse } from "next/server";
import { CertificateService } from "@/services";

interface RouteParams {
  params: Promise<{ referenceNo: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { referenceNo } = await params;
    const result = await CertificateService.verifyByReference(referenceNo);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Certificate verification error:", error);
    return NextResponse.json(
      { success: false, valid: false, message: "Failed to verify certificate" },
      { status: 500 }
    );
  }
}

