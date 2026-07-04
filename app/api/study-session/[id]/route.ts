import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let session;

  try {
    session = await prisma.studySession.update({
      where: {
        id,
      },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Study session not found" },
        { status: 404 },
      );
    }

    throw error;
  }

  revalidatePath("/dashboard");

  return NextResponse.json(session);
}
