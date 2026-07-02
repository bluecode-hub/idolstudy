import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.appSettings.findFirst();

  if (!settings) {
    await prisma.appSettings.create({
      data: {
        waterReminderInterval: 30,
      },
    });
  }
}

main();
