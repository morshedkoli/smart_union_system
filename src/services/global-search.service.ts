import { connectDB } from "@/lib/mongodb";
import { Certificate, Citizen, HoldingTax, type ICertificate, type ICitizen, type IHoldingTax } from "@/models";

export interface GlobalSearchResult {
  citizens: Array<{
    _id: string;
    registrationNo: string;
    name: string;
    nameBn?: string;
    nid?: string;
    mobile?: string;
  }>;
  certificates: Array<{
    _id: string;
    referenceNo: string;
    certificateNo: string;
    applicantName: string;
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
    await connectDB();

    const cleaned = query.trim();
    if (!cleaned) {
      return { citizens: [], certificates: [], references: [] };
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const regex = new RegExp(cleaned, "i");

    const [citizens, certificates, taxReferences] = await Promise.all([
      Citizen.find({
        $or: [
          { registrationNo: regex },
          { name: regex },
          { nameBn: regex },
          { nid: regex },
          { mobile: regex },
        ],
      })
        .select("registrationNo name nameBn nid mobile")
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean(),
      Certificate.find({
        $or: [
          { referenceNo: regex },
          { certificateNo: regex },
          { applicantName: regex },
          { applicantNameBn: regex },
        ],
      })
        .select("referenceNo certificateNo applicantName type status citizen")
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean(),
      HoldingTax.find({
        $or: [{ referenceNo: regex }, { "payments.receiptNo": regex }, { "holdingInfo.holdingNo": regex }],
      })
        .select("referenceNo fiscalYear holdingInfo.holdingNo")
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean(),
    ]);

    const citizenResults = (citizens as ICitizen[]).map((citizen) => ({
      _id: citizen._id.toString(),
      registrationNo: citizen.registrationNo,
      name: citizen.name,
      nameBn: citizen.nameBn,
      nid: citizen.nid,
      mobile: citizen.mobile,
    }));

    const certificateResults = (certificates as ICertificate[]).map((certificate) => ({
      _id: certificate._id.toString(),
      referenceNo: certificate.referenceNo,
      certificateNo: certificate.certificateNo,
      applicantName: certificate.applicantName,
      type: certificate.type,
      status: certificate.status,
      citizenId: certificate.citizen?.toString?.(),
    }));

    const references = [
      ...certificateResults.map((certificate) => ({
        source: "CERTIFICATE" as const,
        referenceNo: certificate.referenceNo,
        label: `${certificate.certificateNo} - ${certificate.applicantName}`,
        id: certificate._id,
      })),
      ...(taxReferences as IHoldingTax[]).map((tax) => ({
        source: "HOLDING_TAX" as const,
        referenceNo: tax.referenceNo,
        label: `${tax.holdingInfo.holdingNo} (${tax.fiscalYear})`,
        id: tax._id.toString(),
      })),
    ];

    return {
      citizens: citizenResults,
      certificates: certificateResults,
      references,
    };
  }
}

