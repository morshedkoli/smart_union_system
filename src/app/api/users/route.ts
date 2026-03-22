import { NextResponse } from "next/server";
import type { AuthenticatedRequest } from "@/server-middleware/role-auth.middleware";
import { requireSecretary } from "@/server-middleware/role-auth.middleware";
import { prisma } from "@/lib/db";
import { Role, Status } from "@prisma/client";

const getHandler = async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim();
    const role = searchParams.get("role")?.trim() as Role | undefined;
    const status = searchParams.get("status")?.trim() as Status | undefined;

    const where: {
      deletedAt: null;
      role?: Role;
      status?: Status;
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
        phone?: { contains: string; mode: "insensitive" };
      }>;
    } = { deletedAt: null };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
};

export const GET = requireSecretary(getHandler);
