import mongoose from "mongoose";
import { signToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import {
  Certificate,
  CertificateStatus,
  Citizen,
  type ICertificate,
  type ICitizen,
} from "@/models";

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export class CitizenPortalService {
  static async loginWithNidAndDob(
    nid: string,
    dateOfBirth: string
  ): Promise<{
    success: boolean;
    token?: string;
    citizen?: Pick<ICitizen, "_id" | "name" | "nameBn" | "nid" | "dateOfBirth" | "mobile">;
    message: string;
  }> {
    await connectDB();

    const normalizedNid = nid.trim();
    const dob = new Date(dateOfBirth);
    if (!normalizedNid || Number.isNaN(dob.getTime())) {
      return { success: false, message: "Valid NID and date of birth are required" };
    }

    const citizen = await Citizen.findOne({ nid: normalizedNid, deletedAt: null })
      .select("name nameBn nid dateOfBirth mobile")
      .lean();

    if (!citizen) {
      return { success: false, message: "Citizen not found" };
    }

    if (!isSameDate(new Date(citizen.dateOfBirth), dob)) {
      return { success: false, message: "Invalid date of birth" };
    }

    const token = await signToken({
      userId: citizen._id.toString(),
      email: `citizen-${citizen._id.toString()}@smartunion.local`,
      role: "VIEWER",
    });

    return {
      success: true,
      token,
      citizen: citizen as Pick<ICitizen, "_id" | "name" | "nameBn" | "nid" | "dateOfBirth" | "mobile">,
      message: "Citizen portal login successful",
    };
  }

  static async getCitizenById(id: string): Promise<ICitizen | null> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const citizen = await Citizen.findById(id)
      .select("name nameBn nid dateOfBirth mobile")
      .lean();
    return citizen as ICitizen | null;
  }

  static async listApprovedCertificates(citizenId: string): Promise<ICertificate[]> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(citizenId)) return [];

    const certificates = await Certificate.find({
      citizen: new mongoose.Types.ObjectId(citizenId),
      status: CertificateStatus.APPROVED,
      deletedAt: null,
    })
      .select("referenceNo certificateNo type status issueDate finalText qrCode")
      .sort({ issueDate: -1, createdAt: -1 })
      .lean();

    return certificates as ICertificate[];
  }

  static async getApprovedCertificateForCitizen(
    citizenId: string,
    certificateId: string
  ): Promise<ICertificate | null> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(citizenId) || !mongoose.Types.ObjectId.isValid(certificateId)) {
      return null;
    }

    const certificate = await Certificate.findOne({
      _id: new mongoose.Types.ObjectId(certificateId),
      citizen: new mongoose.Types.ObjectId(citizenId),
      status: CertificateStatus.APPROVED,
      deletedAt: null,
    }).lean();

    return certificate as ICertificate | null;
  }
}

