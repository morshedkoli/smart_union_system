import { NextRequest, NextResponse } from "next/server";
import { ExcelService } from "@/services";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Excel file is required" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await ExcelService.importCitizensFromExcel(Buffer.from(arrayBuffer));

    return NextResponse.json({
      success: result.success,
      imported: result.imported,
      failed: result.failed,
      errors: result.errors,
      message: "Citizen import completed",
    });
  } catch (error) {
    console.error("Excel citizen import error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to import citizens from Excel" },
      { status: 500 }
    );
  }
}

