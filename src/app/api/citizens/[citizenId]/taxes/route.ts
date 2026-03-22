import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ citizenId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const { citizenId } = await params;

    // Check if user has permission to view this citizen's taxes
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    // SECRETARY (super admin) can access any citizen's taxes
    // CITIZENS can only view their own taxes
    // ENTREPRENEUR has no access to tax records
    if (user.role === "CITIZEN" && user.citizenId !== citizenId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    if (user.role === "ENTREPRENEUR") {
      return NextResponse.json(
        { success: false, message: "Access denied - insufficient permissions" },
        { status: 403 }
      );
    }

    // Get holding tax records for this citizen
    const holdingTaxes = await prisma.holdingTax.findMany({
      where: {
        citizenId: citizenId,
      },
      orderBy: {
        fiscalYear: "desc",
      },
    });

    // Transform to the expected format
    const taxes = holdingTaxes.map((tax) => {
      let status: "PAID" | "PENDING" | "OVERDUE" | "PARTIAL" = "PENDING";

      if (tax.totalPaid >= tax.totalDue) {
        status = "PAID";
      } else if (tax.totalPaid > 0) {
        status = "PARTIAL";
      } else if (tax.dueDate && new Date(tax.dueDate) < new Date()) {
        status = "OVERDUE";
      }

      return {
        id: tax.id,
        fiscalYear: tax.fiscalYear,
        holdingNo: tax.holdingInfo?.holdingNo || "",
        assessedAmount: tax.totalDue,
        paidAmount: tax.totalPaid,
        dueDate: tax.dueDate?.toISOString(),
        paidDate: tax.lastPaymentDate?.toISOString(),
        status,
        receiptNo: tax.referenceNo,
      };
    });

    // Calculate summary
    const totalAssessed = taxes.reduce((sum, t) => sum + t.assessedAmount, 0);
    const totalPaid = taxes.reduce((sum, t) => sum + t.paidAmount, 0);
    const totalDue = totalAssessed - totalPaid;

    return NextResponse.json({
      success: true,
      taxes,
      summary: {
        totalAssessed,
        totalPaid,
        totalDue,
      },
    });
  } catch (error) {
    console.error("Error fetching citizen taxes:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch tax records" },
      { status: 500 }
    );
  }
}
