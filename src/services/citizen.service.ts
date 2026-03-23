import { prisma } from "@/lib/db";
import { generateCitizenRegistrationNo, generateCitizenIdentityHash, isValidObjectId } from "@/lib/prisma-utils";
import { calculateAge } from "@/lib/prisma-virtuals";
import { deepSanitize } from "@/lib/sanitize";
import { dateSchema } from "@/lib/validation";
import { Prisma } from "@prisma/client";
import type { Citizen, Gender, MaritalStatus, CitizenStatus } from "@prisma/client";

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

function normalizeCitizenDateOfBirth(value: unknown): Date {
  const parsed = dateSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid dateOfBirth");
  }

  return parsed.data;
}

function formatCitizenPersistenceError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = error.meta?.target as string[] | undefined;
      if (target?.includes("identityHash")) {
        return "এই নাম, পিতার নাম এবং জন্ম তারিখ দিয়ে ইতিমধ্যে একজন নাগরিক নিবন্ধিত আছে / A citizen with the same name, father's name and date of birth is already registered";
      }
      if (target?.includes("nid")) {
        return "এই NID নম্বর দিয়ে ইতিমধ্যে একজন নাগরিক নিবন্ধিত আছে / A citizen with this NID is already registered";
      }
      if (target?.includes("birthCertificateNo")) {
        return "এই জন্ম নিবন্ধন নম্বর দিয়ে ইতিমধ্যে একজন নাগরিক নিবন্ধিত আছে / A citizen with this birth certificate number is already registered";
      }
      if (target?.includes("mobile")) {
        return "এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একজন নাগরিক নিবন্ধিত আছে / A citizen with this mobile number is already registered";
      }
      return "এই তথ্য দিয়ে ইতিমধ্যে একজন নাগরিক নিবন্ধিত আছে / A citizen with this information is already registered";
    }
  }

  if (
    error instanceof Error &&
    (error.message.includes("TransientTransactionError") ||
      error.message.includes("forcibly closed by the remote host") ||
      error.message.includes("os error 10054"))
  ) {
    return "Database connection was interrupted. Please try again.";
  }

  return error instanceof Error ? error.message : "Failed to save citizen";
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

    const skip = (page - 1) * limit;

    // Fetch ALL citizens first (no where clause to avoid MongoDB null issues)
    const allCitizens = await prisma.citizen.findMany({
      orderBy: { [sortBy]: sortOrder },
    });

    // Filter in application layer
    let filtered = allCitizens.filter(c => {
      // Exclude soft-deleted
      if (c.deletedAt) return false;
      
      // Search query filter
      if (query) {
        const q = query.toLowerCase();
        const matchesQuery = 
          c.name?.toLowerCase().includes(q) ||
          c.nameBn?.toLowerCase().includes(q) ||
          c.nid?.toLowerCase().includes(q) ||
          c.mobile?.toLowerCase().includes(q) ||
          c.registrationNo?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Ward filter
      if (ward) {
        const citizenWard = (c.presentAddress as { ward?: number })?.ward;
        if (citizenWard !== ward) return false;
      }

      // Status filter
      if (status && c.status !== status) return false;

      // Gender filter
      if (gender && c.gender !== gender) return false;

      return true;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);

    // Paginate
    const paginated = filtered.slice(skip, skip + limit);

    // Add computed age
    const citizensWithAge: CitizenWithAge[] = paginated.map((citizen) => ({
      ...citizen,
      age: calculateAge(citizen.dateOfBirth),
    }));

    return {
      citizens: citizensWithAge,
      total,
      page,
      totalPages,
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
    createdBy?: string,
    creatorRole?: string
  ): Promise<{ success: boolean; citizen?: Citizen; message: string }> {
    // Sanitize input data
    const sanitizedData = deepSanitize(data);
    try {
      const dateOfBirth = normalizeCitizenDateOfBirth(sanitizedData.dateOfBirth);

      // Generate identity hash to prevent duplicate person registration
      const identityHash = generateCitizenIdentityHash(
        sanitizedData.name,
        sanitizedData.fatherName,
        dateOfBirth
      );

      // Check for duplicate NID
      if (sanitizedData.nid) {
        const allWithNid = await prisma.citizen.findMany({
          where: { nid: sanitizedData.nid },
          select: { id: true, deletedAt: true },
        });
        const existingNid = allWithNid.find(c => !c.deletedAt);
        if (existingNid) {
          return {
            success: false,
            message: "এই NID নম্বর দিয়ে ইতিমধ্যে একজন নাগরিক নিবন্ধিত আছে / A citizen with this NID is already registered",
          };
        }
      }

      // Check for duplicate Birth Certificate
      if (sanitizedData.birthCertificateNo) {
        const allWithBc = await prisma.citizen.findMany({
          where: { birthCertificateNo: sanitizedData.birthCertificateNo },
          select: { id: true, deletedAt: true },
        });
        const existingBc = allWithBc.find(c => !c.deletedAt);
        if (existingBc) {
          return {
            success: false,
            message: "এই জন্ম নিবন্ধন নম্বর দিয়ে ইতিমধ্যে একজন নাগরিক নিবন্ধিত আছে / A citizen with this birth certificate number is already registered",
          };
        }
      }

      // Check for duplicate mobile number
      if (sanitizedData.mobile) {
        const allWithMobile = await prisma.citizen.findMany({
          where: { mobile: sanitizedData.mobile },
          select: { id: true, deletedAt: true },
        });
        const existingMobile = allWithMobile.find(c => !c.deletedAt);
        if (existingMobile) {
          return {
            success: false,
            message: "এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একজন নাগরিক নিবন্ধিত আছে / A citizen with this mobile number is already registered",
          };
        }
      }

      // Check for duplicate identity (name + father + DOB) using the hash
      const allWithIdentity = await prisma.citizen.findMany({
        where: { identityHash },
        select: { id: true, name: true, deletedAt: true },
      });
      const existingIdentity = allWithIdentity.find(c => !c.deletedAt);
      if (existingIdentity) {
        return {
          success: false,
          message: "এই নাম, পিতার নাম এবং জন্ম তারিখ দিয়ে ইতিমধ্যে একজন নাগরিক নিবন্ধিত আছে / A citizen with the same name, father's name and date of birth is already registered",
        };
      }

      const registrationNo = await generateCitizenRegistrationNo(
        prisma,
        sanitizedData.presentAddress.ward
      );

      // SECRETARY creates directly as ACTIVE, ENTREPRENEUR creates as PENDING
      const status = creatorRole === "SECRETARY" ? "ACTIVE" : "PENDING";

      const citizen = await prisma.citizen.create({
        data: {
          registrationNo,
          identityHash,
          nid: sanitizedData.nid,
          birthCertificateNo: sanitizedData.birthCertificateNo,
          name: sanitizedData.name,
          nameEn: sanitizedData.nameEn || sanitizedData.name,
          nameBn: sanitizedData.nameBn,
          fatherName: sanitizedData.fatherName,
          fatherNameBn: sanitizedData.fatherNameBn,
          motherName: sanitizedData.motherName,
          motherNameBn: sanitizedData.motherNameBn,
          dateOfBirth,
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
          status,
          createdById: createdBy,
        },
      });

      await logAudit({
        userId: createdBy,
        action: "CREATE",
        entityType: "CITIZEN",
        entityId: citizen.id,
        entityName: citizen.name,
        description: `Citizen created: ${citizen.name} (${citizen.registrationNo})`,
        severity: "LOW",
      });

      return {
        success: true,
        citizen,
        message: "Citizen registered successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: formatCitizenPersistenceError(error),
      };
    }
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

    try {
      const normalizedData = {
        ...sanitizedData,
        ...(sanitizedData.dateOfBirth !== undefined
          ? { dateOfBirth: normalizeCitizenDateOfBirth(sanitizedData.dateOfBirth) }
          : {}),
      };

      const citizen = await prisma.citizen.findUnique({
        where: { id },
      });

      if (!citizen) {
        throw new Error("Citizen not found");
      }

      // If name, fatherName, or dateOfBirth are being changed, regenerate identity hash
      let identityHash: string | undefined;
      if (
        normalizedData.name !== undefined ||
        normalizedData.fatherName !== undefined ||
        normalizedData.dateOfBirth !== undefined
      ) {
        const newName = normalizedData.name ?? citizen.name;
        const newFatherName = normalizedData.fatherName ?? citizen.fatherName;
        const newDateOfBirth = normalizedData.dateOfBirth ?? citizen.dateOfBirth;

        identityHash = generateCitizenIdentityHash(
          newName,
          newFatherName,
          newDateOfBirth
        );

        // Check if the new identity hash already exists (for a different citizen)
        if (identityHash !== citizen.identityHash) {
          const allWithIdentity = await prisma.citizen.findMany({
            where: { identityHash },
            select: { id: true, deletedAt: true },
          });
          const existingIdentity = allWithIdentity.find(
            c => !c.deletedAt && c.id !== id
          );
          if (existingIdentity) {
            return {
              success: false,
              message:
                "এই নাম, পিতার নাম এবং জন্ম তারিখ দিয়ে ইতিমধ্যে অন্য একজন নাগরিক নিবন্ধিত আছে / Another citizen with the same name, father's name and date of birth is already registered",
            };
          }
        }
      }

      if (normalizedData.nid && normalizedData.nid !== citizen.nid) {
        const existingNid = await prisma.citizen.findFirst({
          where: {
            nid: normalizedData.nid,
            id: { not: id },
            deletedAt: null,
          },
        });
        if (existingNid) {
          throw new Error("NID already registered to another citizen");
        }
      }

      const changes: { before: Record<string, unknown>; after: Record<string, unknown> } = {
        before: {},
        after: {},
      };

      Object.keys(normalizedData).forEach((key) => {
        const k = key as keyof typeof normalizedData;
        const currentValue = citizen[k as keyof typeof citizen];
        if (JSON.stringify(currentValue) !== JSON.stringify(normalizedData[k])) {
          changes.before[key] = currentValue;
          changes.after[key] = normalizedData[k];
        }
      });

      await prisma.citizen.updateMany({
        where: { id },
        data: {
          ...normalizedData,
          ...(identityHash !== undefined ? { identityHash } : {}),
          nameEn:
            normalizedData.name !== undefined
              ? normalizedData.nameEn || normalizedData.name
              : normalizedData.nameEn,
          updatedById: updatedBy,
        },
      });

      const updatedCitizen = await prisma.citizen.findUnique({
        where: { id },
      });

      if (!updatedCitizen) {
        throw new Error("Citizen not found after update");
      }

      if (Object.keys(changes.before).length > 0) {
        await logAudit({
          userId: updatedBy,
          action: "UPDATE",
          entityType: "CITIZEN",
          entityId: citizen.id,
          entityName: citizen.name,
          description: `Citizen updated: ${citizen.name}`,
          severity: "LOW",
          changes,
        });
      }

      return {
        success: true,
        citizen: updatedCitizen,
        message: "Citizen updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: formatCitizenPersistenceError(error),
      };
    }
  }

  static async delete(id: string, deletedBy?: string): Promise<{ success: boolean; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid citizen ID" };
    }

    try {
      const citizen = await prisma.citizen.findUnique({
        where: { id },
      });

      if (!citizen) {
        throw new Error("Citizen not found");
      }

      await prisma.citizen.updateMany({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: deletedBy,
        },
      });

      await logAudit({
        userId: deletedBy,
        action: "SOFT_DELETE",
        entityType: "CITIZEN",
        entityId: citizen.id,
        entityName: citizen.name,
        description: `Citizen deleted: ${citizen.name} (${citizen.registrationNo})`,
        severity: "MEDIUM",
      });

      return { success: true, message: "Citizen deleted successfully" };
    } catch (error) {
      return {
        success: false,
        message: formatCitizenPersistenceError(error),
      };
    }
  }

  static async getStats(unionParishadId?: string): Promise<{
    total: number;
    byWard: Record<number, number>;
    byGender: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const baseWhere: Prisma.CitizenWhereInput = unionParishadId 
      ? { unionParishadId } 
      : {};

    // Get all citizens and filter in app layer
    const allCitizens = await prisma.citizen.findMany({
      where: baseWhere,
      select: { id: true, gender: true, status: true, presentAddress: true, deletedAt: true },
    });

    const activeCitizens = allCitizens.filter(c => !c.deletedAt);
    const total = activeCitizens.length;

    const byGender: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byWard: Record<number, number> = {};

    for (const c of activeCitizens) {
      byGender[c.gender] = (byGender[c.gender] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      const ward = (c.presentAddress as { ward?: number })?.ward;
      if (ward) {
        byWard[ward] = (byWard[ward] || 0) + 1;
      }
    }

    return { total, byWard, byGender, byStatus };
  }

  static async getPendingCount(): Promise<number> {
    const citizens = await prisma.citizen.findMany({
      where: { status: "PENDING" },
      select: { id: true, deletedAt: true },
    });
    return citizens.filter(c => !c.deletedAt).length;
  }

  static async getPendingCitizens(params: {
    page?: number;
    limit?: number;
  }): Promise<{
    citizens: CitizenWithAge[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const allPending = await prisma.citizen.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    // Filter soft-deleted in application layer
    const activePending = allPending.filter(c => !c.deletedAt);
    const total = activePending.length;
    const citizens = activePending.slice(skip, skip + limit);

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

  static async approve(
    id: string,
    approvedBy?: string
  ): Promise<{ success: boolean; citizen?: Citizen; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid citizen ID" };
    }

    try {
      const citizen = await prisma.citizen.findUnique({
        where: { id },
      });

      if (!citizen) {
        return { success: false, message: "Citizen not found" };
      }

      if (citizen.status !== "PENDING") {
        return { success: false, message: "Citizen is not pending approval" };
      }

      const updatedCitizen = await prisma.citizen.update({
        where: { id },
        data: {
          status: "ACTIVE",
          updatedById: approvedBy,
        },
      });

      await logAudit({
        userId: approvedBy,
        action: "APPROVE",
        entityType: "CITIZEN",
        entityId: citizen.id,
        entityName: citizen.name,
        description: `Citizen approved: ${citizen.name} (${citizen.registrationNo})`,
        severity: "LOW",
      });

      return {
        success: true,
        citizen: updatedCitizen,
        message: "Citizen approved successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: formatCitizenPersistenceError(error),
      };
    }
  }

  static async reject(
    id: string,
    rejectedBy?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!isValidObjectId(id)) {
      return { success: false, message: "Invalid citizen ID" };
    }

    try {
      const citizen = await prisma.citizen.findUnique({
        where: { id },
      });

      if (!citizen) {
        return { success: false, message: "Citizen not found" };
      }

      if (citizen.status !== "PENDING") {
        return { success: false, message: "Citizen is not pending approval" };
      }

      // Soft delete rejected citizen
      await prisma.citizen.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: rejectedBy,
        },
      });

      await logAudit({
        userId: rejectedBy,
        action: "REJECT",
        entityType: "CITIZEN",
        entityId: citizen.id,
        entityName: citizen.name,
        description: `Citizen rejected: ${citizen.name} (${citizen.registrationNo})`,
        severity: "MEDIUM",
      });

      return { success: true, message: "Citizen rejected successfully" };
    } catch (error) {
      return {
        success: false,
        message: formatCitizenPersistenceError(error),
      };
    }
  }
}
