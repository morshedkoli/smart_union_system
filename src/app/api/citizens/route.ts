import { NextRequest, NextResponse } from "next/server";
import { CitizenService } from "@/services/citizen.service";
import { CitizenStatus, Gender } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = {
      query: searchParams.get("query") || undefined,
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
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["name", "nameBn", "fatherName", "motherName", "dateOfBirth", "gender", "presentAddress", "permanentAddress"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate ward in addresses
    if (!body.presentAddress?.ward || !body.permanentAddress?.ward) {
      return NextResponse.json(
        { success: false, message: "Ward number is required in address" },
        { status: 400 }
      );
    }

    const result = await CitizenService.create(body);

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
