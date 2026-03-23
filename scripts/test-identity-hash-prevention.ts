/**
 * Test identity hash duplicate prevention specifically
 */

import { PrismaClient } from "@prisma/client";
import { generateCitizenIdentityHash } from "../src/lib/prisma-utils";

const prisma = new PrismaClient();

async function main() {
  console.log("Testing identityHash duplicate prevention...\n");

  // Get existing citizen
  const allCitizens = await prisma.citizen.findMany({ take: 1 });
  const existing = allCitizens[0];

  if (!existing) {
    console.log("No existing citizens found");
    return;
  }

  const identityHash = generateCitizenIdentityHash(
    existing.name,
    existing.fatherName,
    existing.dateOfBirth
  );

  console.log("Existing citizen:");
  console.log(`  Name: ${existing.name}`);
  console.log(`  Father: ${existing.fatherName}`);
  console.log(`  DOB: ${existing.dateOfBirth.toISOString().split("T")[0]}`);
  console.log(`  Identity Hash: ${identityHash}\n`);

  // Try to create with DIFFERENT registration number but SAME identity
  console.log("Attempting to create a citizen with same identity but different registration number...");

  try {
    await prisma.citizen.create({
      data: {
        registrationNo: "TEST-2026-W99-99999", // Different registration number
        identityHash, // Same identity hash
        name: existing.name,
        nameEn: existing.name,
        nameBn: existing.nameBn,
        fatherName: existing.fatherName,
        motherName: existing.motherName,
        dateOfBirth: existing.dateOfBirth,
        gender: existing.gender,
        presentAddress: existing.presentAddress,
        permanentAddress: existing.permanentAddress,
        status: "PENDING",
      },
    });

    console.log("\n❌ FAILED: Duplicate citizen was created!");
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const meta = (error as { meta?: { target?: string[] } }).meta;
      const target = meta?.target;

      if (target?.includes("identityHash")) {
        console.log("\n✅ SUCCESS: Duplicate prevented by identityHash unique constraint!");
        console.log("The duplicate prevention system is working correctly.");
        console.log("\nThis prevents the same person from being registered multiple times,");
        console.log("even if they use different registration numbers, NID, or mobile numbers.");
      } else {
        console.log(`\n✅ Duplicate prevented by ${target?.join(", ")} constraint`);
      }
    } else {
      console.log("\n❌ Unexpected error:", error);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
