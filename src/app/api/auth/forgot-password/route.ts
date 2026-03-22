import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const result = await AuthService.requestPasswordReset(body.email);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
