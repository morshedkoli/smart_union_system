/**
 * Prisma Virtual Field Helpers
 * Replaces Mongoose virtual getters with standalone functions
 */

import type { CertificateStatus, NotificationStatus } from "@prisma/client";

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date | string | null): number | null {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if certificate is currently valid
 */
export function isCertificateValid(
  status: CertificateStatus,
  validUntil?: Date | null
): boolean {
  if (status !== "APPROVED") return false;
  if (validUntil && new Date() > validUntil) return false;
  return true;
}

/**
 * Check if notification has been read
 */
export function isNotificationRead(readAt?: Date | null): boolean {
  return !!readAt;
}

/**
 * Check if notification has expired
 */
export function isNotificationExpired(expiresAt?: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}

/**
 * Calculate remaining entitlement for beneficiary
 */
export function calculateRemainingEntitlement(
  totalEntitlement: number,
  totalReceived: number
): number {
  return Math.max(0, totalEntitlement - totalReceived);
}

/**
 * Calculate holding tax balance
 */
export function calculateHoldingTaxBalance(
  annualTax: number,
  arrears: number,
  penalty: number,
  rebate: number,
  totalPaid: number
): { totalDue: number; balance: number } {
  const totalDue = annualTax + arrears + penalty - rebate;
  const balance = totalDue - totalPaid;
  return { totalDue, balance };
}

/**
 * Determine holding tax payment status based on amounts and due date
 */
export function determinePaymentStatus(
  balance: number,
  totalPaid: number,
  dueDate: Date
): "PAID" | "PARTIAL" | "OVERDUE" | "UNPAID" | "WAIVED" {
  if (balance <= 0) return "PAID";
  if (totalPaid > 0) return "PARTIAL";
  if (new Date() > dueDate) return "OVERDUE";
  return "UNPAID";
}

/**
 * Calculate cashbook closing balance
 */
export function calculateClosingBalance(
  openingBalance: number,
  amount: number,
  transactionType: "INCOME" | "EXPENSE"
): number {
  if (transactionType === "INCOME") {
    return openingBalance + amount;
  }
  return openingBalance - amount;
}

/**
 * Calculate budget remaining amount
 */
export function calculateBudgetRemaining(
  totalBudget: number,
  disbursedAmount: number
): number {
  return Math.max(0, totalBudget - disbursedAmount);
}

/**
 * Format full address from address components
 */
export function formatFullAddress(address: {
  village?: string | null;
  ward: number;
  postOffice?: string | null;
  postCode?: string | null;
  upazila?: string | null;
  district?: string | null;
  division?: string | null;
}): string {
  const parts: string[] = [];

  if (address.village) parts.push(address.village);
  parts.push(`Ward ${address.ward}`);
  if (address.postOffice) parts.push(`P.O. ${address.postOffice}`);
  if (address.postCode) parts.push(`P.C. ${address.postCode}`);
  if (address.upazila) parts.push(address.upazila);
  if (address.district) parts.push(address.district);
  if (address.division) parts.push(address.division);

  return parts.join(", ");
}

/**
 * Determine beneficiary status after distribution
 */
export function determineBeneficiaryStatus(
  currentStatus: string,
  remainingEntitlement: number
): string {
  if (remainingEntitlement <= 0 && currentStatus === "ACTIVE") {
    return "COMPLETED";
  }
  return currentStatus;
}

/**
 * Check if notification should be sent (based on schedule)
 */
export function isNotificationReadyToSend(
  status: NotificationStatus,
  scheduledFor?: Date | null,
  retryCount?: number,
  maxRetries?: number
): boolean {
  if (status !== "PENDING") return false;
  if (retryCount !== undefined && maxRetries !== undefined && retryCount >= maxRetries) {
    return false;
  }
  if (scheduledFor && new Date() < scheduledFor) return false;
  return true;
}

/**
 * Extract placeholders from HTML template
 */
export function extractPlaceholders(
  headerHtml?: string | null,
  bodyHtml?: string | null,
  footerHtml?: string | null,
  supportedPlaceholders?: readonly string[]
): string[] {
  const fullHtml = `${headerHtml || ""}${bodyHtml || ""}${footerHtml || ""}`;
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];

  let match;
  while ((match = placeholderRegex.exec(fullHtml)) !== null) {
    const key = match[1].trim();
    if (!supportedPlaceholders || supportedPlaceholders.includes(key)) {
      if (!placeholders.includes(key)) {
        placeholders.push(key);
      }
    }
  }

  return placeholders;
}
