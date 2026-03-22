import { ShieldCheck, ShieldX } from "lucide-react";

interface VerifyPageProps {
  params: Promise<{ referenceNo: string }>;
}

async function verifyCertificate(referenceNo: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/verify/${referenceNo}`, {
    cache: "no-store",
  });
  return response.json();
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { referenceNo } = await params;
  const result = await verifyCertificate(referenceNo);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border bg-white shadow-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Certificate Verification</h1>
          <p className="text-muted-foreground">Reference: {referenceNo}</p>
        </div>

        {result.valid ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-700 font-semibold text-lg">
              <ShieldCheck className="h-6 w-6" />
              Valid Certificate
            </div>
            <div className="grid gap-2 text-sm">
              <p>
                <span className="font-medium">Certificate No:</span> {result.certificate?.certificateNo}
              </p>
              <p>
                <span className="font-medium">Applicant:</span> {result.certificate?.applicantName}
              </p>
              <p>
                <span className="font-medium">Type:</span> {result.certificate?.type}
              </p>
              <p>
                <span className="font-medium">Status:</span> {result.certificate?.status}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
            <div className="flex items-center gap-2 text-red-700 font-semibold text-lg">
              <ShieldX className="h-6 w-6" />
              Invalid Certificate
            </div>
            <p className="text-sm text-red-700">{result.message || "Certificate not found or not approved"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

