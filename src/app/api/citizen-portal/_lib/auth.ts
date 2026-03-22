import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function getCitizenTokenPayload(request: NextRequest): Promise<{
  userId: string;
} | null> {
  const token = request.cookies.get("citizen-auth-token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.userId) return null;
  return { userId: payload.userId };
}

