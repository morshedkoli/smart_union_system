/**
 * Migration script to add identityHash to existing citizens
 * Run with: npx tsx scripts/migrate-add-identity-hash.ts
 */

import { PrismaClient } from "@prisma/client";
import { generateCitizenIdentityHash } from "../src/lib/prisma-utils";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration to add identityHash to existing citizens...");

  // Find all citizens
  const citizens = await prisma.citizen.findMany({
    select: {
      id: true,
      name: true,
      fatherName: true,
      dateOfBirth: true,
      identityHash: true,
    },
  });

  console.log(`Found ${citizens.length} total citizens`);

  // Filter those without identityHash
  const citizensToUpdate = citizens.filter(
    (c) => !c.identityHash || c.identityHash === ""
  );

  console.log(`Found ${citizensToUpdate.length} citizens without identityHash`);

  let updated = 0;
  let errors = 0;
  const duplicates: string[] = [];

  for (const citizen of citizensToUpdate) {
    try {
      const identityHash = generateCitizenIdentityHash(
        citizen.name,
        citizen.fatherName,
        citizen.dateOfBirth
      );

      await prisma.citizen.update({
        where: { id: citizen.id },
        data: { identityHash },
      });

      updated++;
      console.log(
        `✓ Updated ${citizen.name} (${citizen.id.substring(0, 8)}...)`
      );
    } catch (error: unknown) {
      errors++;
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        duplicates.push(
          `${citizen.name} (Father: ${citizen.fatherName}, DOB: ${citizen.dateOfBirth.toISOString().split("T")[0]})`
        );
        console.error(
          `✗ Duplicate found: ${citizen.name} - This citizen appears to be a duplicate`
        );
      } else {
        console.error(`✗ Error updating ${citizen.name}:`, error);
      }
    }
  }

  console.log("\n=== Migration Summary ===");
  console.log(`Total citizens in database: ${citizens.length}`);
  console.log(`Citizens needing update: ${citizensToUpdate.length}`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`Errors: ${errors}`);

  if (duplicates.length > 0) {
    console.log(`\n=== Duplicate Citizens Found ===`);
    console.log(
      "The following citizens appear to be duplicates (same name, father's name, and date of birth):"
    );
    duplicates.forEach((dup, i) => {
      console.log(`${i + 1}. ${dup}`);
    });
    console.log(
      "\nThese duplicates need to be manually reviewed and merged/deleted."
    );
  }
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
