/**
 * Permanently delete soft-deleted users to allow unique indexes
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Permanently deleting soft-deleted users...\n");

  const result = await prisma.$runCommandRaw({
    find: "users",
    filter: { deletedAt: { $ne: null } },
  });

  const deletedUsers = (result as { cursor: { firstBatch: Array<{ _id: { $oid: string }; email: string }> } }).cursor.firstBatch;

  console.log(`Found ${deletedUsers.length} soft-deleted users to permanently delete\n`);

  let count = 0;
  for (const user of deletedUsers) {
    await prisma.$runCommandRaw({
      delete: "users",
      deletes: [
        {
          q: { _id: { $oid: user._id.$oid } },
          limit: 1,
        },
      ],
    });
    console.log(`✓ Deleted: ${user.email}`);
    count++;
  }

  console.log(`\n✅ Permanently deleted ${count} soft-deleted users`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
