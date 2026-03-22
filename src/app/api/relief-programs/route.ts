import { NextRequest, NextResponse } from "next/server";
import { ReliefService } from "@/services";
import { FundingSource, ReliefType } from "@prisma/client";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

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

export async function GET() {
  try {
    const programs = await ReliefService.listPrograms();
    return NextResponse.json({ success: true, programs });
  } catch (error) {
    console.error("List relief programs error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch relief programs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = await resolveUserId(request);

    if (body.action === "criteria") {
      if (!body.programId) {
        return NextResponse.json(
          { success: false, message: "programId is required" },
          { status: 400 }
        );
      }
      const result = await ReliefService.updateCriteria(body.programId, body.criteria || {}, userId);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (body.action === "auto-list") {
      if (!body.programId) {
        return NextResponse.json(
          { success: false, message: "programId is required" },
          { status: 400 }
        );
      }
      const result = await ReliefService.autoListByCriteria(body.programId, userId);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    const required = [
      "name",
      "nameEn",
      "nameBn",
      "type",
      "fundingSource",
      "startDate",
      "targetBeneficiaries",
      "budgetTotal",
    ];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    if (!Object.values(ReliefType).includes(body.type as ReliefType)) {
      return NextResponse.json(
        { success: false, message: "Invalid relief type" },
        { status: 400 }
      );
    }
    if (!Object.values(FundingSource).includes(body.fundingSource as FundingSource)) {
      return NextResponse.json(
        { success: false, message: "Invalid funding source" },
        { status: 400 }
      );
    }

    const result = await ReliefService.createProgram({
      name: body.name,
      nameEn: body.nameEn,
      nameBn: body.nameBn,
      type: body.type,
      fundingSource: body.fundingSource,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      targetBeneficiaries: Number(body.targetBeneficiaries),
      budgetTotal: Number(body.budgetTotal),
      criteria: body.criteria || {},
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create relief program error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create relief program" },
      { status: 500 }
    );
  }
}
