import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
  Cashbook,
  EntryStatus,
  PaymentMode,
  TransactionCategory,
  TransactionType,
  type ICashbook,
} from "@/models";

interface FinanceFilters {
  query?: string;
  transactionType?: TransactionType;
  category?: TransactionCategory;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

interface CreateTransactionData {
  transactionDate: Date;
  transactionType: TransactionType;
  category: TransactionCategory;
  description: string;
  amount: number;
  voucherNo: string;
  paymentMode: PaymentMode;
  subCategory?: string;
  descriptionBn?: string;
  referenceNo?: string;
  referenceType?: string;
  paidTo?: string;
  receivedFrom?: string;
  bankName?: string;
  bankAccount?: string;
  chequeNo?: string;
  chequeDate?: Date;
  transactionId?: string;
  budgetHead?: string;
  projectCode?: string;
  remarks?: string;
}

function toObjectId(userId?: string): mongoose.Types.ObjectId | undefined {
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    return new mongoose.Types.ObjectId(userId);
  }
  return undefined;
}

function getFiscalYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

function escapeCsv(value: string | number | null | undefined): string {
  const normalized = value === null || value === undefined ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

export class FinanceService {
  static async listTransactions(filters: FinanceFilters = {}): Promise<{
    entries: ICashbook[];
    total: number;
    page: number;
    totalPages: number;
    summary: {
      income: number;
      expense: number;
      balance: number;
    };
  }> {
    await connectDB();

    const {
      query,
      transactionType,
      category,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = filters;

    const match: Record<string, unknown> = {};

    if (query) {
      match.$or = [
        { voucherNo: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { referenceNo: { $regex: query, $options: "i" } },
        { paidTo: { $regex: query, $options: "i" } },
        { receivedFrom: { $regex: query, $options: "i" } },
      ];
    }
    if (transactionType) {
      match.transactionType = transactionType;
    }
    if (category) {
      match.category = category;
    }
    if (fromDate || toDate) {
      match.transactionDate = {};
      if (fromDate) {
        (match.transactionDate as Record<string, unknown>).$gte = fromDate;
      }
      if (toDate) {
        (match.transactionDate as Record<string, unknown>).$lte = toDate;
      }
    }

    const skip = (page - 1) * limit;
    const [entries, total, aggregate] = await Promise.all([
      Cashbook.find(match).sort({ transactionDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Cashbook.countDocuments(match),
      Cashbook.aggregate([
        { $match: { ...match, status: EntryStatus.APPROVED, deletedAt: null } },
        { $group: { _id: "$transactionType", total: { $sum: "$amount" } } },
      ]),
    ]);

    const income =
      aggregate.find((item: { _id: string; total: number }) => item._id === TransactionType.INCOME)
        ?.total || 0;
    const expense =
      aggregate.find((item: { _id: string; total: number }) => item._id === TransactionType.EXPENSE)
        ?.total || 0;

    return {
      entries: entries as ICashbook[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: {
        income,
        expense,
        balance: income - expense,
      },
    };
  }

  static async createTransaction(
    data: CreateTransactionData,
    userId?: string
  ): Promise<{ success: boolean; entry?: ICashbook; message: string }> {
    await connectDB();

    if (data.amount <= 0) {
      return { success: false, message: "Amount must be greater than zero" };
    }

    const fiscalYear = getFiscalYear(data.transactionDate);
    const dayStart = new Date(data.transactionDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(data.transactionDate);
    dayEnd.setHours(23, 59, 59, 999);

    const duplicate = await Cashbook.findOne({
      voucherNo: data.voucherNo,
      fiscalYear,
      transactionType: data.transactionType,
      amount: data.amount,
      transactionDate: { $gte: dayStart, $lte: dayEnd },
      deletedAt: null,
    }).lean();
    if (duplicate) {
      return { success: false, message: "Duplicate transaction detected for this voucher/date" };
    }

    const entryNo = await (
      Cashbook as typeof Cashbook & {
        generateEntryNo: (fy: string, type: TransactionType) => Promise<string>;
      }
    ).generateEntryNo(fiscalYear, data.transactionType);

    const previousEntry = await Cashbook.findOne({
      transactionDate: { $lte: data.transactionDate },
      status: EntryStatus.APPROVED,
      deletedAt: null,
    })
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    const openingBalance = previousEntry?.closingBalance || 0;
    const objectUserId = toObjectId(userId);

    const entry = await Cashbook.create({
      entryNo,
      voucherNo: data.voucherNo,
      transactionDate: data.transactionDate,
      transactionType: data.transactionType,
      category: data.category,
      subCategory: data.subCategory,
      description: data.description,
      descriptionBn: data.descriptionBn,
      amount: data.amount,
      paymentMode: data.paymentMode,
      referenceNo: data.referenceNo,
      referenceType: data.referenceType,
      paidTo: data.paidTo,
      receivedFrom: data.receivedFrom,
      bankName: data.bankName,
      bankAccount: data.bankAccount,
      chequeNo: data.chequeNo,
      chequeDate: data.chequeDate,
      transactionId: data.transactionId,
      fiscalYear,
      budgetHead: data.budgetHead,
      projectCode: data.projectCode,
      openingBalance,
      closingBalance: openingBalance,
      status: EntryStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy: objectUserId,
      remarks: data.remarks,
      createdBy: objectUserId,
      updatedBy: objectUserId,
    });

    return {
      success: true,
      entry: entry.toObject() as ICashbook,
      message: "Transaction added to cashbook",
    };
  }

  static async getDailyReport(date: Date): Promise<{
    date: string;
    totals: { income: number; expense: number; balance: number };
    byCategory: Array<{ category: string; income: number; expense: number }>;
    entries: ICashbook[];
  }> {
    await connectDB();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const [entries, aggregate] = await Promise.all([
      Cashbook.find({
        transactionDate: { $gte: start, $lte: end },
        status: EntryStatus.APPROVED,
      })
        .sort({ transactionDate: -1, createdAt: -1 })
        .lean(),
      Cashbook.aggregate([
        {
          $match: {
            transactionDate: { $gte: start, $lte: end },
            status: EntryStatus.APPROVED,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: {
              type: "$transactionType",
              category: "$category",
            },
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const categoryMap = new Map<string, { category: string; income: number; expense: number }>();
    let income = 0;
    let expense = 0;

    aggregate.forEach((item: { _id: { type: TransactionType; category: string }; total: number }) => {
      const key = item._id.category;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { category: key, income: 0, expense: 0 });
      }
      const row = categoryMap.get(key)!;
      if (item._id.type === TransactionType.INCOME) {
        row.income += item.total;
        income += item.total;
      } else {
        row.expense += item.total;
        expense += item.total;
      }
    });

    return {
      date: start.toISOString().split("T")[0],
      totals: {
        income,
        expense,
        balance: income - expense,
      },
      byCategory: Array.from(categoryMap.values()).sort(
        (a, b) => b.income + b.expense - (a.income + a.expense)
      ),
      entries: entries as ICashbook[],
    };
  }

  static async getMonthlyReport(year: number, month: number): Promise<{
    year: number;
    month: number;
    totals: { income: number; expense: number; balance: number };
    trend: Array<{ day: number; income: number; expense: number; balance: number }>;
    byCategory: Array<{ category: string; income: number; expense: number }>;
  }> {
    await connectDB();
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [dailyAgg, categoryAgg] = await Promise.all([
      Cashbook.aggregate([
        {
          $match: {
            transactionDate: { $gte: start, $lte: end },
            status: EntryStatus.APPROVED,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: {
              day: { $dayOfMonth: "$transactionDate" },
              type: "$transactionType",
            },
            total: { $sum: "$amount" },
          },
        },
      ]),
      Cashbook.aggregate([
        {
          $match: {
            transactionDate: { $gte: start, $lte: end },
            status: EntryStatus.APPROVED,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: {
              category: "$category",
              type: "$transactionType",
            },
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const daysInMonth = end.getDate();
    const trendMap = new Map<number, { day: number; income: number; expense: number; balance: number }>();
    for (let day = 1; day <= daysInMonth; day += 1) {
      trendMap.set(day, { day, income: 0, expense: 0, balance: 0 });
    }

    let income = 0;
    let expense = 0;
    dailyAgg.forEach((item: { _id: { day: number; type: TransactionType }; total: number }) => {
      const row = trendMap.get(item._id.day);
      if (!row) return;
      if (item._id.type === TransactionType.INCOME) {
        row.income += item.total;
        income += item.total;
      } else {
        row.expense += item.total;
        expense += item.total;
      }
      row.balance = row.income - row.expense;
    });

    const categoryMap = new Map<string, { category: string; income: number; expense: number }>();
    categoryAgg.forEach((item: { _id: { category: string; type: TransactionType }; total: number }) => {
      if (!categoryMap.has(item._id.category)) {
        categoryMap.set(item._id.category, {
          category: item._id.category,
          income: 0,
          expense: 0,
        });
      }
      const row = categoryMap.get(item._id.category)!;
      if (item._id.type === TransactionType.INCOME) {
        row.income += item.total;
      } else {
        row.expense += item.total;
      }
    });

    return {
      year,
      month,
      totals: {
        income,
        expense,
        balance: income - expense,
      },
      trend: Array.from(trendMap.values()),
      byCategory: Array.from(categoryMap.values()).sort(
        (a, b) => b.income + b.expense - (a.income + a.expense)
      ),
    };
  }

  static buildCsvFromTransactions(entries: ICashbook[]): string {
    const headers = [
      "Date",
      "Entry No",
      "Voucher No",
      "Type",
      "Category",
      "Description",
      "Amount",
      "Payment Mode",
      "Status",
    ];
    const lines = entries.map((entry) =>
      [
        escapeCsv(new Date(entry.transactionDate).toISOString().split("T")[0]),
        escapeCsv(entry.entryNo),
        escapeCsv(entry.voucherNo),
        escapeCsv(entry.transactionType),
        escapeCsv(entry.category),
        escapeCsv(entry.description),
        escapeCsv(entry.amount),
        escapeCsv(entry.paymentMode),
        escapeCsv(entry.status),
      ].join(",")
    );
    return `${headers.join(",")}\n${lines.join("\n")}`;
  }

  static buildCsvFromDailyReport(report: Awaited<ReturnType<typeof FinanceService.getDailyReport>>): string {
    const summary = [
      `Date,${escapeCsv(report.date)}`,
      `Income,${report.totals.income}`,
      `Expense,${report.totals.expense}`,
      `Balance,${report.totals.balance}`,
      "",
      "Category,Income,Expense",
    ];
    const rows = report.byCategory.map((row) =>
      [escapeCsv(row.category), escapeCsv(row.income), escapeCsv(row.expense)].join(",")
    );
    return `${summary.join("\n")}\n${rows.join("\n")}`;
  }

  static buildCsvFromMonthlyReport(
    report: Awaited<ReturnType<typeof FinanceService.getMonthlyReport>>
  ): string {
    const summary = [
      `Year,${report.year}`,
      `Month,${report.month}`,
      `Income,${report.totals.income}`,
      `Expense,${report.totals.expense}`,
      `Balance,${report.totals.balance}`,
      "",
      "Day,Income,Expense,Balance",
    ];
    const trendRows = report.trend.map((row) =>
      [escapeCsv(row.day), escapeCsv(row.income), escapeCsv(row.expense), escapeCsv(row.balance)].join(",")
    );
    const categoryTitle = ["", "Category,Income,Expense"];
    const categoryRows = report.byCategory.map((row) =>
      [escapeCsv(row.category), escapeCsv(row.income), escapeCsv(row.expense)].join(",")
    );
    return `${summary.join("\n")}\n${trendRows.join("\n")}\n${categoryTitle.join("\n")}\n${categoryRows.join("\n")}`;
  }
}

