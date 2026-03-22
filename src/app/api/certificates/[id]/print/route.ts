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
    const mode = new URL(request.url).searchParams.get("mode");

    if (mode === "history") {
      const result = await CertificateService.getPrintHistory(id);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    const result = await CertificateService.getPrintPreview(id);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Certificate print GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load print data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await resolveUserId(request);
    const body = await request.json().catch(() => ({}));
    const method = body.method === "PREVIEW" ? "PREVIEW" : "PRINT";

    const result = await CertificateService.registerPrint(id, userId, method, body.note);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Certificate print POST error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process print action" },
      { status: 500 }
    );
  }
}

