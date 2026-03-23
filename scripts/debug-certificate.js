
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const certificateId = "69c148baf2744493f4729170";
    console.log(`Searching for certificate with ID: ${certificateId}`);

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        citizen: true,
        template: true
      }
    });

    if (certificate) {
      console.log("Certificate found:");
      console.log(JSON.stringify(certificate, null, 2));
    } else {
      console.log("Certificate NOT found in Prisma.");
    }

    console.log("\nListing top 5 certificates:");
    const list = await prisma.certificate.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Found ${list.length} certificates.`);
    list.forEach(c => console.log(`- ${c.id} (${c.status})`));

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
