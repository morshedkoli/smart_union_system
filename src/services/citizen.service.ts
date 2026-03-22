import { prisma } from "@/lib/db";
import { generateCitizenRegistrationNo, isValidObjectId } from "@/lib/prisma-utils";
import { calculateAge } from "@/lib/prisma-virtuals";
import { deepSanitize } from "@/lib/sanitize";
import type { Citizen, Gender, MaritalStatus, CitizenStatus, Prisma } from "@prisma/client";

// Re-export enum values for backward compatibility
export { CitizenStatus, Gender, MaritalStatus } from "@prisma/client";

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

export interface CitizenAddress {
  village?: string;
  ward: number;
  postOffice?: string;
  postCode?: string;
  upazila?: string;
  district?: string;
  division?: string;
  fullAddress?: string;
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
  presentAddress: CitizenAddress;
  permanentAddress: CitizenAddress;
  holdingNo?: string;
  photo?: string;
  isFreedomFighter?: boolean;
  isDisabled?: boolean;
  isWidow?: boolean;
}

export interface CitizenWithAge extends Citizen {
  age: number | null;
}

async function logAudit(data: {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  description?: string;
  severity?: string;
  changes?: object;
}): Promise<void> {
  try {
    if (data.userId && isValidObjectId(data.userId)) {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          entityName: data.entityName,
          description: data.description,
          severity: data.severity || "LOW",
          changes: data.changes,
        },
      });
    }
  } catch {
    console.error("Failed to create audit log");
  }
}

export class CitizenService {
  static async search(params: CitizenSearchParams): Promise<{
    citizens: CitizenWithAge[];
    total: number;
    page: number;
    totalPages: number;
  }> {
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

    const where: Prisma.CitizenWhereInput = {
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { nameBn: { contains: query, mode: "insensitive" } },
        { nid: { contains: query, mode: "insensitive" } },
        { mobile: { contains: query, mode: "insensitive" } },
        { registrationNo: { contains: query, mode: "insensitive" } },
      ];
    }

    if (ward) {
      where.presentAddress = { is: { ward } };
    }

    if (status) {
      where.status = status;
    }

    if (gender) {
      where.gender = gender;
    }

    const skip = (page - 1) * limit;
    const orderBy: Prisma.CitizenOrderByWithRelationInput = { [sortBy]: sortOrder };

    const [citizens, total] = await Promise.all([
      prisma.citizen.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.citizen.count({ where }),
    ]);

    // Add computed age to each citizen
    const citizensWithAge: CitizenWithAge[] = citizens.map((citizen) => ({
      ...citizen,
      age: calculateAge(citizen.dateOfBirth),
    }));

    return {
      citizens: citizensWithAge,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getById(id: string): Promise<(Citizen & { certificates: unknown[]; holdingTaxes: unknown[] }) | null> {
    if (!isValidObjectId(id)) {
      return null;
    }

    const citizen = await prisma.citizen.findUnique({
      where: { id },
      include: {
        certificates: true,
        holdingTaxes: true,
      },
    });

    return citizen;
  }

  static async getByNid(nid: string): Promise<Citizen | null> {
    const citizen = await prisma.citizen.findFirst({
      where: { nid, deletedAt: null },
    });

    return citizen;
  }

  static async create(
    data: CitizenCreateData,
    createdBy?: string
  ): Promise<{ success: boolean; citizen?: Citizen; message: string }> {
    // Sanitize input data
    const sanitizedData = deepSanitize(data);

    return prisma.$transaction(async (tx) => {
      // Check for duplicates
      if (sanitizedData.nid) {
        const existingNid = await tx.citizen.findFirst({
          where: { nid: sanitizedData.nid, deletedAt: null },
        });
        if (existingNid) {
          throw new Error("NID already registered");
        }
      }

      if (sanitizedData.birthCertificateNo) {
        const existingBc = await tx.citizen.findFirst({
          where: { birthCertificateNo: sanitizedData.birthCertificateNo, deletedAt: null },
        });
        if (existingBc) {
          throw new Error("Birth certificate number already registered");
        }
      }

      // Generate registration number
      const registrationNo = await generateCitizenRegistrationNo(
        tx,
        sanitizedData.presentAddress.ward
      );

      const citizen = await tx.citizen.create({
        data: {
          registrationNo,
          nid: sanitizedData.nid,
          birthCertificateNo: sanitizedData.birthCertificateNo,
          name: sanitizedData.name,
          nameEn: sanitizedData.nameEn,
          nameBn: sanitizedData.nameBn,
          fatherName: sanitizedData.fatherName,
          fatherNameBn: sanitizedData.fatherNameBn,
          motherName: sanitizedData.motherName,
          motherNameBn: sanitizedData.motherNameBn,
          dateOfBirth: sanitizedData.dateOfBirth,
          gender: sanitizedData.gender,
          maritalStatus: sanitizedData.maritalStatus || "SINGLE",
          religion: sanitizedData.religion,
          occupation: sanitizedData.occupation,
          mobile: sanitizedData.mobile,
          email: sanitizedData.email,
          presentAddress: sanitizedData.presentAddress,
          permanentAddress: sanitizedData.permanentAddress,
          holdingNo: sanitizedData.holdingNo,
          photo: sanitizedData.photo,
          isFreedomFighter: sanitizedData.isFreedomFighter || false,
          isDisabled: sanitizedData.isDisabled || false,
          isWidow: sanitizedData.isWidow || false,
          createdById: createdBy,
        },
      });

      // Log audit
      if (createdBy && isValidObjectId(createdBy)) {
        await tx.auditLog.create({
          data: {
            userId: createdBy,
            action: "CREATE",
            entityType: "CITIZEN",
            entityId: citizen.id,
            entityName: citizen.name,
            description: `Citizen created: ${citizen.name} (${citizen.registrationNo})`,
            severity: "LOW",
          },
        });
      }

      return {
        success: true,
        citizen,
        message: "Citizen registered successfully",
      };
    }).catch((error) => {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create citizen",
      };
    });
  }

