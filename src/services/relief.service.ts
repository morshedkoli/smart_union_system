import prisma, { type PrismaTransactionClient } from "@/lib/db";
import {
  generateProgramCode,
  generateBeneficiaryNo,
  generateDistributionNo,
  isValidObjectId,
} from "@/lib/prisma-utils";
import {
  calculateRemainingEntitlement,
  calculateBudgetRemaining,
  determineBeneficiaryStatus,
  calculateAge,
} from "@/lib/prisma-virtuals";
import {
  BeneficiaryStatus,
  ProgramStatus,
  CitizenStatus,
  type ReliefProgram,
  type Beneficiary,
  type ReliefType,
  type FundingSource,
  type Citizen,
} from "@prisma/client";

// Re-export enums for external use
export { BeneficiaryStatus, ProgramStatus, CitizenStatus, ReliefType, FundingSource } from "@prisma/client";

// Type for ReliefProgram with relations
export type ReliefProgramWithRelations = ReliefProgram & {
  beneficiaries?: Beneficiary[];
};

// Type for Beneficiary with relations
export type BeneficiaryWithRelations = Beneficiary & {
  citizen?: Pick<Citizen, "id" | "name" | "nameBn" | "fatherName" | "presentAddress" | "nid">;
  program?: ReliefProgram;
};

interface CreateBeneficiaryData {
  programId: string;
  citizenId: string;
  totalEntitlement: number;
  notes?: string;
  priorityReason?: string;
}

interface CriteriaInput {
  minAge?: number;
  maxAge?: number;
  maxIncome?: number;
  wards?: number[];
  genders?: string[];
  maritalStatuses?: string[];
  isFreedomFighter?: boolean;
  isDisabled?: boolean;
  isWidow?: boolean;
  isOrphan?: boolean;
  customCriteria?: string;
}

interface ReliefFilters {
  status?: BeneficiaryStatus;
  ward?: number;
  query?: string;
}

const SYSTEM_USER_ID = "000000000000000000000001";

function toObjectId(value?: string): string {
  return value && isValidObjectId(value) ? value : SYSTEM_USER_ID;
}

// Local audit logger
async function logAudit(
  tx: PrismaTransactionClient | typeof prisma,
  data: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    oldValue?: unknown;
    newValue?: unknown;
    description?: string;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : undefined,
      newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : undefined,
      description: data.description,
    },
  });
}

export class ReliefService {
  static async listPrograms(): Promise<ReliefProgram[]> {
    const programs = await prisma.reliefProgram.findMany({
      orderBy: { createdAt: "desc" },
    });
    return programs;
  }

