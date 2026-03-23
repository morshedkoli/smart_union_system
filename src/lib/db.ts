import { PrismaClient, Prisma } from "@prisma/client";

// Models that use soft delete pattern
const SOFT_DELETE_MODELS = [
  "citizen",
  "certificate",
  "certificateTemplate",
  "holdingTax",
  "reliefProgram",
  "beneficiary",
  "cashbook",
  "notification",
  // "user", // Temporarily disabled for MongoDB compatibility
] as const;

type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

function isSoftDeleteModel(model: string): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(model.toLowerCase() as SoftDeleteModel);
}

// Create base Prisma client
function createBasePrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// Create extended client WITHOUT soft-delete middleware for MongoDB compatibility
// Soft delete filtering is handled in the application layer
function createExtendedPrismaClient() {
  const baseClient = createBasePrismaClient();
  return baseClient;
}

// Extended client type (now just PrismaClient since we removed the extension)
export type ExtendedPrismaClient = PrismaClient;

// Global cache for development hot reload
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

// Export singleton instance
export const prisma = globalForPrisma.prisma ?? createExtendedPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

// Re-export Prisma types for convenience
export { Prisma };

// Helper type for transaction client
export type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Soft delete helper function
 * Use this instead of delete() for soft-delete models
 */
export async function softDelete<T extends { deletedAt?: Date | null }>(
  model: {
    update: (args: { where: { id: string }; data: { deletedAt: Date } }) => Promise<T>;
  },
  id: string
): Promise<T> {
  return model.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Restore soft-deleted record
 */
export async function restoreDeleted<T extends { deletedAt?: Date | null }>(
  model: {
    update: (args: { where: { id: string }; data: { deletedAt: null } }) => Promise<T>;
  },
  id: string
): Promise<T> {
  return model.update({
    where: { id },
    data: { deletedAt: null },
  });
}

/**
 * Find including soft-deleted records
 */
export function includeDeleted<T extends { deletedAt?: Date | null | undefined }>(
  where: T
): T & { deletedAt: undefined } {
  return { ...where, deletedAt: undefined };
}
