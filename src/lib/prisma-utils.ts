/**
 * Prisma Utility Functions
 * Replaces Mongoose static methods for ID generation
 */

import type { CertificateType, ReliefType, TransactionType } from "@prisma/client";

/**
 * Generate citizen registration number
 * Format: CIT-{YEAR}-W{WARD}-{SEQUENCE}
 */
export async function generateCitizenRegistrationNo(
  prisma: {
    citizen: {
      count: (args: {
        where: {
          registrationNo: { startsWith: string };
          deletedAt: null;
        };
      }) => Promise<number>;
    };
  },
  wardNo: number,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `CIT-${currentYear}-W${wardNo.toString().padStart(2, "0")}`;

  const count = await prisma.citizen.count({
    where: {
      registrationNo: { startsWith: prefix },
      deletedAt: null,
    },
  });

  return `${prefix}-${(count + 1).toString().padStart(5, "0")}`;
}

/**
 * Generate certificate number
 * Format: {TYPE_CODE}-{YEAR}-{SEQUENCE}
 */
export async function generateCertificateNo(
  prisma: {
    certificate: {
      count: (args: {
        where: {
          certificateNo: { startsWith: string };
        };
      }) => Promise<number>;
    };
  },
  type: CertificateType,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const typeCode = type.substring(0, 3).toUpperCase();
  const prefix = `${typeCode}-${currentYear}`;

  const count = await prisma.certificate.count({
    where: {
      certificateNo: { startsWith: prefix },
    },
  });

  return `${prefix}-${(count + 1).toString().padStart(6, "0")}`;
}

/**
 * Generate certificate reference number
 * Format: REF-{TYPE_CODE}-{YEAR}-{SEQUENCE}
 */
export async function generateCertificateReferenceNo(
  prisma: {
    certificate: {
      count: (args: {
        where: {
          referenceNo: { startsWith: string };
        };
      }) => Promise<number>;
    };
  },
  type: CertificateType,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const typeCode = type.substring(0, 3).toUpperCase();
  const prefix = `REF-${typeCode}-${currentYear}`;

  const count = await prisma.certificate.count({
    where: {
      referenceNo: { startsWith: prefix },
    },
  });

  return `${prefix}-${(count + 1).toString().padStart(6, "0")}`;
}

/**
 * Generate holding tax reference number
 * Format: HT-{FISCAL_YEAR}-W{WARD}-{SEQUENCE}
 */
export async function generateHoldingTaxReferenceNo(
  prisma: {
    holdingTax: {
      count: (args: {
        where: {
          referenceNo: { startsWith: string };
        };
      }) => Promise<number>;
    };
  },
  fiscalYear: string,
  ward: number
): Promise<string> {
  const prefix = `HT-${fiscalYear.replace("-", "")}-W${ward.toString().padStart(2, "0")}`;

  const count = await prisma.holdingTax.count({
    where: {
      referenceNo: { startsWith: prefix },
    },
  });

  return `${prefix}-${(count + 1).toString().padStart(5, "0")}`;
}

/**
 * Generate relief program code
 * Format: RP-{TYPE_CODE}-{YEAR}-{SEQUENCE}
 */
export async function generateProgramCode(
  prisma: {
    reliefProgram: {
      count: (args: {
        where: {
          programCode: { startsWith: string };
        };
      }) => Promise<number>;
    };
  },
  type: ReliefType,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const typeCode = type.substring(0, 3).toUpperCase();
  const prefix = `RP-${typeCode}-${currentYear}`;

  const count = await prisma.reliefProgram.count({
    where: {
      programCode: { startsWith: prefix },
    },
  });

  return `${prefix}-${(count + 1).toString().padStart(4, "0")}`;
}

/**
 * Generate beneficiary number
 * Format: BEN-{PROGRAM_CODE}-{SEQUENCE}
 */
