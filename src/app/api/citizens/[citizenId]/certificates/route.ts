import { NextRequest, NextResponse } from "next/server";
import { AuthenticatedRequest, requireCitizen } from "@/server-middleware/role-auth.middleware";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ citizenId: string }>;
}

async function getHandler(request: AuthenticatedRequest & RouteParams) {
  try {
    const { citizenId } = await request.params;

    // Check access permissions
    // SECRETARY (super admin) can access any citizen's certificates
    // CITIZENS can only view their own certificates
    // ENTREPRENEUR can view any citizen's certificates
    if (request.user.role === "CITIZEN" && request.user.citizenId !== citizenId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const certificates = await prisma.certificate.findMany({
      where: { citizenId },
      include: {
        citizen: {
          select: {
            name: true,
            email: true,
          },
        },
        template: {
          select: {
            name: true,
            nameEn: true,
            nameBn: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      certificates: certificates.map(cert => ({
        id: cert.id,
        certificateNo: cert.certificateNo,
        referenceNo: cert.referenceNo,
        type: cert.template?.nameEn || cert.type,
        status: cert.status,
        issuedAt: cert.issuedAt,
        finalText: cert.finalText,
        citizen: {
          name: cert.citizen?.name || "",
          email: cert.citizen?.email || "",
        },
      })),
    });
  } catch (error) {
    console.error("Get citizen certificates error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}

export const GET = requireCitizen(getHandler);