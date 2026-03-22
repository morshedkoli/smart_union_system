import { NextRequest, NextResponse } from "next/server";
import { ExcelService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "daily";

    if (type === "daily") {
      const dateString = searchParams.get("date") || new Date().toISOString().split("T")[0];
      const date = new Date(dateString);
      const buffer = await ExcelService.exportDailyFinanceExcel(date);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="daily-report-${dateString}.xlsx"`,
        },
      });
    }

    if (type === "monthly") {
      const now = new Date();
      const year = Number(searchParams.get("year") || now.getFullYear());
      const month = Number(searchParams.get("month") || now.getMonth() + 1);
      const buffer = await ExcelService.exportMonthlyFinanceExcel(year, month);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="monthly-report-${year}-${String(month).padStart(2, "0")}.xlsx"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Unsupported export type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Excel report export error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to export report" },
      { status: 500 }
    );
  }
}

