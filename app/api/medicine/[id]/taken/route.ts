import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const medicine = await prisma.medicine.update({
    where: {
      id,
    },
    data: {
      takenToday: true,
    },
  });

  return NextResponse.json(medicine);
}