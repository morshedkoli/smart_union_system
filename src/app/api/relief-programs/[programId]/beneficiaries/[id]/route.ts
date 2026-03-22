import { NextRequest, NextResponse } from "next/server";
import { BeneficiaryStatus } from "@/models";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";
import { ReliefService } from "@/services";

interface RouteParams {
  params: Promise<{ programId: string; id: string }>;
}

async function resolveUserId(request: NextRequest): Promise<string | undefined> {
  const cookieToken = request.cookies.get("auth-token")?.value;
  const headerToken = getTokenFromHeader(request.headers.get("authorization"));
  const token = cookieToken || headerToken;
  if (!token) return undefined;
  const payload = await verifyToken(token);
  return payload?.userId;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = await resolveUserId(request);

    if (body.action === "approve") {
      const result = await ReliefService.approveBeneficiary(id, userId);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (body.action === "review") {
      const status = body.status as BeneficiaryStatus;
      if (![BeneficiaryStatus.VERIFIED, BeneficiaryStatus.REJECTED].includes(status)) {
        return NextResponse.json(
          { success: false, message: "Invalid review status" },
          { status: 400 }
        );
      }
      const result = await ReliefService.reviewBeneficiary(
        id,
        {
          status: status as BeneficiaryStatus.VERIFIED | BeneficiaryStatus.REJECTED,
          note: body.note,
        },
        userId
      );
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, message: "Unsupported action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Update beneficiary error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update beneficiary" },
      { status: 500 }
    );
  }
}

