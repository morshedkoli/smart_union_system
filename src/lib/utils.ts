import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, locale: string = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatCurrency(amount: number, locale: string = "en"): string {
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number, locale: string = "en"): string {
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US").format(num);
}

export function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${timestamp}${randomStr}` : `${timestamp}${randomStr}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + "...";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isValidBangladeshPhone(phone: string): boolean {
  const regex = /^(?:\+?880|0)?1[3-9]\d{8}$/;
  return regex.test(phone.replace(/\s|-/g, ""));
}

export function isValidNID(nid: string): boolean {
  const cleanNid = nid.replace(/\s|-/g, "");
  return /^\d{10}$|^\d{13}$|^\d{17}$/.test(cleanNid);
}
