import { NextRequest, NextResponse } from "next/server";
import { CertificateTemplateService } from "@/services/certificate-template.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const template = await CertificateTemplateService.getById(id);

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Certificate template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error("Get certificate template error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch certificate template" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await CertificateTemplateService.update(id, body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update certificate template error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update certificate template" },
      { status: 500 }
    );
  }
}

