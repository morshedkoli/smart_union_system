import { NextRequest, NextResponse } from "next/server";
import { CertificateTemplateService } from "@/services/certificate-template.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const previewData = {
      name: body.previewData?.name,
      name_en: body.previewData?.name_en,
      name_bn: body.previewData?.name_bn,
      father_name: body.previewData?.father_name,
      father_name_en: body.previewData?.father_name_en,
      father_name_bn: body.previewData?.father_name_bn,
      mother_name: body.previewData?.mother_name,
      mother_name_en: body.previewData?.mother_name_en,
      mother_name_bn: body.previewData?.mother_name_bn,
    };

    if (body.templateId) {
      const result = await CertificateTemplateService.previewByTemplateId(
        body.templateId,
        previewData
      );
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (!body.bodyHtml) {
      return NextResponse.json(
        { success: false, message: "bodyHtml is required" },
        { status: 400 }
      );
    }

    const previewHtml = CertificateTemplateService.buildPreviewHtml(
      {
        headerHtml: body.headerHtml,
        bodyHtml: body.bodyHtml,
        footerHtml: body.footerHtml,
        stylesCss: body.stylesCss,
      },
      previewData
    );

    return NextResponse.json({
      success: true,
      previewHtml,
      message: "Preview generated successfully",
    });
  } catch (error) {
    console.error("Certificate template preview error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate preview";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

