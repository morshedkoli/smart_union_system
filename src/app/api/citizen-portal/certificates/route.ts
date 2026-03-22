import { NextRequest, NextResponse } from "next/server";
import { CitizenPortalService } from "@/services";
import { getCitizenTokenPayload } from "../_lib/auth";

export async function GET(request: NextRequest) {
  try {
    const payload = await getCitizenTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const certificates = await CitizenPortalService.listApprovedCertificates(payload.userId);
    return NextResponse.json({
      success: true,
      data: certificates.map((item) => ({
        id: item._id.toString(),
        referenceNo: item.referenceNo,
        certificateNo: item.certificateNo,
        type: item.type,
        status: item.status,
        issueDate: item.issueDate,
      })),
    });
  } catch (error) {
    console.error("Citizen portal certificates error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}

