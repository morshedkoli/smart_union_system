import prisma from "@/lib/db";
import {
  generateCashbookEntryNo,
  isValidObjectId,
} from "@/lib/prisma-utils";
import { calculateClosingBalance } from "@/lib/prisma-virtuals";
import {
  TransactionType,
  TransactionCategory,
  PaymentMode,
  EntryStatus,
  type Cashbook,
} from "@prisma/client";

// Re-export enums for external use
export { TransactionType, TransactionCategory, PaymentMode, EntryStatus };

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

/**
 * Local audit logging function for finance operations
 */
async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  userId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[AUDIT] ${action} on ${entityType}:${entityId}`, {
        userId,
        details,
        timestamp: new Date().toISOString(),
      });
    }
    // In production, you might want to write to an audit log collection
  } catch (error) {
    console.error("Failed to log audit:", error);
  }
}

export class FinanceService {
  static async listTransactions(filters: FinanceFilters = {}): Promise<{
    entries: Cashbook[];
    total: number;
    page: number;
    totalPages: number;
    summary: {
      income: number;
      expense: number;
      balance: number;
    };
  }> {
    const {
      query,
      transactionType,
      category,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause for Prisma
    const where: {
      OR?: Array<Record<string, { contains: string; mode: "insensitive" }>>;
      transactionType?: TransactionType;
      category?: TransactionCategory;
      transactionDate?: { gte?: Date; lte?: Date };
      deletedAt?: null;
    } = {
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        { voucherNo: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { referenceNo: { contains: query, mode: "insensitive" } },
        { paidTo: { contains: query, mode: "insensitive" } },
        { receivedFrom: { contains: query, mode: "insensitive" } },
      ];
    }
    if (transactionType) {
      where.transactionType = transactionType;
    }
    if (category) {
      where.category = category;
    }
    if (fromDate || toDate) {
      where.transactionDate = {};
      if (fromDate) {
        where.transactionDate.gte = fromDate;
      }
      if (toDate) {
        where.transactionDate.lte = toDate;
      }
    }

    // Execute queries in parallel
    const [entries, total, aggregateResult] = await Promise.all([
      prisma.cashbook.findMany({
        where,
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.cashbook.count({ where }),
      // Use MongoDB aggregation for summary calculation
      prisma.$runCommandRaw({
        aggregate: "cashbooks",
        pipeline: [
          {
            $match: {
              status: EntryStatus.APPROVED,
              deletedAt: null,
              ...(transactionType && { transactionType }),
              ...(category && { category }),
              ...(fromDate || toDate
                ? {
                    transactionDate: {
                      ...(fromDate && { $gte: { $date: fromDate.toISOString() } }),
                      ...(toDate && { $lte: { $date: toDate.toISOString() } }),
                    },
                  }
                : {}),
            },
          },
          {
            $group: {
              _id: "$transactionType",
              total: { $sum: "$amount" },
            },
          },
        ],
        cursor: {},
      }),
    ]);

    // Parse aggregation result
    const aggregate = (aggregateResult as { cursor?: { firstBatch?: Array<{ _id: string; total: number }> } })
      ?.cursor?.firstBatch || [];

    const income =
      aggregate.find((item: { _id: string; total: number }) => item._id === TransactionType.INCOME)
        ?.total || 0;
    const expense =
      aggregate.find((item: { _id: string; total: number }) => item._id === TransactionType.EXPENSE)
        ?.total || 0;

    return {
      entries,
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
  ): Promise<{ success: boolean; entry?: Cashbook; message: string }> {
    if (data.amount <= 0) {
      return { success: false, message: "Amount must be greater than zero" };
    }

    const fiscalYear = getFiscalYear(data.transactionDate);
    const dayStart = new Date(data.transactionDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(data.transactionDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Check for duplicate transaction
    const duplicate = await prisma.cashbook.findFirst({
      where: {
        voucherNo: data.voucherNo,
        fiscalYear,
        transactionType: data.transactionType,
        amount: data.amount,
        transactionDate: { gte: dayStart, lte: dayEnd },
        deletedAt: null,
      },
    });

    if (duplicate) {
      return { success: false, message: "Duplicate transaction detected for this voucher/date" };
    }

    // Use transaction for atomic operations
    const entry = await prisma.$transaction(async (tx) => {
      // Generate entry number
      const entryNo = await generateCashbookEntryNo(tx, fiscalYear, data.transactionType);

      // Get previous entry for opening balance
      const previousEntry = await tx.cashbook.findFirst({
        where: {
          transactionDate: { lte: data.transactionDate },
          status: EntryStatus.APPROVED,
          deletedAt: null,
        },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      });

      const openingBalance = previousEntry?.closingBalance || 0;
      const closingBalance = calculateClosingBalance(
        openingBalance,
        data.amount,
        data.transactionType
      );

      // Create the cashbook entry
      const newEntry = await tx.cashbook.create({
        data: {
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
          closingBalance,
          status: EntryStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: userId && isValidObjectId(userId) ? userId : undefined,
          remarks: data.remarks,
          createdById: userId && isValidObjectId(userId) ? userId : undefined,
          updatedById: userId && isValidObjectId(userId) ? userId : undefined,
        },
      });

      return newEntry;
    });

    // Log audit
    await logAudit("CREATE_TRANSACTION", "cashbook", entry.id, userId, {
      entryNo: entry.entryNo,
      amount: entry.amount,
      transactionType: entry.transactionType,
    });

    return {
      success: true,
      entry,
      message: "Transaction added to cashbook",
    };
  }

  static async getDailyReport(date: Date): Promise<{
    date: string;
    totals: { income: number; expense: number; balance: number };
    byCategory: Array<{ category: string; income: number; expense: number }>;
    entries: Cashbook[];
  }> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const [entries, aggregateResult] = await Promise.all([
      prisma.cashbook.findMany({
        where: {
          transactionDate: { gte: start, lte: end },
          status: EntryStatus.APPROVED,
          deletedAt: null,
        },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      }),
      prisma.$runCommandRaw({
        aggregate: "cashbooks",
        pipeline: [
          {
            $match: {
              transactionDate: {
                $gte: { $date: start.toISOString() },
                $lte: { $date: end.toISOString() },
              },
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
        ],
        cursor: {},
      }),
    ]);

    const aggregate = (aggregateResult as { cursor?: { firstBatch?: Array<{ _id: { type: TransactionType; category: string }; total: number }> } })
      ?.cursor?.firstBatch || [];

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
      entries,
    };
  }

  static async getMonthlyReport(year: number, month: number): Promise<{
    year: number;
    month: number;
    totals: { income: number; expense: number; balance: number };
    trend: Array<{ day: number; income: number; expense: number; balance: number }>;
    byCategory: Array<{ category: string; income: number; expense: number }>;
  }> {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [dailyAggResult, categoryAggResult] = await Promise.all([
      prisma.$runCommandRaw({
        aggregate: "cashbooks",
        pipeline: [
          {
            $match: {
              transactionDate: {
                $gte: { $date: start.toISOString() },
                $lte: { $date: end.toISOString() },
              },
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
        ],
        cursor: {},
      }),
      prisma.$runCommandRaw({
        aggregate: "cashbooks",
        pipeline: [
          {
            $match: {
              transactionDate: {
                $gte: { $date: start.toISOString() },
                $lte: { $date: end.toISOString() },
              },
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
        ],
        cursor: {},
      }),
    ]);

    const dailyAgg = (dailyAggResult as { cursor?: { firstBatch?: Array<{ _id: { day: number; type: TransactionType }; total: number }> } })
      ?.cursor?.firstBatch || [];
    const categoryAgg = (categoryAggResult as { cursor?: { firstBatch?: Array<{ _id: { category: string; type: TransactionType }; total: number }> } })
      ?.cursor?.firstBatch || [];

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

  static buildCsvFromTransactions(entries: Cashbook[]): string {
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
