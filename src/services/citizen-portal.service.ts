import { signToken } from "@/lib/auth";
import prisma from "@/lib/db";
import { isValidObjectId } from "@/lib/prisma-utils";
import { CertificateStatus } from "@prisma/client";

// Re-export enum for convenience
export { CertificateStatus };

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface CitizenPortalCitizen {
  id: string;
  name: string;
  nameBn: string;
  nid: string | null;
  dateOfBirth: Date;
  mobile: string | null;
}

export interface CitizenPortalCertificate {
  id: string;
  referenceNo: string;
  certificateNo: string;
  type: string;
  status: string;
  issuedAt: Date;
  finalText: string | null;
  qrCode: string | null;
}

export class CitizenPortalService {
  static async loginWithNidAndDob(
    nid: string,
    dateOfBirth: string
  ): Promise<{
    success: boolean;
    token?: string;
    citizen?: CitizenPortalCitizen;
    message: string;
  }> {
    const normalizedNid = nid.trim();
    const dob = new Date(dateOfBirth);
    if (!normalizedNid || Number.isNaN(dob.getTime())) {
      return { success: false, message: "Valid NID and date of birth are required" };
    }

    const citizen = await prisma.citizen.findFirst({
      where: {
        nid: normalizedNid,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        nameBn: true,
        nid: true,
        dateOfBirth: true,
        mobile: true,
      },
    });

    if (!citizen) {
      return { success: false, message: "Citizen not found" };
    }

    if (!isSameDate(new Date(citizen.dateOfBirth), dob)) {
      return { success: false, message: "Invalid date of birth" };
    }

    const token = await signToken({
      userId: citizen.id,
      email: `citizen-${citizen.id}@smartunion.local`,
      role: "VIEWER",
    });

    return {
      success: true,
      token,
      citizen: {
        id: citizen.id,
        name: citizen.name,
        nameBn: citizen.nameBn,
        nid: citizen.nid,
        dateOfBirth: citizen.dateOfBirth,
        mobile: citizen.mobile,
      },
      message: "Citizen portal login successful",
    };
  }

  static async getCitizenById(id: string): Promise<CitizenPortalCitizen | null> {
    if (!isValidObjectId(id)) return null;

    const citizen = await prisma.citizen.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        nameBn: true,
        nid: true,
        dateOfBirth: true,
        mobile: true,
      },
    });

    return citizen;
  }

  static async listApprovedCertificates(citizenId: string): Promise<CitizenPortalCertificate[]> {
    if (!isValidObjectId(citizenId)) return [];

    const certificates = await prisma.certificate.findMany({
      where: {
        citizenId,
        status: CertificateStatus.APPROVED,
        deletedAt: null,
      },
      select: {
        id: true,
        referenceNo: true,
        certificateNo: true,
        type: true,
        status: true,
        issuedAt: true,
        finalText: true,
        qrCode: true,
      },
      orderBy: [
        { issuedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    return certificates.map((cert) => ({
      id: cert.id,
      referenceNo: cert.referenceNo,
      certificateNo: cert.certificateNo,
      type: cert.type,
      status: cert.status,
      issuedAt: cert.issuedAt,
      finalText: cert.finalText,
      qrCode: cert.qrCode,
    }));
  }

  static async getApprovedCertificateForCitizen(
    citizenId: string,
    certificateId: string
  ): Promise<CitizenPortalCertificate | null> {
    if (!isValidObjectId(citizenId) || !isValidObjectId(certificateId)) {
      return null;
    }

    const certificate = await prisma.certificate.findFirst({
      where: {
        id: certificateId,
        citizenId,
        status: CertificateStatus.APPROVED,
        deletedAt: null,
      },
      select: {
        id: true,
        referenceNo: true,
        certificateNo: true,
        type: true,
        status: true,
        issuedAt: true,
        finalText: true,
        qrCode: true,
      },
    });

    if (!certificate) return null;

    return {
      id: certificate.id,
      referenceNo: certificate.referenceNo,
      certificateNo: certificate.certificateNo,
      type: certificate.type,
      status: certificate.status,
      issuedAt: certificate.issuedAt,
      finalText: certificate.finalText,
      qrCode: certificate.qrCode,
    };
  }
}
