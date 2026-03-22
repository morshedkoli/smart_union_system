import { NextRequest, NextResponse } from "next/server";
import { CertificateService } from "@/services";
import { CertificateStatus, CertificateType } from "@prisma/client";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

async function resolveUserId(request: NextRequest): Promise<string | undefined> {
  const cookieToken = request.cookies.get("auth-token")?.value;
  const headerToken = getTokenFromHeader(request.headers.get("authorization"));
  const token = cookieToken || headerToken;
  if (!token) {
    return undefined;
  }
  const payload = await verifyToken(token);
  return payload?.userId;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as CertificateStatus | null;
    const certificates = await CertificateService.list(status || undefined);
    return NextResponse.json({ success: true, certificates });
  } catch (error) {
    console.error("List certificates error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = await resolveUserId(request);

    if (body.action === "submit") {
      if (!body.certificateId) {
        return NextResponse.json(
          { success: false, message: "certificateId is required" },
          { status: 400 }
        );
      }
      const result = await CertificateService.submit(body.certificateId, userId);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (!body.citizenId || !body.type || !body.templateId) {
      return NextResponse.json(
        { success: false, message: "citizenId, type and templateId are required" },
        { status: 400 }
      );
    }

    const result = await CertificateService.create(
      {
        citizenId: body.citizenId,
        type: body.type as CertificateType,
        templateId: body.templateId,
        dataSnapshot: {
          name: body.dataSnapshot?.name,
          father_name: body.dataSnapshot?.father_name,
        },
      },
      userId
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create certificate error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create certificate" },
      { status: 500 }
    );
  }
}
