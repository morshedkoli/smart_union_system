import { NextRequest, NextResponse } from "next/server";
import { CertificateService } from "@/services";
import { generateCertificatePdf } from "@/lib/pdf";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const cookieToken = request.cookies.get("auth-token")?.value;
    const headerToken = getTokenFromHeader(request.headers.get("authorization"));
    const token = cookieToken || headerToken;
    const payload = token ? await verifyToken(token) : null;

    const printCheck = await CertificateService.registerPrint(
      id,
      payload?.userId,
      "PRINT",
      "PDF export"
    );
    if (!printCheck.success) {
      return NextResponse.json(
        { success: false, message: printCheck.message },
        { status: 400 }
      );
    }

    const pdfData = await CertificateService.getPdfDataById(id);
    if (!pdfData.success || !pdfData.data) {
      return NextResponse.json(
        { success: false, message: pdfData.message },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateCertificatePdf(pdfData.data);
    const fileName = `${pdfData.data.referenceNo}.pdf`;

    const uint8Array = new Uint8Array(pdfBuffer);
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Generate certificate PDF error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate certificate PDF" },
      { status: 500 }
    );
  }
}

