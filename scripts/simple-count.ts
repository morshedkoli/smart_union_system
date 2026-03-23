import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Just count all citizens
  const count = await prisma.citizen.count();
  console.log("Total citizens (including deleted):", count);

  const activeCount = await prisma.citizen.count({
    where: { deletedAt: null },
  });
  console.log("Active citizens:", activeCount);

  // Get sample
  const sample = await prisma.citizen.findMany({
    take: 3,
    select: {
      id: true,
      name: true,
      identityHash: true,
      deletedAt: true,
    },
  });

  console.log("\nSample citizens:");
  sample.forEach((c) => {
    console.log(`- ${c.name} (${c.deletedAt ? "deleted" : "active"})`);
    console.log(`  Hash: ${c.identityHash?.substring(0, 40)}...`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
