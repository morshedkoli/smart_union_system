import { NextRequest, NextResponse } from "next/server";
import { CertificateService } from "@/services";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const certificate = await CertificateService.getById(id);
    if (!certificate) {
      return NextResponse.json(
        { success: false, message: "Certificate not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, certificate });
  } catch (error) {
    console.error("Get certificate error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch certificate" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = await resolveUserId(request);

    if (body.action === "approve") {
      const result = await CertificateService.approve(id, userId);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    const result = await CertificateService.update(
      id,
      {
        finalText: body.finalText,
        dataSnapshot: body.dataSnapshot,
      },
      userId
    );
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Update certificate error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update certificate" },
      { status: 500 }
    );
  }
}

