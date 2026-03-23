/**
 * Clean up duplicate and outdated users
 * - Removes duplicate emails
 * - Updates old roles to new roles (ADMIN -> SECRETARY, OPERATOR -> ENTREPRENEUR, etc.)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Role mapping from old to new
const roleMapping: Record<string, string> = {
  ADMIN: "SECRETARY",
  SUPER_ADMIN: "SECRETARY",
  OPERATOR: "ENTREPRENEUR",
  VIEWER: "CITIZEN",
};

async function main() {
  console.log("=== User Cleanup Script ===\n");

  // Get all users via raw query
  const result = await prisma.$runCommandRaw({
    find: "users",
    filter: {},
    sort: { createdAt: 1 },
  });

  const users = (result as { cursor: { firstBatch: Array<{ _id: { $oid: string }; email: string; name: string; role: string; createdAt: { $date: string }; deletedAt?: { $date: string } }> } }).cursor.firstBatch;

  console.log(`Total users in database: ${users.length}\n`);

  // Group by email
  const emailGroups = new Map<string, typeof users>();
  users.forEach((user) => {
    const existing = emailGroups.get(user.email) || [];
    existing.push(user);
    emailGroups.set(user.email, existing);
  });

  // Find users with old roles
  const oldRoleUsers = users.filter((u) =>
    !u.deletedAt && Object.keys(roleMapping).includes(u.role)
  );

  // Find duplicate emails
  const duplicateEmails = Array.from(emailGroups.entries()).filter(
    ([, group]) => group.filter(u => !u.deletedAt).length > 1
  );

  console.log(`Users with old roles: ${oldRoleUsers.length}`);
  console.log(`Duplicate email groups: ${duplicateEmails.length}\n`);

  if (oldRoleUsers.length === 0 && duplicateEmails.length === 0) {
    console.log("✓ No cleanup needed");
    return;
  }

  // Show what will be done
  console.log("=== Planned Actions ===\n");

  let deleteCount = 0;
  let updateCount = 0;

  for (const [email, group] of duplicateEmails) {
    const activeUsers = group.filter(u => !u.deletedAt);

    // Find the best user to keep (prefer new roles, then most recent)
    const userWithNewRole = activeUsers.find(u =>
      !Object.keys(roleMapping).includes(u.role)
    );

    const keepUser = userWithNewRole || activeUsers[activeUsers.length - 1];
    const deleteUsers = activeUsers.filter(u => u._id.$oid !== keepUser._id.$oid);

    if (deleteUsers.length > 0) {
      console.log(`Email: ${email}`);
      console.log(`  KEEP: ${keepUser.name} (${keepUser.role}) - ${keepUser._id.$oid.substring(0, 8)}...`);

      deleteUsers.forEach(u => {
        console.log(`  DELETE: ${u.name} (${u.role}) - ${u._id.$oid.substring(0, 8)}...`);
        deleteCount++;
      });
      console.log();
    }

    // If keeping a user with old role, mark it for update
    if (Object.keys(roleMapping).includes(keepUser.role)) {
      updateCount++;
    }
  }

  // Show role updates
  if (oldRoleUsers.length > 0) {
    console.log("\n=== Role Updates ===\n");
    const uniqueOldRoleUsers = new Set(
      oldRoleUsers.map(u => u._id.$oid)
    );

    // Only count users that won't be deleted
    const usersToUpdate = Array.from(uniqueOldRoleUsers).filter(id => {
      const user = users.find(u => u._id.$oid === id);
      return user && !emailGroups.get(user.email)?.some(
        u => u._id.$oid !== id && !u.deletedAt
      );
    });

    usersToUpdate.forEach(id => {
      const user = users.find(u => u._id.$oid === id);
      if (user) {
        console.log(`${user.email}: ${user.role} -> ${roleMapping[user.role]}`);
      }
    });
  }

  console.log(`\n=== Summary ===`);
  console.log(`Users to delete (duplicates): ${deleteCount}`);
  console.log(`Users to update (old roles): ${updateCount}`);

  console.log("\n=== Executing Cleanup ===\n");

  // Delete duplicates
  for (const [email, group] of duplicateEmails) {
    const activeUsers = group.filter(u => !u.deletedAt);
    const userWithNewRole = activeUsers.find(u =>
      !Object.keys(roleMapping).includes(u.role)
    );
    const keepUser = userWithNewRole || activeUsers[activeUsers.length - 1];
    const deleteUsers = activeUsers.filter(u => u._id.$oid !== keepUser._id.$oid);

    for (const user of deleteUsers) {
      await prisma.$runCommandRaw({
        update: "users",
        updates: [{
          q: { _id: { $oid: user._id.$oid } },
          u: { $set: { deletedAt: new Date() } },
        }],
      });
      console.log(`✓ Soft-deleted duplicate user: ${user.email} (${user._id.$oid.substring(0, 8)}...)`);
    }

    // Update role if needed
    if (Object.keys(roleMapping).includes(keepUser.role)) {
      await prisma.$runCommandRaw({
        update: "users",
        updates: [{
          q: { _id: { $oid: keepUser._id.$oid } },
          u: { $set: { role: roleMapping[keepUser.role] } },
        }],
      });
      console.log(`✓ Updated role: ${keepUser.email} ${keepUser.role} -> ${roleMapping[keepUser.role]}`);
    }
  }

  // Update remaining old roles
  for (const user of oldRoleUsers) {
    if (!user.deletedAt) {
      const group = emailGroups.get(user.email);
      const isDuplicate = group && group.filter(u => !u.deletedAt).length > 1;

      if (!isDuplicate) {
        await prisma.$runCommandRaw({
          update: "users",
          updates: [{
            q: { _id: { $oid: user._id.$oid } },
            u: { $set: { role: roleMapping[user.role] } },
          }],
        });
        console.log(`✓ Updated role: ${user.email} ${user.role} -> ${roleMapping[user.role]}`);
      }
    }
  }

  console.log("\n✅ Cleanup complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
