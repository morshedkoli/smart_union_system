import { NextRequest, NextResponse } from "next/server";
import { FinanceService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "daily";
    const exportFormat = searchParams.get("format");

    if (reportType === "daily") {
      const dateValue = searchParams.get("date") || new Date().toISOString().split("T")[0];
      const report = await FinanceService.getDailyReport(new Date(dateValue));

      if (exportFormat === "csv") {
        const csv = FinanceService.buildCsvFromDailyReport(report);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="daily-finance-report-${report.date}.csv"`,
          },
        });
      }

      return NextResponse.json({ success: true, reportType: "daily", report });
    }

    if (reportType === "monthly") {
      const now = new Date();
      const year = Number(searchParams.get("year") || now.getFullYear());
      const month = Number(searchParams.get("month") || now.getMonth() + 1);
      const report = await FinanceService.getMonthlyReport(year, month);

      if (exportFormat === "csv") {
        const csv = FinanceService.buildCsvFromMonthlyReport(report);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="monthly-finance-report-${year}-${String(month).padStart(2, "0")}.csv"`,
          },
        });
      }

      return NextResponse.json({ success: true, reportType: "monthly", report });
    }

    return NextResponse.json(
      { success: false, message: "Unsupported report type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Finance reports error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate report" },
      { status: 500 }
    );
  }
}