  static async update(
    id: string,
    data: Partial<CitizenCreateData>,
    updatedBy?: string
  ): Promise<{ success: boolean; citizen?: Citizen; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid citizen ID" };
    }

    // Sanitize input data
    const sanitizedData = deepSanitize(data);

    return prisma.$transaction(async (tx) => {
      const citizen = await tx.citizen.findUnique({
        where: { id },
      });

      if (!citizen) {
        throw new Error("Citizen not found");
      }

      // Check for NID duplicate if changing
      if (sanitizedData.nid && sanitizedData.nid !== citizen.nid) {
        const existingNid = await tx.citizen.findFirst({
          where: {
            nid: sanitizedData.nid,
            id: { not: id },
            deletedAt: null,
          },
        });
        if (existingNid) {
          throw new Error("NID already registered to another citizen");
        }
      }

      // Track changes for audit
      const changes: { before: Record<string, unknown>; after: Record<string, unknown> } = {
        before: {},
        after: {},
      };

      Object.keys(sanitizedData).forEach((key) => {
        const k = key as keyof typeof sanitizedData;
        const currentValue = citizen[k as keyof typeof citizen];
        if (JSON.stringify(currentValue) !== JSON.stringify(sanitizedData[k])) {
          changes.before[key] = currentValue;
          changes.after[key] = sanitizedData[k];
        }
      });

      await tx.citizen.updateMany({
        where: { id },
        data: {
          ...sanitizedData,
          updatedById: updatedBy,
        },
      });

      const updatedCitizen = await tx.citizen.findUnique({
        where: { id },
      });

      if (!updatedCitizen) {
        throw new Error("Citizen not found after update");
      }

      // Log audit
      if (updatedBy && isValidObjectId(updatedBy) && Object.keys(changes.before).length > 0) {
        await tx.auditLog.create({
          data: {
            userId: updatedBy,
            action: "UPDATE",
            entityType: "CITIZEN",
            entityId: citizen.id,
            entityName: citizen.name,
            description: `Citizen updated: ${citizen.name}`,
            severity: "LOW",
            changes,
          },
        });
      }

      return {
        success: true,
        citizen: updatedCitizen,
        message: "Citizen updated successfully",
      };
    }).catch((error) => {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update citizen",
      };
    });
  }

  static async delete(id: string, deletedBy?: string): Promise<{ success: boolean; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid citizen ID" };
    }

    return prisma.$transaction(async (tx) => {
      const citizen = await tx.citizen.findUnique({
        where: { id },
      });

      if (!citizen) {
        throw new Error("Citizen not found");
      }

      // Soft delete
      await tx.citizen.updateMany({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: deletedBy,
        },
      });

      // Log audit
      if (deletedBy && isValidObjectId(deletedBy)) {
        await tx.auditLog.create({
          data: {
            userId: deletedBy,
            action: "SOFT_DELETE",
            entityType: "CITIZEN",
            entityId: citizen.id,
            entityName: citizen.name,
            description: `Citizen deleted: ${citizen.name} (${citizen.registrationNo})`,
            severity: "MEDIUM",
          },
        });
      }

      return { success: true, message: "Citizen deleted successfully" };
    }).catch((error) => {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete citizen",
      };
    });
  }

  static async getStats(unionParishadId?: string): Promise<{
    total: number;
    byWard: Record<number, number>;
    byGender: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const where: Prisma.CitizenWhereInput = { deletedAt: null };
    if (unionParishadId) {
      where.unionParishadId = unionParishadId;
    }

    // For groupBy operations with composite types, we need raw aggregation
    const [total, byGender, byStatus] = await Promise.all([
      prisma.citizen.count({ where }),
      prisma.citizen.groupBy({
        by: ["gender"],
        _count: true,
        where,
      }),
      prisma.citizen.groupBy({
        by: ["status"],
        _count: true,
        where,
      }),
    ]);

    // For ward aggregation on nested field, use raw query
    const byWardResult = await prisma.$runCommandRaw({
      aggregate: "citizens",
      pipeline: [
        { $match: { deletedAt: null, ...(unionParishadId ? { unionParishadId: { $oid: unionParishadId } } : {}) } },
        { $group: { _id: "$presentAddress.ward", count: { $sum: 1 } } },
      ],
      cursor: {},
    }) as { cursor: { firstBatch: Array<{ _id: number; count: number }> } };

    const byWard = Object.fromEntries(
      (byWardResult.cursor?.firstBatch || []).map((w) => [w._id, w.count])
    );

    return {
      total,
      byWard,
      byGender: Object.fromEntries(byGender.map((g) => [g.gender, g._count])),
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    };
  }
}
