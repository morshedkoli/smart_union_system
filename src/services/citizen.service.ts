import { connectDB } from "@/lib/mongodb";
import { Citizen, ICitizen, CitizenStatus, Gender, MaritalStatus } from "@/models/Citizen";
import { AuditLog, AuditAction, EntityType, Severity } from "@/models/AuditLog";
import mongoose from "mongoose";
import { deepSanitize } from "@/lib/sanitize";

export interface CitizenSearchParams {
  query?: string;
  ward?: number;
  status?: CitizenStatus;
  gender?: Gender;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CitizenCreateData {
  nid?: string;
  birthCertificateNo?: string;
  name: string;
  nameEn?: string;
  nameBn: string;
  fatherName: string;
  fatherNameBn?: string;
  motherName: string;
  motherNameBn?: string;
  dateOfBirth: Date;
  gender: Gender;
  maritalStatus?: MaritalStatus;
  religion?: string;
  occupation?: string;
  mobile?: string;
  email?: string;
  presentAddress: {
    village?: string;
    ward: number;
    postOffice?: string;
    postCode?: string;
    upazila?: string;
    district?: string;
    division?: string;
    fullAddress?: string;
  };
  permanentAddress: {
    village?: string;
    ward: number;
    postOffice?: string;
    postCode?: string;
    upazila?: string;
    district?: string;
    division?: string;
    fullAddress?: string;
  };
  holdingNo?: string;
  photo?: string;
  isFreedomFighter?: boolean;
  isDisabled?: boolean;
  isWidow?: boolean;
}

export class CitizenService {
  static async search(params: CitizenSearchParams): Promise<{
    citizens: ICitizen[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await connectDB();

    const {
      query,
      ward,
      status,
      gender,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const filter: Record<string, unknown> = {};

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { nameBn: { $regex: query, $options: "i" } },
        { nid: { $regex: query, $options: "i" } },
        { mobile: { $regex: query, $options: "i" } },
        { registrationNo: { $regex: query, $options: "i" } },
      ];
    }

    if (ward) {
      filter["presentAddress.ward"] = ward;
    }

    if (status) {
      filter.status = status;
    }

    if (gender) {
      filter.gender = gender;
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [citizens, total] = await Promise.all([
      Citizen.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Citizen.countDocuments(filter),
    ]);

    return {
      citizens: citizens as ICitizen[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getById(id: string): Promise<ICitizen | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const citizen = await Citizen.findById(id)
      .populate("certificates")
      .populate("holdingTaxes")
      .lean();

    return citizen as ICitizen | null;
  }

  static async getByNid(nid: string): Promise<ICitizen | null> {
    await connectDB();
    const citizen = await Citizen.findOne({ nid }).lean();
    return citizen as ICitizen | null;
  }

  static async create(
    data: CitizenCreateData,
    createdBy?: string
  ): Promise<{ success: boolean; citizen?: ICitizen; message: string }> {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Sanitize input data
      const sanitizedData = deepSanitize(data);

      // Check for duplicates
      if (sanitizedData.nid) {
        const existingNid = await Citizen.findOne({ 
          nid: sanitizedData.nid,
          deletedAt: null 
        }).session(session);
        if (existingNid) {
          await session.abortTransaction();
          return { success: false, message: "NID already registered" };
        }
      }

      if (sanitizedData.birthCertificateNo) {
        const existingBc = await Citizen.findOne({ 
          birthCertificateNo: sanitizedData.birthCertificateNo,
          deletedAt: null 
        }).session(session);
        if (existingBc) {
          await session.abortTransaction();
          return { success: false, message: "Birth certificate number already registered" };
        }
      }

      // Generate registration number
      const registrationNo = await (Citizen as typeof Citizen & {
        generateRegistrationNo: (ward: number, year?: number) => Promise<string>;
      }).generateRegistrationNo(sanitizedData.presentAddress.ward);

      const citizen = await Citizen.create([{
        ...sanitizedData,
        registrationNo,
        createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
      }], { session });

      // Log audit
      if (createdBy) {
        await AuditLog.log({
          user: new mongoose.Types.ObjectId(createdBy),
          action: AuditAction.CREATE,
          entityType: EntityType.CITIZEN,
          entityId: citizen[0]._id,
          entityName: citizen[0].name,
          description: `Citizen created: ${citizen[0].name} (${citizen[0].registrationNo})`,
          severity: Severity.LOW,
        });
      }

      await session.commitTransaction();

      return {
        success: true,
        citizen: citizen[0].toObject() as ICitizen,
        message: "Citizen registered successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async update(
    id: string,
    data: Partial<CitizenCreateData>,
    updatedBy?: string
  ): Promise<{ success: boolean; citizen?: ICitizen; message: string }> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: "Invalid citizen ID" };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Sanitize input data
      const sanitizedData = deepSanitize(data);

      const citizen = await Citizen.findById(id).session(session);
      if (!citizen) {
        await session.abortTransaction();
        return { success: false, message: "Citizen not found" };
      }

      // Check for NID duplicate if changing
      if (sanitizedData.nid && sanitizedData.nid !== citizen.nid) {
        const existingNid = await Citizen.findOne({ 
          nid: sanitizedData.nid, 
          _id: { $ne: id },
          deletedAt: null 
        }).session(session);
        if (existingNid) {
          await session.abortTransaction();
          return { success: false, message: "NID already registered to another citizen" };
        }
      }

      // Track changes for audit
      const changes: { before: Record<string, unknown>; after: Record<string, unknown> } = {
        before: {},
        after: {},
      };

      Object.keys(sanitizedData).forEach((key) => {
        const k = key as keyof typeof sanitizedData;
        if (citizen[k] !== sanitizedData[k]) {
          changes.before[key] = citizen[k];
          changes.after[key] = sanitizedData[k];
        }
      });

      Object.assign(citizen, {
        ...sanitizedData,
        updatedBy: updatedBy ? new mongoose.Types.ObjectId(updatedBy) : undefined,
      });

      await citizen.save({ session });

      // Log audit
      if (updatedBy && Object.keys(changes.before).length > 0) {
        await AuditLog.log({
          user: new mongoose.Types.ObjectId(updatedBy),
          action: AuditAction.UPDATE,
          entityType: EntityType.CITIZEN,
          entityId: citizen._id,
          entityName: citizen.name,
          description: `Citizen updated: ${citizen.name}`,
          changes,
          severity: Severity.LOW,
        });
      }

      await session.commitTransaction();

      return {
        success: true,
        citizen: citizen.toObject() as ICitizen,
        message: "Citizen updated successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async delete(id: string, deletedBy?: string): Promise<{ success: boolean; message: string }> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: "Invalid citizen ID" };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const citizen = await Citizen.findById(id).session(session);
      if (!citizen) {
        await session.abortTransaction();
        return { success: false, message: "Citizen not found" };
      }

      // Soft delete
      citizen.deletedAt = new Date();
      if (deletedBy) {
        citizen.updatedBy = new mongoose.Types.ObjectId(deletedBy);
      }
      await citizen.save({ session });

      // Log audit
      if (deletedBy) {
        await AuditLog.log({
          user: new mongoose.Types.ObjectId(deletedBy),
          action: AuditAction.SOFT_DELETE,
          entityType: EntityType.CITIZEN,
          entityId: citizen._id,
          entityName: citizen.name,
          description: `Citizen deleted: ${citizen.name} (${citizen.registrationNo})`,
          severity: Severity.MEDIUM,
        });
      }

      await session.commitTransaction();

      return { success: true, message: "Citizen deleted successfully" };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getStats(unionParishadId?: string): Promise<{
    total: number;
    byWard: Record<number, number>;
    byGender: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    await connectDB();

    const filter: Record<string, unknown> = {};
    if (unionParishadId) {
      filter.unionParishad = new mongoose.Types.ObjectId(unionParishadId);
    }

    const [total, byWard, byGender, byStatus] = await Promise.all([
      Citizen.countDocuments(filter),
      Citizen.aggregate([
        { $match: { ...filter, deletedAt: null } },
        { $group: { _id: "$presentAddress.ward", count: { $sum: 1 } } },
      ]),
      Citizen.aggregate([
        { $match: { ...filter, deletedAt: null } },
        { $group: { _id: "$gender", count: { $sum: 1 } } },
      ]),
      Citizen.aggregate([
        { $match: { ...filter, deletedAt: null } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byWard: Object.fromEntries(byWard.map((w) => [w._id, w.count])),
      byGender: Object.fromEntries(byGender.map((g) => [g._id, g.count])),
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    };
  }
}
