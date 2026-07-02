import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const goalId = String(body.goalId ?? "");

  if (!goalId) {
    return NextResponse.json(
      { error: "Goal ID is required." },
      { status: 400 },
    );
  }

  const goal = await prisma.goal.findUnique({
    where: {
      id: goalId,
    },
  });

  if (!goal) {
    return NextResponse.json(
      { error: "Goal not found." },
      { status: 404 },
    );
  }

  const existingSession = await prisma.studySession.findFirst({
    where: {
      goalId,
      status: "ACTIVE",
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  if (existingSession) {
    return NextResponse.json(existingSession);
  }

  const session = await prisma.studySession.create({
    data: {
      goalId,
    },
  });

  return NextResponse.json(session);
}
