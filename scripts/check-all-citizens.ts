import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$runCommandRaw({
    find: "citizens",
    filter: {},
    projection: { registrationNo: 1, name: 1, deletedAt: 1 },
  });

  const citizens = (result as { cursor: { firstBatch: unknown[] } }).cursor.firstBatch;

  console.log("All citizens in database:");
  console.log(JSON.stringify(citizens, null, 2));

  // Check for duplicate registrationNo
  const regNos = new Map<string, number>();
  (citizens as Array<{ registrationNo: string }>).forEach((c) => {
    regNos.set(c.registrationNo, (regNos.get(c.registrationNo) || 0) + 1);
  });

  const dupes = Array.from(regNos.entries()).filter(([, count]) => count > 1);
  if (dupes.length > 0) {
    console.log("\nDuplicate registration numbers:");
    dupes.forEach(([regNo, count]) => {
      console.log(`  ${regNo}: ${count} times`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
