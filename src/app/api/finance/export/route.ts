import { NextRequest, NextResponse } from "next/server";
import { TransactionCategory, TransactionType } from "@/models";
import { FinanceService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || undefined;
    const transactionType = searchParams.get("transactionType") as TransactionType | null;
    const category = searchParams.get("category") as TransactionCategory | null;
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const result = await FinanceService.listTransactions({
      query,
      transactionType: transactionType || undefined,
      category: category || undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: 1,
      limit: 10000,
    });

    const csv = FinanceService.buildCsvFromTransactions(result.entries);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cashbook-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Finance export error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to export cashbook data" },
      { status: 500 }
    );
  }
}