export async function generateBeneficiaryNo(
  prisma: {
    beneficiary: {
      count: (args: {
        where: {
          beneficiaryNo: { startsWith: string };
        };
      }) => Promise<number>;
    };
  },
  programCode: string
): Promise<string> {
  const prefix = `BEN-${programCode}`;

  const count = await prisma.beneficiary.count({
    where: {
      beneficiaryNo: { startsWith: prefix },
    },
  });

  return `${prefix}-${(count + 1).toString().padStart(5, "0")}`;
}

/**
 * Generate cashbook entry number
 * Format: CB-{FISCAL_YEAR}-{TYPE}-{SEQUENCE}
 */
export async function generateCashbookEntryNo(
  prisma: {
    cashbook: {
      count: (args: {
        where: {
          entryNo: { startsWith: string };
        };
      }) => Promise<number>;
    };
  },
  fiscalYear: string,
  type: TransactionType
): Promise<string> {
  const typeCode = type === "INCOME" ? "IN" : "EX";
  const prefix = `CB-${fiscalYear.replace("-", "")}-${typeCode}`;

  const count = await prisma.cashbook.count({
    where: {
      entryNo: { startsWith: prefix },
    },
  });

  return `${prefix}-${(count + 1).toString().padStart(5, "0")}`;
}

/**
 * Generate tax payment receipt number
 * Format: RCP-{FISCAL_YEAR}-{SEQUENCE}
 */
export async function generateReceiptNo(
  prisma: {
    holdingTax: {
      findMany: (args: {
        where: {
          fiscalYear: string;
        };
        select: {
          payments: true;
        };
      }) => Promise<Array<{ payments: unknown[] }>>;
    };
  },
  fiscalYear: string
): Promise<string> {
  const prefix = `RCP-${fiscalYear.replace("-", "")}`;

  // Count existing receipts across all holding taxes
  const holdingTaxes = await prisma.holdingTax.findMany({
    where: {
      fiscalYear,
    },
    select: {
      payments: true,
    },
  });

  let totalReceipts = 0;
  for (const ht of holdingTaxes) {
    totalReceipts += ht.payments.length;
  }

  return `${prefix}-${(totalReceipts + 1).toString().padStart(6, "0")}`;
}

/**
 * Generate distribution number for beneficiary
 * Format: DIST-{BENEFICIARY_NO}-{SEQUENCE}
 */
export async function generateDistributionNo(
  beneficiaryNo: string,
  existingDistributionsCount: number
): Promise<string> {
  return `DIST-${beneficiaryNo}-${(existingDistributionsCount + 1).toString().padStart(3, "0")}`;
}

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Get current fiscal year in format YYYY-YYYY
 */
export function getCurrentFiscalYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Fiscal year starts in July (month 6)
  if (currentMonth >= 6) {
    return `${currentYear}-${currentYear + 1}`;
  }
  return `${currentYear - 1}-${currentYear}`;
}

/**
 * Calculate cashbook balance for a union parishad
 */
export async function getCashbookBalance(
  prisma: {
    cashbook: {
      findMany: (args: {
        where: {
          unionParishadId: string;
          fiscalYear: string;
          status: "APPROVED";
          deletedAt: null;
          transactionDate?: { lte: Date };
        };
        select: {
          transactionType: true;
          amount: true;
        };
      }) => Promise<Array<{ transactionType: TransactionType; amount: number }>>;
    };
  },
  unionParishadId: string,
  fiscalYear: string,
  upToDate?: Date
): Promise<{ income: number; expense: number; balance: number }> {
  const where: {
    unionParishadId: string;
    fiscalYear: string;
    status: "APPROVED";
    deletedAt: null;
    transactionDate?: { lte: Date };
  } = {
    unionParishadId,
    fiscalYear,
    status: "APPROVED",
    deletedAt: null,
  };

  if (upToDate) {
    where.transactionDate = { lte: upToDate };
  }

  const entries = await prisma.cashbook.findMany({
    where,
    select: {
      transactionType: true,
      amount: true,
    },
  });

  let income = 0;
  let expense = 0;

  for (const entry of entries) {
    if (entry.transactionType === "INCOME") {
      income += entry.amount;
    } else {
      expense += entry.amount;
    }
  }

  return {
    income,
    expense,
    balance: income - expense,
  };
}
