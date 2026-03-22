import { NextRequest, NextResponse } from "next/server";
import { AuthenticatedRequest, requireAnyRole } from "@/server-middleware/role-auth.middleware";
import { prisma } from "@/lib/db";

async function postHandler(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const { templateId, citizenId } = body;

    // Validate input
    if (!templateId || !citizenId) {
      return NextResponse.json(
        { success: false, message: "Template ID and Citizen ID are required" },
        { status: 400 }
      );
    }

    // For citizens, they can only apply for their own certificates
    if (request.user.role === "CITIZEN" && request.user.citizenId !== citizenId) {
      return NextResponse.json(
        { success: false, message: "You can only apply for your own certificates" },
        { status: 403 }
      );
    }

    // Verify template exists and is active
    const template = await prisma.certificateTemplate.findFirst({
      where: {
        id: templateId,
        status: "ACTIVE",
      },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Certificate template not found or inactive" },
        { status: 404 }
      );
    }

    // Verify citizen exists
    const citizen = await prisma.citizen.findUnique({
      where: { id: citizenId },
    });

    if (!citizen) {
      return NextResponse.json(
        { success: false, message: "Citizen not found" },
        { status: 404 }
      );
    }

    // Generate certificate number and reference number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get count of certificates for this template this month
    const count = await prisma.certificate.count({
      where: {
        templateId,
        createdAt: {
          gte: new Date(year, now.getMonth(), 1),
          lt: new Date(year, now.getMonth() + 1, 1),
        },
      },
    });

    const certificateNo = `${template.certificateType}-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    const referenceNo = `REF-${year}-${String(count + 1).padStart(6, '0')}`;

    // Create certificate application
    const certificate = await prisma.certificate.create({
      data: {
        certificateNo,
        referenceNo,
        type: template.certificateType,
        status: "PENDING", // Pending approval
        citizenId,
        templateId,
        appliedById: request.user.id,
        dataSnapshot: {
          citizenData: {
            name: citizen.name,
            nameEn: citizen.nameEn,
            nameBn: citizen.nameBn,
            fatherName: citizen.fatherName,
            motherName: citizen.motherName,
            dateOfBirth: citizen.dateOfBirth,
            nid: citizen.nid,
            presentAddress: citizen.presentAddress,
            permanentAddress: citizen.permanentAddress,
          },
          templateData: {
            name: template.name,
            nameEn: template.nameEn,
            nameBn: template.nameBn,
            certificateType: template.certificateType,
            templateText: template.templateText,
          },
        },
      },
      include: {
        citizen: {
          select: {
            name: true,
            email: true,
          },
        },
        template: {
          select: {
            nameEn: true,
            nameBn: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Certificate application submitted successfully",
      certificate: {
        id: certificate.id,
        certificateNo: certificate.certificateNo,
        referenceNo: certificate.referenceNo,
        type: certificate.template?.nameEn || certificate.type,
        status: certificate.status,
      },
    });
  } catch (error) {
    console.error("Apply certificate error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit certificate application" },
      { status: 500 }
    );
  }
}

export const POST = requireAnyRole(postHandler);