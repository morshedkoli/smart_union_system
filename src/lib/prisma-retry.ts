import { Prisma } from "@prisma/client";

const TRANSIENT_PRISMA_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const TRANSIENT_MESSAGE_FRAGMENTS = [
  "TransientTransactionError",
  "forcibly closed by the remote host",
  "os error 10054",
  "Raw query failed",
  "I/O error",
];

function hasTransientMessage(message: string): boolean {
  return TRANSIENT_MESSAGE_FRAGMENTS.some((fragment) => message.includes(fragment));
}

export function isTransientPrismaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code) || hasTransientMessage(error.message);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return hasTransientMessage(error.message);
  }

  if (error instanceof Error) {
    return hasTransientMessage(error.message);
  }

  return false;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withPrismaReadRetry<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelayMs?: number;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelayMs = options?.baseDelayMs ?? 120;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const shouldRetry = attempt < maxRetries && isTransientPrismaError(error);
      if (!shouldRetry) {
        throw error;
      }

      await wait(baseDelayMs * (attempt + 1));
    }
  }

  throw new Error("Unreachable retry branch");
}
