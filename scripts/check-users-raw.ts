import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Use raw query to bypass enum validation
  const users = await prisma.$runCommandRaw({
    find: "users",
    filter: {},
    projection: { email: 1, name: 1, role: 1, createdAt: 1, deletedAt: 1 },
    sort: { createdAt: 1 },
  });

  console.log("Users:", JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
