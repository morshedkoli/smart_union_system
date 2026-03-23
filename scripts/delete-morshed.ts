import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$runCommandRaw({
    delete: "citizens",
    deletes: [
      {
        q: { _id: { $oid: "69c12788c7cb5f4e2121a7c5" } },
        limit: 1,
      },
    ],
  });
  console.log("✓ Deleted remaining MORSHED AL MAIN duplicate");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
