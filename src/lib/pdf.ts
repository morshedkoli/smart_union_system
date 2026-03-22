import puppeteer from "puppeteer";

interface CertificatePdfInput {
  unionName: string;
  referenceNo: string;
  certificateNo: string;
  applicantName: string;
  certificateType: string;
  issueDate?: string;
  finalText: string;
  qrCodeDataUrl?: string;
  signatureLabel?: string;
}

export async function generateCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 22mm 18mm 22mm 18mm; }
          body { font-family: "Times New Roman", serif; color: #111827; margin: 0; }
          .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 18px; }
          .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 12px; color: #374151; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; font-size: 12px; }
          .meta div { border: 1px solid #d1d5db; border-radius: 4px; padding: 6px 8px; background: #f9fafb; }
          .content { min-height: 560px; line-height: 1.7; font-size: 14px; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; border-top: 1px solid #d1d5db; padding-top: 10px; }
          .qr { text-align: center; }
          .qr img { width: 96px; height: 96px; border: 1px solid #d1d5db; padding: 4px; background: white; }
          .qr p { margin: 4px 0 0; font-size: 11px; color: #4b5563; }
          .signature { text-align: right; min-width: 220px; }
          .signature-line { border-top: 1px solid #111827; margin-top: 44px; padding-top: 6px; font-size: 12px; }
        </style>
      </head>
      <body>
        <section class="header">
          <h1>${input.unionName}</h1>
          <p>Government of the People's Republic of Bangladesh</p>
        </section>

        <section class="meta">
          <div><strong>Reference:</strong> ${input.referenceNo}</div>
          <div><strong>Certificate No:</strong> ${input.certificateNo}</div>
          <div><strong>Applicant:</strong> ${input.applicantName}</div>
          <div><strong>Type:</strong> ${input.certificateType}</div>
        </section>

        <section class="content">${input.finalText}</section>

        <section class="footer">
          <div class="qr">
            ${
              input.qrCodeDataUrl
                ? `<img src="${input.qrCodeDataUrl}" alt="QR Code" />`
                : `<div style="width:96px;height:96px;border:1px solid #d1d5db"></div>`
            }
            <p>Verify: /verify/${input.referenceNo}</p>
          </div>

          <div class="signature">
            <div class="signature-line">${input.signatureLabel || "Authorized Signature"}</div>
          </div>
        </section>
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

