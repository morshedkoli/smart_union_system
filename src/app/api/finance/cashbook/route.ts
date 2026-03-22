import { NextRequest, NextResponse } from "next/server";
import { EntryStatus, PaymentMode, TransactionCategory, TransactionType } from "@/models";
import { FinanceService } from "@/services";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

async function resolveUserId(request: NextRequest): Promise<string | undefined> {
  const cookieToken = request.cookies.get("auth-token")?.value;
  const headerToken = getTokenFromHeader(request.headers.get("authorization"));
  const token = cookieToken || headerToken;
  if (!token) return undefined;
  const payload = await verifyToken(token);
  return payload?.userId;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || undefined;
    const transactionType = searchParams.get("transactionType") as TransactionType | null;
    const category = searchParams.get("category") as TransactionCategory | null;
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");

    const result = await FinanceService.listTransactions({
      query,
      transactionType: transactionType || undefined,
      category: category || undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Cashbook list error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch cashbook entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = await resolveUserId(request);

    const required = [
      "transactionDate",
      "transactionType",
      "category",
      "description",
      "amount",
      "voucherNo",
      "paymentMode",
    ];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    if (!Object.values(TransactionType).includes(body.transactionType as TransactionType)) {
      return NextResponse.json(
        { success: false, message: "Invalid transaction type" },
        { status: 400 }
      );
    }
    if (!Object.values(TransactionCategory).includes(body.category as TransactionCategory)) {
      return NextResponse.json(
        { success: false, message: "Invalid transaction category" },
        { status: 400 }
      );
    }
    if (!Object.values(PaymentMode).includes(body.paymentMode as PaymentMode)) {
      return NextResponse.json(
        { success: false, message: "Invalid payment mode" },
        { status: 400 }
      );
    }
    if (body.status && !Object.values(EntryStatus).includes(body.status as EntryStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid entry status" },
        { status: 400 }
      );
    }

    const result = await FinanceService.createTransaction(
      {
        transactionDate: new Date(body.transactionDate),
        transactionType: body.transactionType as TransactionType,
        category: body.category as TransactionCategory,
        description: body.description,
        amount: Number(body.amount),
        voucherNo: body.voucherNo,
        paymentMode: body.paymentMode as PaymentMode,
        subCategory: body.subCategory,
        descriptionBn: body.descriptionBn,
        referenceNo: body.referenceNo,
        referenceType: body.referenceType,
        paidTo: body.paidTo,
        receivedFrom: body.receivedFrom,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        chequeNo: body.chequeNo,
        chequeDate: body.chequeDate ? new Date(body.chequeDate) : undefined,
        transactionId: body.transactionId,
        budgetHead: body.budgetHead,
        projectCode: body.projectCode,
        remarks: body.remarks,
      },
      userId
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Cashbook create error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create cashbook entry" },
      { status: 500 }
    );
  }
}

