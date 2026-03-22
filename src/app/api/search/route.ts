import { NextRequest, NextResponse } from "next/server";
import { GlobalSearchService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = Number(searchParams.get("limit") || "10");

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        results: { citizens: [], certificates: [], references: [] },
      });
    }

    const results = await GlobalSearchService.search(query, limit);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Global search error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to search" },
      { status: 500 }
    );
  }
}

