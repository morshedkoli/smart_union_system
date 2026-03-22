import prisma from "@/lib/db";
import { CertificateStatus, CertificateType } from "@prisma/client";

// Re-export enums for convenience
export { CertificateStatus, CertificateType };

export interface GlobalSearchResult {
  citizens: Array<{
    id: string;
    registrationNo: string;
    name: string;
    nameBn?: string;
    nid?: string | null;
    mobile?: string | null;
  }>;
  certificates: Array<{
    id: string;
    referenceNo: string;
    certificateNo: string;
    applicantName: string | null;
    type: string;
    status: string;
    citizenId?: string;
  }>;
  references: Array<{
    source: "CERTIFICATE" | "HOLDING_TAX";
    referenceNo: string;
    label: string;
    id: string;
  }>;
}

export class GlobalSearchService {
  static async search(query: string, limit = 10): Promise<GlobalSearchResult> {
    const cleaned = query.trim();
    if (!cleaned) {
      return { citizens: [], certificates: [], references: [] };
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);

    // Execute all searches in parallel
    const [citizens, certificates, holdingTaxes] = await Promise.all([
      // Search citizens
      prisma.citizen.findMany({
        where: {
          OR: [
            { registrationNo: { contains: cleaned, mode: "insensitive" } },
            { name: { contains: cleaned, mode: "insensitive" } },
            { nameBn: { contains: cleaned, mode: "insensitive" } },
            { nid: { contains: cleaned, mode: "insensitive" } },
            { mobile: { contains: cleaned, mode: "insensitive" } },
          ],
          deletedAt: null,
        },
        select: {
          id: true,
          registrationNo: true,
          name: true,
          nameBn: true,
          nid: true,
          mobile: true,
        },
        orderBy: { createdAt: "desc" },
        take: safeLimit,
      }),

      // Search certificates
      prisma.certificate.findMany({
        where: {
          OR: [
            { referenceNo: { contains: cleaned, mode: "insensitive" } },
            { certificateNo: { contains: cleaned, mode: "insensitive" } },
            { applicantName: { contains: cleaned, mode: "insensitive" } },
            { applicantNameBn: { contains: cleaned, mode: "insensitive" } },
          ],
          deletedAt: null,
        },
        select: {
          id: true,
          referenceNo: true,
          certificateNo: true,
          applicantName: true,
          type: true,
          status: true,
          citizenId: true,
        },
        orderBy: { createdAt: "desc" },
        take: safeLimit,
      }),

      // Search holding taxes
      // Note: For composite type fields (holdingInfo.holdingNo), we use the 'is' operator
      prisma.holdingTax.findMany({
        where: {
          OR: [
            { referenceNo: { contains: cleaned, mode: "insensitive" } },
            {
              holdingInfo: {
                is: {
                  holdingNo: { contains: cleaned, mode: "insensitive" },
                },
              },
            },
          ],
          deletedAt: null,
        },
        select: {
          id: true,
          referenceNo: true,
          fiscalYear: true,
          holdingInfo: true,
        },
        orderBy: { createdAt: "desc" },
        take: safeLimit,
      }),
    ]);

    // Map citizen results
    const citizenResults = citizens.map((citizen) => ({
      id: citizen.id,
      registrationNo: citizen.registrationNo,
      name: citizen.name,
      nameBn: citizen.nameBn,
      nid: citizen.nid,
      mobile: citizen.mobile,
    }));

    // Map certificate results
    const certificateResults = certificates.map((certificate) => ({
      id: certificate.id,
      referenceNo: certificate.referenceNo,
      certificateNo: certificate.certificateNo,
      applicantName: certificate.applicantName,
      type: certificate.type,
      status: certificate.status,
      citizenId: certificate.citizenId,
    }));

    // Build references array from certificates and holding taxes
    const references = [
      ...certificateResults.map((certificate) => ({
        source: "CERTIFICATE" as const,
        referenceNo: certificate.referenceNo,
        label: `${certificate.certificateNo} - ${certificate.applicantName || "N/A"}`,
        id: certificate.id,
      })),
      ...holdingTaxes.map((tax) => ({
        source: "HOLDING_TAX" as const,
        referenceNo: tax.referenceNo,
        label: `${tax.holdingInfo.holdingNo} (${tax.fiscalYear})`,
        id: tax.id,
      })),
    ];

    return {
      citizens: citizenResults,
      certificates: certificateResults,
      references,
    };
  }
}
