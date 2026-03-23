/**
 * Check for duplicate citizens in the database
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const citizens = await prisma.citizen.findMany({
    where: {
      name: "MORSHED AL MAIN",
    },
    select: {
      id: true,
      name: true,
      fatherName: true,
      dateOfBirth: true,
      identityHash: true,
      registrationNo: true,
      mobile: true,
      nid: true,
      birthCertificateNo: true,
      deletedAt: true,
    },
  });

  console.log("Found", citizens.length, "citizens named MORSHED AL MAIN:");
  console.log(JSON.stringify(citizens, null, 2));

  // Group by identity hash
  const grouped = new Map<string, typeof citizens>();
  for (const citizen of citizens) {
    if (!citizen.deletedAt && citizen.identityHash) {
      const existing = grouped.get(citizen.identityHash) || [];
      existing.push(citizen);
      grouped.set(citizen.identityHash, existing);
    }
  }

  console.log("\nGrouped by identity hash:");
  for (const [hash, group] of grouped.entries()) {
    if (group.length > 1) {
      console.log(`\nDUPLICATES with hash ${hash.substring(0, 20)}...:`);
      group.forEach((c) => {
        console.log(`  - ${c.registrationNo}: ${c.name}`);
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
