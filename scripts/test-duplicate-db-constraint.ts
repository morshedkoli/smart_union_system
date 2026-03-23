/**
 * Test that duplicate prevention works by attempting to create a duplicate
 */

import { PrismaClient } from "@prisma/client";
import { generateCitizenIdentityHash, generateCitizenRegistrationNo } from "../src/lib/prisma-utils";

const prisma = new PrismaClient();

async function main() {
  console.log("Testing duplicate prevention by trying to create a duplicate citizen...\n");

  // Get all citizens and filter in app (MongoDB null handling)
  const allCitizens = await prisma.citizen.findMany();
  const existing = allCitizens.find((c) => !c.deletedAt);

  if (!existing) {
    console.log("No existing citizens found to test with");
    return;
  }

  console.log("Existing citizen:");
  console.log(`  Name: ${existing.name}`);
  console.log(`  Father: ${existing.fatherName}`);
  console.log(`  DOB: ${existing.dateOfBirth.toISOString().split("T")[0]}`);
  console.log(`  Registration: ${existing.registrationNo}\n`);

  // Try to create a duplicate with same identity
  const duplicateIdentityHash = generateCitizenIdentityHash(
    existing.name,
    existing.fatherName,
    existing.dateOfBirth
  );

  console.log(`Generated identity hash: ${duplicateIdentityHash.substring(0, 50)}...\n`);

  try {
    const registrationNo = await generateCitizenRegistrationNo(
      prisma,
      (existing.presentAddress as { ward: number }).ward
    );

    console.log("Attempting to create duplicate citizen...");

    await prisma.citizen.create({
      data: {
        registrationNo,
        identityHash: duplicateIdentityHash,
        name: existing.name,
        nameEn: existing.nameEn || existing.name,
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

    console.log("\n❌ FAILED: Duplicate citizen was created! This should not happen.");
    console.log("The unique constraint is not working correctly.");
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      console.log("✅ SUCCESS: Duplicate was prevented by database unique constraint!");
      console.log("Error message:", error && typeof error === "object" && "message" in error ? error.message : "");
      console.log("\nThe duplicate prevention is working correctly at the database level.");
    } else {
      console.log("\n❌ Unexpected error:", error);
    }
  }
}

main()
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
