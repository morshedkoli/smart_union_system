/**
 * Fix soft-deleted users by appending _deleted_ to their emails
 * This allows unique indexes to be created while preserving soft-deleted records
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fixing soft-deleted user emails...\n");

  const result = await prisma.$runCommandRaw({
    find: "users",
    filter: { deletedAt: { $ne: null } },
  });

  const deletedUsers = (result as { cursor: { firstBatch: Array<{ _id: { $oid: string }; email: string; deletedAt: { $date: string } }> } }).cursor.firstBatch;

  console.log(`Found ${deletedUsers.length} soft-deleted users\n`);

  for (const user of deletedUsers) {
    // Skip if email already has _deleted_ suffix
    if (user.email.includes("_deleted_")) {
      console.log(`⏩ Skipping ${user.email} (already modified)`);
      continue;
    }

    const timestamp = new Date(user.deletedAt.$date).getTime();
    const [localPart, domain] = user.email.split("@");
    const newEmail = `${localPart}_deleted_${timestamp}@${domain}`;

    await prisma.$runCommandRaw({
      update: "users",
      updates: [
        {
          q: { _id: { $oid: user._id.$oid } },
          u: { $set: { email: newEmail } },
        },
      ],
    });

    console.log(`✓ Updated: ${user.email} -> ${newEmail}`);
  }

  console.log("\n✅ Email fix complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