  static async listBeneficiaries(
    programId: string,
    filters: ReliefFilters = {}
  ): Promise<BeneficiaryWithRelations[]> {
    if (!isValidObjectId(programId)) {
      return [];
    }

    // Build where clause for beneficiaries
    const whereClause: {
      programId: string;
      status?: BeneficiaryStatus;
      deletedAt?: null;
    } = {
      programId,
      deletedAt: null,
    };

    if (filters.status) {
      whereClause.status = filters.status;
    }

    const beneficiaries = await prisma.beneficiary.findMany({
      where: whereClause,
      include: {
        citizen: {
          select: {
            id: true,
            name: true,
            nameBn: true,
            fatherName: true,
            presentAddress: true,
            nid: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Apply additional filters that require citizen data
    const filtered = beneficiaries.filter((item) => {
      const citizen = item.citizen;

      // Filter by ward
      if (filters.ward && citizen?.presentAddress?.ward !== filters.ward) {
        return false;
      }

      // Filter by search query
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const haystack = [
          item.beneficiaryNo,
          citizen?.name || "",
          citizen?.nameBn || "",
          citizen?.nid || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }

      return true;
    });

    return filtered;
  }

  static async createProgram(data: {
    name: string;
    nameEn: string;
    nameBn: string;
    type: ReliefType;
    fundingSource: FundingSource;
    startDate: Date;
    endDate?: Date;
    targetBeneficiaries: number;
    budgetTotal: number;
    criteria?: CriteriaInput;
  }): Promise<{ success: boolean; program?: ReliefProgram; message: string }> {
    // Check for duplicate
    const normalizedNameEn = data.nameEn.trim().toLowerCase();
    const duplicate = await prisma.reliefProgram.findFirst({
      where: {
        nameEn: { equals: normalizedNameEn, mode: "insensitive" },
        startDate: data.startDate,
        deletedAt: null,
      },
    });

    if (duplicate) {
      return { success: false, message: "Relief program already exists for this name and date" };
    }

    const programCode = await generateProgramCode(prisma, data.type);

    const program = await prisma.reliefProgram.create({
      data: {
        programCode,
        name: data.name,
        nameEn: data.nameEn,
        nameBn: data.nameBn,
        type: data.type,
        fundingSource: data.fundingSource,
        status: ProgramStatus.DRAFT,
        startDate: data.startDate,
        endDate: data.endDate,
        targetBeneficiaries: data.targetBeneficiaries,
        currentBeneficiaries: 0,
        eligibilityCriteria: data.criteria
          ? {
              minAge: data.criteria.minAge,
              maxAge: data.criteria.maxAge,
              maxIncome: data.criteria.maxIncome,
              wards: data.criteria.wards || [],
              genders: data.criteria.genders || [],
              maritalStatuses: data.criteria.maritalStatuses || [],
              isFreedomFighter: data.criteria.isFreedomFighter,
              isDisabled: data.criteria.isDisabled,
              isWidow: data.criteria.isWidow,
              isOrphan: data.criteria.isOrphan,
              customCriteria: data.criteria.customCriteria,
            }
          : undefined,
        budget: {
          totalBudget: data.budgetTotal,
          allocatedBudget: 0,
          disbursedAmount: 0,
          remainingAmount: data.budgetTotal,
          currency: "BDT",
        },
      },
    });

    return {
      success: true,
      program,
      message: "Relief program created",
    };
  }

  static async updateCriteria(
    programId: string,
    criteria: CriteriaInput,
    userId?: string
  ): Promise<{ success: boolean; program?: ReliefProgram; message: string }> {
    if (!isValidObjectId(programId)) {
      return { success: false, message: "Invalid program ID" };
    }

    const program = await prisma.reliefProgram.findUnique({
      where: { id: programId },
    });

    if (!program) {
      return { success: false, message: "Program not found" };
    }

    if (
      program.status === ProgramStatus.COMPLETED ||
      program.status === ProgramStatus.CANCELLED
    ) {
      return { success: false, message: "Program is locked and cannot be updated" };
    }

    const existingCriteria = program.eligibilityCriteria || {};

    await prisma.reliefProgram.updateMany({
      where: { id: programId },
      data: {
        eligibilityCriteria: {
          minAge: criteria.minAge ?? existingCriteria.minAge,
          maxAge: criteria.maxAge ?? existingCriteria.maxAge,
          maxIncome: criteria.maxIncome ?? existingCriteria.maxIncome,
          wards: criteria.wards ?? existingCriteria.wards ?? [],
          genders: criteria.genders ?? existingCriteria.genders ?? [],
          maritalStatuses: criteria.maritalStatuses ?? existingCriteria.maritalStatuses ?? [],
          isFreedomFighter: criteria.isFreedomFighter ?? existingCriteria.isFreedomFighter,
          isDisabled: criteria.isDisabled ?? existingCriteria.isDisabled,
          isWidow: criteria.isWidow ?? existingCriteria.isWidow,
          isOrphan: criteria.isOrphan ?? existingCriteria.isOrphan,
          customCriteria: criteria.customCriteria ?? existingCriteria.customCriteria,
        },
        status: ProgramStatus.PLANNED,
        updatedById: toObjectId(userId),
      },
    });

    const updatedProgram = await prisma.reliefProgram.findUnique({
      where: { id: programId },
    });

    return {
      success: true,
      program: updatedProgram,
      message: "Criteria updated",
    };
  }

  static async autoListByCriteria(
    programId: string,
    userId?: string
  ): Promise<{ success: boolean; added: number; skipped: number; message: string }> {
    if (!isValidObjectId(programId)) {
      return { success: false, added: 0, skipped: 0, message: "Invalid program ID" };
    }

    const program = await prisma.reliefProgram.findUnique({
      where: { id: programId },
    });

    if (!program) {
      return { success: false, added: 0, skipped: 0, message: "Program not found" };
    }

    const criteria = program.eligibilityCriteria || {};

    // Build citizen query
    const citizenWhere: {
      status: CitizenStatus;
      income?: { lte: number };
      presentAddress?: { is: { ward: { in: number[] } } };
      gender?: { in: string[] };
      maritalStatus?: { in: string[] };
      isFreedomFighter?: boolean;
      isDisabled?: boolean;
      isWidow?: boolean;
      isOrphan?: boolean;
      deletedAt: null;
    } = {
      status: CitizenStatus.ACTIVE,
      deletedAt: null,
    };

    if (criteria.maxIncome !== undefined && criteria.maxIncome !== null) {
      citizenWhere.income = { lte: criteria.maxIncome };
    }

    if (criteria.wards && criteria.wards.length > 0) {
      citizenWhere.presentAddress = { is: { ward: { in: criteria.wards } } };
    }

    if (criteria.genders && criteria.genders.length > 0) {
      // Cast to expected enum values
      citizenWhere.gender = { in: criteria.genders as unknown as string[] };
    }

    if (criteria.maritalStatuses && criteria.maritalStatuses.length > 0) {
      citizenWhere.maritalStatus = { in: criteria.maritalStatuses as unknown as string[] };
    }

    if (criteria.isFreedomFighter !== undefined && criteria.isFreedomFighter !== null) {
      citizenWhere.isFreedomFighter = criteria.isFreedomFighter;
    }

    if (criteria.isDisabled !== undefined && criteria.isDisabled !== null) {
      citizenWhere.isDisabled = criteria.isDisabled;
    }

    if (criteria.isWidow !== undefined && criteria.isWidow !== null) {
      citizenWhere.isWidow = criteria.isWidow;
    }

    if (criteria.isOrphan !== undefined && criteria.isOrphan !== null) {
      citizenWhere.isOrphan = criteria.isOrphan;
    }

    const citizens = await prisma.citizen.findMany({
      where: citizenWhere,
      select: {
        id: true,
        registrationNo: true,
        dateOfBirth: true,
      },
      take: program.targetBeneficiaries * 4,
    });

    let added = 0;
    let skipped = 0;

    for (const citizen of citizens) {
      const age = calculateAge(citizen.dateOfBirth);

      if (criteria.minAge !== undefined && criteria.minAge !== null && age !== null && age < criteria.minAge) {
        skipped += 1;
        continue;
      }

      if (criteria.maxAge !== undefined && criteria.maxAge !== null && age !== null && age > criteria.maxAge) {
        skipped += 1;
        continue;
      }

      // Check for existing beneficiary
      const duplicate = await prisma.beneficiary.findFirst({
        where: {
          programId,
          citizenId: citizen.id,
          deletedAt: null,
        },
      });

      if (duplicate) {
        skipped += 1;
        continue;
      }

      const beneficiaryNo = await generateBeneficiaryNo(prisma, program.programCode);

      await prisma.beneficiary.create({
        data: {
          beneficiaryNo,
          programId,
          citizenId: citizen.id,
          status: BeneficiaryStatus.PENDING,
          totalEntitlement: 0,
          totalReceived: 0,
          remainingEntitlement: 0,
          distributions: [],
          notes: "Added by auto-list criteria",
          createdById: toObjectId(userId),
          updatedById: toObjectId(userId),
        },
      });

      added += 1;
      if (added >= program.targetBeneficiaries) break;
    }

    // Update program count and status
    const currentCount = await prisma.beneficiary.count({
      where: {
        programId,
        deletedAt: null,
      },
    });

    await prisma.reliefProgram.updateMany({
      where: { id: programId },
      data: {
        currentBeneficiaries: currentCount,
        status: ProgramStatus.ACTIVE,
        updatedById: toObjectId(userId),
      },
    });

    return {
      success: true,
      added,
      skipped,
      message: "Auto list completed",
    };
  }

  static async createBeneficiary(
    data: CreateBeneficiaryData,
    userId?: string
  ): Promise<{ success: boolean; beneficiary?: Beneficiary; message: string }> {
    if (!isValidObjectId(data.programId) || !isValidObjectId(data.citizenId)) {
      return { success: false, message: "Invalid program/citizen ID" };
    }

    const [program, citizen] = await Promise.all([
      prisma.reliefProgram.findUnique({ where: { id: data.programId } }),
      prisma.citizen.findUnique({ where: { id: data.citizenId } }),
    ]);

    if (!program) return { success: false, message: "Program not found" };
    if (!citizen) return { success: false, message: "Citizen not found" };

    // Check for duplicate
    const duplicate = await prisma.beneficiary.findFirst({
      where: {
        programId: data.programId,
        citizenId: data.citizenId,
        deletedAt: null,
      },
    });

    if (duplicate) {
      return { success: false, message: "Duplicate beneficiary is not allowed for this program" };
    }

    const beneficiaryNo = await generateBeneficiaryNo(prisma, program.programCode);

    const beneficiary = await prisma.$transaction(async (tx) => {
      const newBeneficiary = await tx.beneficiary.create({
        data: {
          beneficiaryNo,
          programId: data.programId,
          citizenId: data.citizenId,
          status: BeneficiaryStatus.PENDING,
          totalEntitlement: data.totalEntitlement,
          totalReceived: 0,
          remainingEntitlement: data.totalEntitlement,
          distributions: [],
          notes: data.notes,
          priorityReason: data.priorityReason,
          createdById: toObjectId(userId),
          updatedById: toObjectId(userId),
        },
      });

      // Increment beneficiary count
      const program = await tx.reliefProgram.findUnique({
        where: { id: data.programId },
      });

      if (program) {
        await tx.reliefProgram.updateMany({
          where: { id: data.programId },
          data: {
            currentBeneficiaries: program.currentBeneficiaries + 1,
            updatedById: toObjectId(userId),
          },
        });
      }

      return newBeneficiary;
    });

    return {
      success: true,
      beneficiary,
      message: "Beneficiary created",
    };
  }

  static async reviewBeneficiary(
    beneficiaryId: string,
    payload: {
      status: typeof BeneficiaryStatus.VERIFIED | typeof BeneficiaryStatus.REJECTED;
      note?: string;
    },
    userId?: string
  ): Promise<{ success: boolean; beneficiary?: Beneficiary; message: string }> {
    if (!isValidObjectId(beneficiaryId)) {
      return { success: false, message: "Invalid beneficiary ID" };
    }

    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
    });

    if (!beneficiary) return { success: false, message: "Beneficiary not found" };

    if (beneficiary.isLocked || beneficiary.status === BeneficiaryStatus.APPROVED) {
      return { success: false, message: "Approved beneficiary is locked" };
    }

    const updateData: {
      status: BeneficiaryStatus;
      rejectedAt?: Date;
      rejectedById?: string;
      rejectionReason?: string;
      verifiedAt?: Date;
      verifiedById?: string;
      notes?: string;
      updatedById: string;
    } = {
      status: payload.status,
      updatedById: toObjectId(userId),
    };

    if (payload.status === BeneficiaryStatus.REJECTED) {
      updateData.rejectedAt = new Date();
      updateData.rejectedById = toObjectId(userId);
      updateData.rejectionReason = payload.note;
    } else {
      updateData.verifiedAt = new Date();
      updateData.verifiedById = toObjectId(userId);
    }

    if (payload.note) {
      updateData.notes = payload.note;
    }

    await prisma.beneficiary.updateMany({
      where: { id: beneficiaryId },
      data: updateData,
    });

    const updatedBeneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
    });

    return {
      success: true,
      beneficiary: updatedBeneficiary,
      message: "Beneficiary review saved",
    };
  }

  static async approveBeneficiary(
    beneficiaryId: string,
    userId?: string
  ): Promise<{ success: boolean; beneficiary?: Beneficiary; message: string }> {
    if (!isValidObjectId(beneficiaryId)) {
      return { success: false, message: "Invalid beneficiary ID" };
    }

    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
    });

