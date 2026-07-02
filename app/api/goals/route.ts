import { prisma } from "@/lib/prisma";
import { GoalType } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const target = Number(body.target);

  if (!title) {
    return NextResponse.json(
      { error: "Goal title is required." },
      { status: 400 },
    );
  }

  if (!Object.values(GoalType).includes(body.goalType)) {
    return NextResponse.json(
      { error: "Invalid goal type." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(target) || target < 1) {
    return NextResponse.json(
      { error: "Target must be greater than zero." },
      { status: 400 },
    );
  }

  const goal = await prisma.goal.create({
    data: {
      title,
      goalType: body.goalType,
      target: Math.floor(target),
    },
  });

  return NextResponse.json(goal);
}
