import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, message: "Not found" },
      { status: 404 }
    );
  }

  try {
    const accounts = await AuthService.ensureDevelopmentUsers();
    return NextResponse.json({
      success: true,
      accounts: accounts.map(({ role, name, email, password }) => ({
        role,
        name,
        email,
        password,
      })),
    });
  } catch (error) {
    console.error("Dev quick login setup error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to initialize development accounts" },
      { status: 500 }
    );
  }
}
