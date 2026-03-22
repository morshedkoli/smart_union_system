import { SignJWT, jwtVerify } from "jose";
import { JWTPayload, Role } from "@/types/auth";

// Ensure JWT_SECRET is set
const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue) {
  throw new Error(
    "JWT_SECRET environment variable is required. Please set it in your .env file."
  );
}

const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);
const JWT_EXPIRATION = "24h";

export async function signToken(payload: {
  userId: string;
  email: string;
  role: Role;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(
  authHeader: string | null
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

export function hasPermission(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(userRole);
}

export function isAdmin(role: Role): boolean {
  return role === "SECRETARY"; // SECRETARY is the super admin
}

export function isSuperAdmin(role: Role): boolean {
  return role === "SECRETARY"; // SECRETARY is the super admin
}
