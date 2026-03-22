import { NextRequest, NextResponse } from "next/server";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";
import { SettingsService } from "@/services";

async function resolveAuth(request: NextRequest): Promise<{
  userId: string;
  role: "SECRETARY" | "ENTREPRENEUR" | "CITIZEN";
} | null> {
  const cookieToken = request.cookies.get("auth-token")?.value;
  const headerToken = getTokenFromHeader(request.headers.get("authorization"));
  const token = cookieToken || headerToken;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.userId || !payload.role) return null;
  return {
    userId: payload.userId,
    role: payload.role,
  };
}

function isSecretary(role: string): boolean {
  return role === "SECRETARY"; // SECRETARY is the super admin
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth || !isSecretary(auth.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await SettingsService.getUnionProfile();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get union settings error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth || !isSecretary(auth.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const unionName = String(body.unionName || "").trim();
    const logo = String(body.logo || "").trim();
    const signature = String(body.signature || "").trim();

    if (!unionName) {
      return NextResponse.json(
        { success: false, message: "Union name is required" },
        { status: 400 }
      );
    }

    await SettingsService.upsertUnionProfile({
      unionName,
      logo,
      signature,
    });

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Update union settings error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update settings" },
      { status: 500 }
    );
  }
}

