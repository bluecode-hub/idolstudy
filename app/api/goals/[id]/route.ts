import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.studySession.deleteMany({
      where: {
        goalId: id,
      },
    });

    await prisma.goal.delete({
      where: {
        id,
      },
    });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Goal not found" },
        { status: 404 },
      );
    }

    throw error;
  }

  return NextResponse.json({
    success: true,
  });
}
