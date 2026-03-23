import { NextRequest, NextResponse } from "next/server";
import { createCitizenSchema } from "@/lib/validation";
import { CitizenService } from "@/services/citizen.service";
import { CitizenStatus, Gender } from "@prisma/client";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || searchParams.get("search") || undefined;

    const params = {
      query,
      ward: searchParams.get("ward") ? parseInt(searchParams.get("ward")!) : undefined,
      status: searchParams.get("status") as CitizenStatus | undefined,
      gender: searchParams.get("gender") as Gender | undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };

    const result = await CitizenService.search(params);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Citizens list error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch citizens" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from token
    const cookieToken = request.cookies.get("auth-token")?.value;
    const headerToken = getTokenFromHeader(request.headers.get("authorization"));
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsedBody = createCitizenSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsedBody.error.issues[0]?.message || "Invalid citizen payload",
        },
        { status: 400 }
      );
    }

    const result = await CitizenService.create(
      parsedBody.data,
      payload.userId,
      payload.role
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create citizen error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create citizen" },
      { status: 500 }
    );
  }
}
