import { NextRequest, NextResponse } from "next/server";
import { CertificateTemplateService } from "@/services/certificate-template.service";

export async function GET() {
  try {
    const templates = await CertificateTemplateService.list();
    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error("List certificate templates error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch certificate templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await CertificateTemplateService.create(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create certificate template error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create certificate template" },
      { status: 500 }
    );
  }
}

