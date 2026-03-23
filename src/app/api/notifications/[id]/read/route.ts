import { NextRequest, NextResponse } from "next/server";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";
import { NotificationService } from "@/services";

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

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await resolveUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const markedAsRead = await NotificationService.markAsRead(id, userId);

    if (!markedAsRead) {
      return NextResponse.json(
        { success: false, message: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification read error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update notification" },
      { status: 500 }
    );
  }
}
