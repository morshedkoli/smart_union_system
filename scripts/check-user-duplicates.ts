import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total users: ${users.length}\n`);

  // Group by email
  const emailGroups = new Map<string, typeof users>();
  users.forEach((user) => {
    const existing = emailGroups.get(user.email) || [];
    existing.push(user);
    emailGroups.set(user.email, existing);
  });

  const duplicates = Array.from(emailGroups.entries()).filter(
    ([, group]) => group.length > 1
  );

  if (duplicates.length === 0) {
    console.log("✓ No duplicate emails found");
    return;
  }

  console.log(`Found ${duplicates.length} duplicate email(s):\n`);

  for (const [email, group] of duplicates) {
    console.log(`Email: ${email}`);
    console.log(`  Count: ${group.length}`);
    group.forEach((user, i) => {
      console.log(
        `  ${i === 0 ? "KEEP" : "DELETE"}: ${user.name} (${user.role}) - ID: ${user.id.substring(0, 8)}... - Created: ${user.createdAt.toISOString()} - Deleted: ${user.deletedAt ? "Yes" : "No"}`
      );
    });
    console.log();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
