/**
 * Clean up duplicate citizens by soft-deleting all but the first one of each duplicate set
 * Run with: npx tsx scripts/cleanup-duplicate-citizens.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Searching for duplicate citizens...\n");

  // Get ALL citizens (MongoDB null handling issue - filter in app layer)
  const allCitizens = await prisma.citizen.findMany({
    select: {
      id: true,
      identityHash: true,
      name: true,
      fatherName: true,
      dateOfBirth: true,
      registrationNo: true,
      nid: true,
      mobile: true,
      createdAt: true,
      deletedAt: true,
    },
    orderBy: {
      createdAt: "asc", // Keep the oldest one
    },
  });

  // Filter to active citizens only
  const activeCitizens = allCitizens.filter((c) => !c.deletedAt);

  console.log(`Total citizens in database: ${allCitizens.length}`);
  console.log(`Active citizens: ${activeCitizens.length}`);

  // Group by identity hash
  const grouped = new Map<string, typeof activeCitizens>();
  for (const citizen of activeCitizens) {
    const existing = grouped.get(citizen.identityHash) || [];
    existing.push(citizen);
    grouped.set(citizen.identityHash, existing);
  }

  // Find duplicates
  const duplicateGroups = Array.from(grouped.entries()).filter(
    ([, group]) => group.length > 1
  );

  if (duplicateGroups.length === 0) {
    console.log("\n✓ No duplicates found. All citizens have unique identities.");
    return;
  }

  console.log(`\nFound ${duplicateGroups.length} groups of duplicates:\n`);

  let totalToDelete = 0;

  for (const [hash, group] of duplicateGroups) {
    console.log(`Identity Hash: ${hash.substring(0, 40)}...`);
    console.log(`  Duplicate count: ${group.length}`);
    console.log(`  Citizens:`);

    const [keepCitizen, ...deleteCitizens] = group;

    console.log(
      `    KEEP: ${keepCitizen.registrationNo} - ${keepCitizen.name} (Created: ${keepCitizen.createdAt.toISOString()})`
    );

    for (const citizen of deleteCitizens) {
      console.log(
        `    DELETE: ${citizen.registrationNo} - ${citizen.name} (Created: ${citizen.createdAt.toISOString()})`
      );
      totalToDelete++;
    }
    console.log();
  }

  console.log(`\n=== Summary ===`);
  console.log(`Duplicate groups: ${duplicateGroups.length}`);
  console.log(`Citizens to soft-delete: ${totalToDelete}`);

  console.log("\n🗑️  Proceeding with cleanup...\n");

  for (const [, group] of duplicateGroups) {
    const [, ...deleteCitizens] = group;

    for (const citizen of deleteCitizens) {
      await prisma.citizen.update({
        where: { id: citizen.id },
        data: {
          deletedAt: new Date(),
        },
      });
      console.log(`✓ Soft-deleted ${citizen.registrationNo} - ${citizen.name}`);
    }
  }

  console.log(`\n✓ Cleanup complete. Deleted ${totalToDelete} duplicate citizens.`);
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
