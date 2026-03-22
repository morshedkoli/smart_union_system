import { NextResponse } from "next/server";
import { NotificationService } from "@/services";

export async function GET() {
  try {
    const summary = await NotificationService.getAlerts(6);
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

