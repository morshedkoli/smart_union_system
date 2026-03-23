/**
 * Check existing citizens identity hashes
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check all citizens regardless of deletion status
  const allCitizens = await prisma.citizen.findMany({
    select: {
      id: true,
      identityHash: true,
      name: true,
      fatherName: true,
      dateOfBirth: true,
      deletedAt: true,
    },
  });

  console.log(`Total citizens in database: ${allCitizens.length}\n`);

  // Filter MORSHED AL MAIN citizens
  const morshedCitizens = allCitizens.filter((c) =>
    c.name.toLowerCase().includes("morshed")
  );

  console.log("MORSHED AL MAIN citizens:");
  morshedCitizens.forEach((c) => {
    console.log(`\nID: ${c.id.substring(0, 8)}...`);
    console.log(`Name: ${c.name}`);
    console.log(`Father: ${c.fatherName}`);
    console.log(`DOB: ${c.dateOfBirth.toISOString().split("T")[0]}`);
    console.log(`Identity Hash: ${c.identityHash}`);
    console.log(`Deleted: ${c.deletedAt ? "Yes" : "No"}`);
  });

  // Count by identity hash
  const hashCounts = new Map<string, number>();
  allCitizens
    .filter((c) => !c.deletedAt)
    .forEach((c) => {
      hashCounts.set(c.identityHash, (hashCounts.get(c.identityHash) || 0) + 1);
    });

  const duplicateHashes = Array.from(hashCounts.entries()).filter(
    ([, count]) => count > 1
  );

  if (duplicateHashes.length > 0) {
    console.log("\n\n=== DUPLICATE IDENTITY HASHES FOUND ===");
    duplicateHashes.forEach(([hash, count]) => {
      console.log(`Hash ${hash.substring(0, 30)}... has ${count} citizens`);
    });
  } else {
    console.log(
      "\n\n✓ No duplicate identity hashes found among active citizens"
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
