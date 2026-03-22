import { NextRequest, NextResponse } from "next/server";
import { generateCertificatePdf } from "@/lib/pdf";
import { CitizenPortalService, CertificateService } from "@/services";
import { getCitizenTokenPayload } from "../../../_lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getCitizenTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const certificate = await CitizenPortalService.getApprovedCertificateForCitizen(
      payload.userId,
      id
    );
    if (!certificate) {
      return NextResponse.json(
        { success: false, message: "Certificate not found" },
        { status: 404 }
      );
    }

    const printCheck = await CertificateService.registerPrint(
      id,
      payload.userId,
      "PRINT",
      "Citizen portal download"
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
        { success: false, message: pdfData.message || "Failed to load certificate" },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateCertificatePdf(pdfData.data);
    const fileName = `${pdfData.data.referenceNo}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Citizen portal certificate download error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to download certificate" },
      { status: 500 }
    );
  }
}

