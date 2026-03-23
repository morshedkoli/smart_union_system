import { NextRequest, NextResponse } from "next/server";
import { updateCitizenSchema } from "@/lib/validation";
import { CitizenService } from "@/services/citizen.service";

interface RouteParams {
  params: Promise<{ citizenId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { citizenId } = await params;
    const citizen = await CitizenService.getById(citizenId);

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
    const { citizenId } = await params;
    const body = await request.json();
    const parsedBody = updateCitizenSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsedBody.error.issues[0]?.message || "Invalid citizen payload",
        },
        { status: 400 }
      );
    }

    const result = await CitizenService.update(citizenId, parsedBody.data);

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
    const { citizenId } = await params;
    const result = await CitizenService.delete(citizenId);

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
