/**
 * Comprehensive test of citizen duplicate prevention
 * Tests all duplicate detection mechanisms:
 * 1. Identity Hash (name + father + DOB)
 * 2. NID
 * 3. Birth Certificate Number
 * 4. Mobile Number (application level)
 */

import { CitizenService } from "../src/services/citizen.service";
import type { CitizenCreateData } from "../src/services/citizen.service";
import { Gender } from "@prisma/client";

async function main() {
  console.log("=== Comprehensive Duplicate Prevention Test ===\n");

  const testCitizenData: CitizenCreateData = {
    name: "Test Person",
    nameBn: "টেস্ট পার্সন",
    fatherName: "Test Father",
    motherName: "Test Mother",
    dateOfBirth: new Date("1990-01-01"),
    gender: Gender.MALE,
    presentAddress: {
      ward: 1,
      village: "Test Village",
    },
    permanentAddress: {
      ward: 1,
      village: "Test Village",
    },
    nid: "1990123456789",
    birthCertificateNo: "BC-TEST-001",
    mobile: "01700000000",
  };

  console.log("Test 1: Creating initial citizen...");
  const result1 = await CitizenService.create(
    testCitizenData,
    undefined,
    "SECRETARY"
  );

  if (result1.success) {
    console.log(`✓ Citizen created: ${result1.citizen?.registrationNo}\n`);
  } else {
    console.log(`✗ Failed: ${result1.message}\n`);
    return;
  }

  console.log("Test 2: Trying to create duplicate with same identity (name+father+DOB)...");
  const result2 = await CitizenService.create(
    {
      ...testCitizenData,
      nid: "DIFFERENT_NID_001",
      birthCertificateNo: "DIFFERENT_BC_001",
      mobile: "01700000001",
    },
    undefined,
    "SECRETARY"
  );
  console.log(
    result2.success
      ? `✗ FAILED: Duplicate was allowed!`
      : `✓ BLOCKED: ${result2.message}`
  );
  console.log();

  console.log("Test 3: Trying to create with same NID...");
  const result3 = await CitizenService.create(
    {
      ...testCitizenData,
      name: "Different Person",
      fatherName: "Different Father",
      nameEn: "Different Person",
      mobile: "01700000002",
      birthCertificateNo: "DIFFERENT_BC_002",
    },
    undefined,
    "SECRETARY"
  );
  console.log(
    result3.success
      ? `✗ FAILED: Duplicate NID was allowed!`
      : `✓ BLOCKED: ${result3.message}`
  );
  console.log();

  console.log("Test 4: Trying to create with same birth certificate...");
  const result4 = await CitizenService.create(
    {
      ...testCitizenData,
      name: "Another Person",
      nameEn: "Another Person",
      fatherName: "Another Father",
      nid: "DIFFERENT_NID_003",
      mobile: "01700000003",
    },
    undefined,
    "SECRETARY"
  );
  console.log(
    result4.success
      ? `✗ FAILED: Duplicate birth certificate was allowed!`
      : `✓ BLOCKED: ${result4.message}`
  );
  console.log();

  console.log("Test 5: Trying to create with same mobile number...");
  const result5 = await CitizenService.create(
    {
      ...testCitizenData,
      name: "Yet Another Person",
      nameEn: "Yet Another Person",
      nameBn: "ইয়েট এনাদার পার্সন",
      fatherName: "Yet Another Father",
      nid: "DIFFERENT_NID_004",
      birthCertificateNo: "DIFFERENT_BC_004",
    },
    undefined,
    "SECRETARY"
  );
  console.log(
    result5.success
      ? `✗ FAILED: Duplicate mobile was allowed!`
      : `✓ BLOCKED: ${result5.message}`
  );
  console.log();

  console.log("Test 6: Creating a completely different person (should succeed)...");
  const result6 = await CitizenService.create(
    {
      name: "Unique Person",
      nameEn: "Unique Person",
      nameBn: "ইউনিক পার্সন",
      fatherName: "Unique Father",
      motherName: "Unique Mother",
      dateOfBirth: new Date("1992-05-15"),
      gender: Gender.FEMALE,
      presentAddress: {
        ward: 2,
        village: "Different Village",
      },
      permanentAddress: {
        ward: 2,
        village: "Different Village",
      },
      nid: "1992987654321",
      birthCertificateNo: "BC-UNIQUE-001",
      mobile: "01800000000",
    },
    undefined,
    "SECRETARY"
  );
  console.log(
    result6.success
      ? `✓ SUCCESS: ${result6.citizen?.registrationNo} created`
      : `✗ FAILED: ${result6.message}`
  );
  console.log();

  console.log("\n=== Test Summary ===");
  console.log(`Identity duplicate prevention: ${!result2.success ? "✓" : "✗"}`);
  console.log(`NID duplicate prevention: ${!result3.success ? "✓" : "✗"}`);
  console.log(`Birth cert duplicate prevention: ${!result4.success ? "✓" : "✗"}`);
  console.log(`Mobile duplicate prevention: ${!result5.success ? "✓" : "✗"}`);
  console.log(`Unique person creation: ${result6.success ? "✓" : "✗"}`);

  const allPassed =
    !result2.success &&
    !result3.success &&
    !result4.success &&
    !result5.success &&
    result6.success;

  console.log(`\n${allPassed ? "✅ All tests passed!" : "❌ Some tests failed"}`);

  // Cleanup test data
  if (result1.citizen) {
    const { prisma } = await import("../src/lib/db");
    await prisma.$runCommandRaw({
      delete: "citizens",
      deletes: [{ q: { _id: { $oid: result1.citizen.id } }, limit: 1 }],
    });
    console.log("\n🗑️  Cleaned up test citizen");
  }
  if (result6.citizen) {
    const { prisma } = await import("../src/lib/db");
    await prisma.$runCommandRaw({
      delete: "citizens",
      deletes: [{ q: { _id: { $oid: result6.citizen.id } }, limit: 1 }],
    });
    console.log("🗑️  Cleaned up unique test citizen");
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
