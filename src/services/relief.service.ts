import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
  Beneficiary,
  BeneficiaryStatus,
  Citizen,
  CitizenStatus,
  DistributionStatus,
  ReliefProgram,
  type IBeneficiary,
  type IReliefProgram,
  ProgramStatus,
} from "@/models";

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

function toObjectId(value?: string): mongoose.Types.ObjectId {
  const safe = value && mongoose.Types.ObjectId.isValid(value) ? value : SYSTEM_USER_ID;
  return new mongoose.Types.ObjectId(safe);
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export class ReliefService {
  static async listPrograms(): Promise<IReliefProgram[]> {
    await connectDB();
    const programs = await ReliefProgram.find({})
      .sort({ createdAt: -1 })
      .lean();
    return programs as IReliefProgram[];
  }

  static async listBeneficiaries(
    programId: string,
    filters: ReliefFilters = {}
  ): Promise<IBeneficiary[]> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      return [];
    }

    const programObjectId = new mongoose.Types.ObjectId(programId);

    const query: Record<string, unknown> = {
      program: programObjectId,
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.ward) {
      query["citizen.presentAddress.ward"] = filters.ward;
    }

    if (filters.query) {
      query.$or = [
        { beneficiaryNo: { $regex: filters.query, $options: "i" } },
        { "citizen.name": { $regex: filters.query, $options: "i" } },
        { "citizen.nameBn": { $regex: filters.query, $options: "i" } },
        { "citizen.nid": { $regex: filters.query, $options: "i" } },
      ];
    }

    const beneficiaries = await Beneficiary.find({ program: programObjectId })
      .populate("citizen", "name nameBn fatherName presentAddress nid")
      .sort({ createdAt: -1 })
      .lean();

    const filtered = beneficiaries.filter((item) => {
      const citizen = item.citizen as unknown as {
        name?: string;
        nameBn?: string;
        nid?: string;
        presentAddress?: { ward?: number };
      };
      if (filters.status && item.status !== filters.status) return false;
      if (filters.ward && citizen?.presentAddress?.ward !== filters.ward) return false;
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
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return filtered as IBeneficiary[];
  }

  static async createProgram(data: {
    name: string;
    nameEn: string;
    nameBn: string;
    type: IReliefProgram["type"];
    fundingSource: IReliefProgram["fundingSource"];
    startDate: Date;
    endDate?: Date;
    targetBeneficiaries: number;
    budgetTotal: number;
    criteria?: CriteriaInput;
  }): Promise<{ success: boolean; program?: IReliefProgram; message: string }> {
    await connectDB();

    const normalizedNameEn = data.nameEn.trim().toLowerCase();
    const duplicate = await ReliefProgram.findOne({
      nameEn: { $regex: `^${normalizedNameEn}$`, $options: "i" },
      startDate: data.startDate,
    });
    if (duplicate) {
      return { success: false, message: "Relief program already exists for this name and date" };
    }

    const programCode = await (
      ReliefProgram as typeof ReliefProgram & {
        generateProgramCode: (type: IReliefProgram["type"], year?: number) => Promise<string>;
      }
    ).generateProgramCode(data.type);

    const program = await ReliefProgram.create({
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
      eligibilityCriteria: data.criteria || {},
      budget: {
        totalBudget: data.budgetTotal,
        allocatedBudget: 0,
        disbursedAmount: 0,
        remainingAmount: data.budgetTotal,
        currency: "BDT",
      },
    });

    return {
      success: true,
      program: program.toObject() as IReliefProgram,
      message: "Relief program created",
    };
  }

  static async updateCriteria(
    programId: string,
    criteria: CriteriaInput,
    userId?: string
  ): Promise<{ success: boolean; program?: IReliefProgram; message: string }> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      return { success: false, message: "Invalid program ID" };
    }

    const program = await ReliefProgram.findById(programId);
    if (!program) {
      return { success: false, message: "Program not found" };
    }
    if (
      program.status === ProgramStatus.COMPLETED ||
      program.status === ProgramStatus.CANCELLED
    ) {
      return { success: false, message: "Program is locked and cannot be updated" };
    }

    program.eligibilityCriteria = {
      ...program.eligibilityCriteria,
      ...criteria,
    };
    program.status = ProgramStatus.PLANNED;
    program.updatedBy = toObjectId(userId);

    await program.save();
    return {
      success: true,
      program: program.toObject() as IReliefProgram,
      message: "Criteria updated",
    };
  }

  static async autoListByCriteria(
    programId: string,
    userId?: string
  ): Promise<{ success: boolean; added: number; skipped: number; message: string }> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      return { success: false, added: 0, skipped: 0, message: "Invalid program ID" };
    }

    const program = await ReliefProgram.findById(programId).lean();
    if (!program) {
      return { success: false, added: 0, skipped: 0, message: "Program not found" };
    }

    const criteria = program.eligibilityCriteria || {};
    const baseFilter: Record<string, unknown> = {
      status: CitizenStatus.ACTIVE,
    };

    if (criteria.maxIncome !== undefined) baseFilter.income = { $lte: criteria.maxIncome };
    if (criteria.wards?.length) baseFilter["presentAddress.ward"] = { $in: criteria.wards };
    if (criteria.genders?.length) baseFilter.gender = { $in: criteria.genders };
    if (criteria.maritalStatuses?.length) {
      baseFilter.maritalStatus = { $in: criteria.maritalStatuses };
    }
    if (criteria.isFreedomFighter !== undefined) {
      baseFilter.isFreedomFighter = criteria.isFreedomFighter;
    }
    if (criteria.isDisabled !== undefined) baseFilter.isDisabled = criteria.isDisabled;
    if (criteria.isWidow !== undefined) baseFilter.isWidow = criteria.isWidow;
    if (criteria.isOrphan !== undefined) baseFilter.isOrphan = criteria.isOrphan;

    const citizens = await Citizen.find(baseFilter)
      .select("_id registrationNo dateOfBirth")
      .limit(program.targetBeneficiaries * 4)
      .lean();

    let added = 0;
    let skipped = 0;

    for (const citizen of citizens) {
      const age = calculateAge(citizen.dateOfBirth as unknown as Date);
      if (criteria.minAge !== undefined && age < criteria.minAge) {
        skipped += 1;
        continue;
      }
      if (criteria.maxAge !== undefined && age > criteria.maxAge) {
        skipped += 1;
        continue;
      }

      const duplicate = await Beneficiary.findOne({
        program: new mongoose.Types.ObjectId(programId),
        citizen: citizen._id,
      }).lean();

      if (duplicate) {
        skipped += 1;
        continue;
      }

      const beneficiaryNo = await (
        Beneficiary as typeof Beneficiary & {
          generateBeneficiaryNo: (programCode: string) => Promise<string>;
        }
      ).generateBeneficiaryNo(program.programCode);

      await Beneficiary.create({
        beneficiaryNo,
        program: new mongoose.Types.ObjectId(programId),
        citizen: citizen._id,
        status: BeneficiaryStatus.PENDING,
        totalEntitlement: 0,
        totalReceived: 0,
        remainingEntitlement: 0,
        distributions: [],
        notes: "Added by auto-list criteria",
        createdBy: toObjectId(userId),
        updatedBy: toObjectId(userId),
      });

      added += 1;
      if (added >= program.targetBeneficiaries) break;
    }

    await ReliefProgram.findByIdAndUpdate(programId, {
      currentBeneficiaries: await Beneficiary.countDocuments({
        program: new mongoose.Types.ObjectId(programId),
      }),
      status: ProgramStatus.ACTIVE,
      updatedBy: toObjectId(userId),
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
  ): Promise<{ success: boolean; beneficiary?: IBeneficiary; message: string }> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(data.programId) || !mongoose.Types.ObjectId.isValid(data.citizenId)) {
      return { success: false, message: "Invalid program/citizen ID" };
    }

    const [program, citizen] = await Promise.all([
      ReliefProgram.findById(data.programId).lean(),
      Citizen.findById(data.citizenId).lean(),
    ]);
    if (!program) return { success: false, message: "Program not found" };
    if (!citizen) return { success: false, message: "Citizen not found" };

    const duplicate = await Beneficiary.findOne({
      program: new mongoose.Types.ObjectId(data.programId),
      citizen: new mongoose.Types.ObjectId(data.citizenId),
    }).lean();
    if (duplicate) {
      return { success: false, message: "Duplicate beneficiary is not allowed for this program" };
    }

    const beneficiaryNo = await (
      Beneficiary as typeof Beneficiary & {
        generateBeneficiaryNo: (programCode: string) => Promise<string>;
      }
    ).generateBeneficiaryNo(program.programCode);

    const beneficiary = await Beneficiary.create({
      beneficiaryNo,
      program: new mongoose.Types.ObjectId(data.programId),
      citizen: new mongoose.Types.ObjectId(data.citizenId),
      status: BeneficiaryStatus.PENDING,
      totalEntitlement: data.totalEntitlement,
      totalReceived: 0,
      remainingEntitlement: data.totalEntitlement,
      distributions: [],
      notes: data.notes,
      priorityReason: data.priorityReason,
      createdBy: toObjectId(userId),
      updatedBy: toObjectId(userId),
    });

    await ReliefProgram.findByIdAndUpdate(data.programId, {
      $inc: { currentBeneficiaries: 1 },
      updatedBy: toObjectId(userId),
    });

    return {
      success: true,
      beneficiary: beneficiary.toObject() as IBeneficiary,
      message: "Beneficiary created",
    };
  }

  static async reviewBeneficiary(
    beneficiaryId: string,
    payload: {
      status: BeneficiaryStatus.VERIFIED | BeneficiaryStatus.REJECTED;
      note?: string;
    },
    userId?: string
  ): Promise<{ success: boolean; beneficiary?: IBeneficiary; message: string }> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(beneficiaryId)) {
      return { success: false, message: "Invalid beneficiary ID" };
    }

    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) return { success: false, message: "Beneficiary not found" };
    if (beneficiary.isLocked || beneficiary.status === BeneficiaryStatus.APPROVED) {
      return { success: false, message: "Approved beneficiary is locked" };
    }

    if (payload.status === BeneficiaryStatus.REJECTED) {
      beneficiary.status = BeneficiaryStatus.REJECTED;
      beneficiary.rejectedAt = new Date();
      beneficiary.rejectedBy = toObjectId(userId);
      beneficiary.rejectionReason = payload.note;
    } else {
      beneficiary.status = BeneficiaryStatus.VERIFIED;
      beneficiary.verifiedAt = new Date();
      beneficiary.verifiedBy = toObjectId(userId);
    }
    if (payload.note) beneficiary.notes = payload.note;
    beneficiary.updatedBy = toObjectId(userId);

    await beneficiary.save();
    return {
      success: true,
      beneficiary: beneficiary.toObject() as IBeneficiary,
      message: "Beneficiary review saved",
    };
  }

  static async approveBeneficiary(
    beneficiaryId: string,
    userId?: string
  ): Promise<{ success: boolean; beneficiary?: IBeneficiary; message: string }> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(beneficiaryId)) {
      return { success: false, message: "Invalid beneficiary ID" };
    }

    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) return { success: false, message: "Beneficiary not found" };
    if (beneficiary.isLocked || beneficiary.status === BeneficiaryStatus.APPROVED) {
      return { success: false, message: "Beneficiary already approved and locked" };
    }
    if (beneficiary.status !== BeneficiaryStatus.VERIFIED) {
      return { success: false, message: "Only verified beneficiaries can be approved" };
    }

    beneficiary.status = BeneficiaryStatus.APPROVED;
    beneficiary.approvedAt = new Date();
    beneficiary.approvedBy = toObjectId(userId);
    beneficiary.isLocked = true;
    beneficiary.lockedAt = new Date();
    beneficiary.updatedBy = toObjectId(userId);

    if (!beneficiary.distributions.length) {
      beneficiary.distributions.push({
        distributionNo: `DST-${Date.now().toString(36).toUpperCase()}`,
        scheduledDate: new Date(),
        status: DistributionStatus.SCHEDULED,
      } as IBeneficiary["distributions"][0]);
    }

    await beneficiary.save();
    return {
      success: true,
      beneficiary: beneficiary.toObject() as IBeneficiary,
      message: "Beneficiary approved and locked",
    };
  }
}

