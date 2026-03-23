/**
 * Test script to verify duplicate citizen prevention
 * Run with: npx tsx scripts/test-duplicate-prevention.ts
 */

import { PrismaClient } from "@prisma/client";
import { generateCitizenIdentityHash } from "../src/lib/prisma-utils";

const prisma = new PrismaClient();

async function main() {
  console.log("Testing duplicate citizen prevention...\n");

  // Test data - same as an existing citizen
  const testCitizen = {
    name: "MORSHED AL MAIN",
    fatherName: "Manju Mia",
    dateOfBirth: new Date("1997-04-01"),
  };

  const identityHash = generateCitizenIdentityHash(
    testCitizen.name,
    testCitizen.fatherName,
    testCitizen.dateOfBirth
  );

  console.log("Test citizen data:");
  console.log(`  Name: ${testCitizen.name}`);
  console.log(`  Father: ${testCitizen.fatherName}`);
  console.log(`  DOB: ${testCitizen.dateOfBirth.toISOString().split("T")[0]}`);
  console.log(`  Identity Hash: ${identityHash.substring(0, 30)}...\n`);

  // Check if duplicate exists
  const existing = await prisma.citizen.findFirst({
    where: {
      identityHash,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      registrationNo: true,
    },
  });

  if (existing) {
    console.log("✓ Duplicate detection working!");
    console.log(
      `  Found existing citizen: ${existing.name} (${existing.registrationNo})`
    );
    console.log(
      "  New registration with same identity would be rejected by database unique constraint.\n"
    );
  } else {
    console.log("✗ No existing citizen found with this identity hash");
    console.log("  This might indicate the migration didn't run correctly.\n");
  }

  // Test the utility function
  const hash1 = generateCitizenIdentityHash(
    "John Doe",
    "Richard Doe",
    new Date("1990-01-01")
  );
  const hash2 = generateCitizenIdentityHash(
    "John Doe",
    "Richard Doe",
    new Date("1990-01-01")
  );
  const hash3 = generateCitizenIdentityHash(
    "John Doe",
    "Richard Doe",
    new Date("1990-01-02")
  ); // Different DOB

  console.log("Hash consistency test:");
  console.log(`  Same data produces same hash: ${hash1 === hash2 ? "✓" : "✗"}`);
  console.log(
    `  Different DOB produces different hash: ${hash1 !== hash3 ? "✓" : "✗"}`
  );

  // Test normalization
  const hashWithSpaces1 = generateCitizenIdentityHash(
    "John  Doe",
    "Richard   Doe",
    new Date("1990-01-01")
  );
  const hashWithSpaces2 = generateCitizenIdentityHash(
    "john doe",
    "richard doe",
    new Date("1990-01-01")
  );

  console.log("\nNormalization test:");
  console.log(
    `  Extra spaces normalized: ${hashWithSpaces1 === hash1 ? "✓" : "✗"}`
  );
  console.log(
    `  Case insensitive: ${hashWithSpaces2 === hash1 ? "✓" : "✗"}`
  );

  console.log("\n=== Test Complete ===");
}

main()
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
