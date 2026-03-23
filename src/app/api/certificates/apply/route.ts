import { NextResponse } from "next/server";
import { AuthenticatedRequest, requireAnyRole } from "@/server-middleware/role-auth.middleware";
import { prisma } from "@/lib/db";
import { withPrismaReadRetry, isTransientPrismaError } from "@/lib/prisma-retry";
import { CertificateService } from "@/services/certificate.service";

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
    const template = await withPrismaReadRetry(() =>
      prisma.certificateTemplate.findFirst({
        where: {
          id: templateId,
          status: "ACTIVE",
          deletedAt: null,
        },
      })
    );

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Certificate template not found or inactive" },
        { status: 404 }
      );
    }

    // Verify citizen exists
    const citizen = await withPrismaReadRetry(() =>
      prisma.citizen.findUnique({
        where: { id: citizenId },
      })
    );

    if (!citizen) {
      return NextResponse.json(
        { success: false, message: "Citizen not found" },
        { status: 404 }
      );
    }

    // Prepare data snapshot with citizen information
    const dataSnapshot = {
      name: citizen.name,
      name_en: citizen.nameEn || citizen.name,
      name_bn: citizen.nameBn,
      father_name: citizen.fatherName,
      father_name_bn: citizen.fatherNameBn || citizen.fatherName,
      mother_name: citizen.motherName,
      mother_name_bn: citizen.motherNameBn || citizen.motherName,
      nid: citizen.nid,
      date_of_birth: citizen.dateOfBirth.toISOString(),
      gender: citizen.gender,
      present_address: citizen.presentAddress,
      permanent_address: citizen.permanentAddress,
    };

    // Create certificate using the service
    const result = await CertificateService.create(
      {
        citizenId,
        type: template.certificateType,
        templateId,
        dataSnapshot,
      },
      request.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Certificate application submitted successfully",
      certificate: {
        id: result.certificate!.id,
        certificateNo: result.certificate!.certificateNo,
        referenceNo: result.certificate!.referenceNo,
        type: result.certificate!.type,
        status: result.certificate!.status,
      },
    });
  } catch (error) {
    if (isTransientPrismaError(error)) {
      return NextResponse.json(
        { success: false, message: "Database connection was interrupted. Please try again." },
        { status: 503 }
      );
    }

    console.error("Apply certificate error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit certificate application" },
      { status: 500 }
    );
  }
}

export const POST = requireAnyRole(postHandler);
