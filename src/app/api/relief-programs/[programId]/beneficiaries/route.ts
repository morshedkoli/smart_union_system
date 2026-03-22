import { NextRequest, NextResponse } from "next/server";
import { BeneficiaryStatus } from "@prisma/client";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";
import { ReliefService } from "@/services";

interface RouteParams {
  params: Promise<{ programId: string }>;
}

async function resolveUserId(request: NextRequest): Promise<string | undefined> {
  const cookieToken = request.cookies.get("auth-token")?.value;
  const headerToken = getTokenFromHeader(request.headers.get("authorization"));
  const token = cookieToken || headerToken;
  if (!token) return undefined;
  const payload = await verifyToken(token);
  return payload?.userId;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { programId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as BeneficiaryStatus | null;
    const ward = searchParams.get("ward");
    const query = searchParams.get("query");

    const beneficiaries = await ReliefService.listBeneficiaries(programId, {
      status: status || undefined,
      ward: ward ? Number(ward) : undefined,
      query: query || undefined,
    });

    return NextResponse.json({ success: true, beneficiaries });
  } catch (error) {
    console.error("List beneficiaries error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch beneficiaries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { programId } = await params;
    const body = await request.json();
    const userId = await resolveUserId(request);

    const result = await ReliefService.createBeneficiary(
      {
        programId,
        citizenId: body.citizenId,
        totalEntitlement: Number(body.totalEntitlement || 0),
        notes: body.notes,
        priorityReason: body.priorityReason,
      },
      userId
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create beneficiary error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create beneficiary" },
      { status: 500 }
    );
  }
}
