import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const DEFAULT_WATER_REMINDER_INTERVAL = 30;

async function getOrCreateSettings() {
  const settings = await prisma.appSettings.findFirst();

  if (settings) {
    return settings;
  }

  return prisma.appSettings.create({
    data: {
      waterReminderInterval: DEFAULT_WATER_REMINDER_INTERVAL,
    },
  });
}

export async function GET() {
  const settings = await getOrCreateSettings();

  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const waterReminderInterval = Number(body.waterReminderInterval);

  if (
    !Number.isFinite(waterReminderInterval) ||
    waterReminderInterval < 1
  ) {
    return NextResponse.json(
      { error: "Water reminder interval must be greater than zero." },
      { status: 400 },
    );
  }

  const settings = await getOrCreateSettings();

  const updated = await prisma.appSettings.update({
    where: {
      id: settings.id,
    },
    data: {
      waterReminderInterval: Math.floor(waterReminderInterval),
    },
  });

  return NextResponse.json(updated);
}
