/**
 * Permanently delete soft-deleted duplicate citizens
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Finding soft-deleted citizens...\n");

  const allCitizens = await prisma.citizen.findMany({
    select: {
      id: true,
      name: true,
      registrationNo: true,
      deletedAt: true,
    },
  });

  const deletedCitizens = allCitizens.filter((c) => c.deletedAt);

  console.log(`Found ${deletedCitizens.length} soft-deleted citizens to permanently delete\n`);

  for (const citizen of deletedCitizens) {
    await prisma.$runCommandRaw({
      delete: "citizens",
      deletes: [
        {
          q: { _id: { $oid: citizen.id } },
          limit: 1,
        },
      ],
    });
    console.log(`✓ Deleted: ${citizen.registrationNo} - ${citizen.name}`);
  }

  console.log(`\n✅ Permanently deleted ${deletedCitizens.length} soft-deleted citizens`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
