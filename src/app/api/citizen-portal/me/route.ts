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

    const citizen = await CitizenPortalService.getCitizenById(payload.userId);
    if (!citizen) {
      return NextResponse.json(
        { success: false, message: "Citizen not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: citizen._id.toString(),
        name: citizen.name,
        nameBn: citizen.nameBn,
        nid: citizen.nid,
        mobile: citizen.mobile,
        dateOfBirth: citizen.dateOfBirth,
      },
    });
  } catch (error) {
    console.error("Citizen portal me error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

