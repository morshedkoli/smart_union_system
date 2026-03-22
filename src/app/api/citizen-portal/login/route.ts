import { NextRequest, NextResponse } from "next/server";
import { CitizenPortalService } from "@/services";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nid = body.nid as string;
    const dateOfBirth = body.dateOfBirth as string;

    if (!nid || !dateOfBirth) {
      return NextResponse.json(
        { success: false, message: "nid and dateOfBirth are required" },
        { status: 400 }
      );
    }

    const result = await CitizenPortalService.loginWithNidAndDob(nid, dateOfBirth);
    if (!result.success || !result.token || !result.citizen) {
      return NextResponse.json(result, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      citizen: {
        id: result.citizen._id.toString(),
        name: result.citizen.name,
        nameBn: result.citizen.nameBn,
        nid: result.citizen.nid,
        dateOfBirth: result.citizen.dateOfBirth,
        mobile: result.citizen.mobile,
      },
      message: result.message,
    });

    response.cookies.set("citizen-auth-token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Citizen portal login error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to login to citizen portal" },
      { status: 500 }
    );
  }
}