    if (!beneficiary) return { success: false, message: "Beneficiary not found" };

    if (beneficiary.isLocked || beneficiary.status === BeneficiaryStatus.APPROVED) {
      return { success: false, message: "Beneficiary already approved and locked" };
    }

    if (beneficiary.status !== BeneficiaryStatus.VERIFIED) {
      return { success: false, message: "Only verified beneficiaries can be approved" };
    }

    // Prepare distributions array
    let distributions = beneficiary.distributions || [];

    if (distributions.length === 0) {
      const distributionNo = await generateDistributionNo(beneficiary.beneficiaryNo, 0);
      distributions = [
        {
          distributionNo,
          scheduledDate: new Date(),
          distributedDate: null,
          status: "SCHEDULED",
          amount: null,
          items: [],
          collectedBy: null,
          collectorNid: null,
          collectorRelation: null,
          collectorSignature: null,
          distributedById: null,
          receiptNo: null,
          remarks: null,
          photo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }

    await prisma.beneficiary.updateMany({
      where: { id: beneficiaryId },
      data: {
        status: BeneficiaryStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: toObjectId(userId),
        isLocked: true,
        lockedAt: new Date(),
        updatedById: toObjectId(userId),
        distributions,
      },
    });

    const updatedBeneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
    });

    return {
      success: true,
      beneficiary: updatedBeneficiary,
      message: "Beneficiary approved and locked",
    };
  }
}
