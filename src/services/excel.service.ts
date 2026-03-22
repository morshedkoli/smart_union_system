import * as XLSX from "xlsx";
import { CitizenService, FinanceService } from "@/services";
import { Gender, MaritalStatus } from "@/models";

interface CitizenExcelRow {
  name?: string;
  nameBn?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  gender?: string;
  nid?: string;
  mobile?: string;
  presentWard?: number | string;
  permanentWard?: number | string;
  occupation?: string;
  religion?: string;
}

const VALID_GENDERS = new Set(Object.values(Gender));

function parseGender(value?: string): Gender {
  const normalized = (value || "").trim().toUpperCase();
  if (VALID_GENDERS.has(normalized as Gender)) {
    return normalized as Gender;
  }
  return Gender.MALE;
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toWard(value: number | string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 9) return 1;
  return parsed;
}

export class ExcelService {
  static async importCitizensFromExcel(
    fileBuffer: Buffer
  ): Promise<{
    success: boolean;
    imported: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: false });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, message: "No worksheet found in file" }],
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<CitizenExcelRow>(worksheet, { defval: "" });

    let imported = 0;
    let failed = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNo = i + 2;

      const name = (row.name || "").trim();
      const nameBn = (row.nameBn || "").trim();
      const fatherName = (row.fatherName || "").trim();
      const motherName = (row.motherName || "").trim();
      const dob = parseDate((row.dateOfBirth || "").trim());

      if (!name || !nameBn || !fatherName || !motherName || !dob) {
        failed += 1;
        errors.push({ row: rowNo, message: "Missing required fields (name/nameBn/father/mother/dateOfBirth)" });
        continue;
      }

      const presentWard = toWard(row.presentWard);
      const permanentWard = toWard(row.permanentWard || row.presentWard);
      const gender = parseGender((row.gender || "").trim());

      const result = await CitizenService.create({
        name,
        nameBn,
        fatherName,
        motherName,
        dateOfBirth: dob,
        gender,
        maritalStatus: MaritalStatus.SINGLE,
        nid: (row.nid || "").trim() || undefined,
        mobile: (row.mobile || "").trim() || undefined,
        occupation: (row.occupation || "").trim() || undefined,
        religion: (row.religion || "").trim() || undefined,
        presentAddress: {
          ward: presentWard,
          fullAddress: "",
        },
        permanentAddress: {
          ward: permanentWard,
          fullAddress: "",
        },
      });

      if (result.success) {
        imported += 1;
      } else {
        failed += 1;
        errors.push({ row: rowNo, message: result.message });
      }
    }

    return {
      success: true,
      imported,
      failed,
      errors,
    };
  }

  static async exportDailyFinanceExcel(date: Date): Promise<Buffer> {
    const report = await FinanceService.getDailyReport(date);

    const summaryRows = [
      ["Report Type", "Daily Finance Report"],
      ["Date", report.date],
      ["Income", report.totals.income],
      ["Expense", report.totals.expense],
      ["Balance", report.totals.balance],
    ];

    const categoryRows = [
      ["Category", "Income", "Expense"],
      ...report.byCategory.map((row) => [row.category, row.income, row.expense]),
    ];

    const entryRows = [
      ["Date", "Entry No", "Voucher No", "Type", "Category", "Description", "Amount", "Status"],
      ...report.entries.map((entry) => [
        new Date(entry.transactionDate).toISOString().split("T")[0],
        entry.entryNo,
        entry.voucherNo,
        entry.transactionType,
        entry.category,
        entry.description,
        entry.amount,
        entry.status,
      ]),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(categoryRows), "ByCategory");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(entryRows), "Entries");

    const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return Buffer.from(out);
  }

  static async exportMonthlyFinanceExcel(year: number, month: number): Promise<Buffer> {
    const report = await FinanceService.getMonthlyReport(year, month);

    const summaryRows = [
      ["Report Type", "Monthly Finance Report"],
      ["Year", report.year],
      ["Month", report.month],
      ["Income", report.totals.income],
      ["Expense", report.totals.expense],
      ["Balance", report.totals.balance],
    ];

    const trendRows = [
      ["Day", "Income", "Expense", "Balance"],
      ...report.trend.map((row) => [row.day, row.income, row.expense, row.balance]),
    ];

    const categoryRows = [
      ["Category", "Income", "Expense"],
      ...report.byCategory.map((row) => [row.category, row.income, row.expense]),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendRows), "Trend");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(categoryRows), "ByCategory");

    const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return Buffer.from(out);
  }
}

