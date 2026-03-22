import { NextRequest, NextResponse } from "next/server";
import { CitizenService } from "@/services/citizen.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const citizen = await CitizenService.getById(id);

    if (!citizen) {
      return NextResponse.json(
        { success: false, message: "Citizen not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      citizen,
    });
  } catch (error) {
    console.error("Get citizen error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch citizen" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = await CitizenService.update(id, body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update citizen error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update citizen" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await CitizenService.delete(id);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Delete citizen error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete citizen" },
      { status: 500 }
    );
  }
}
