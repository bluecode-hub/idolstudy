import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({ action: "increment" }));

  const goal = await prisma.goal.findUnique({
    where: {
      id,
    },
  });

  if (!goal) {
    return NextResponse.json(
      { error: "Goal not found" },
      { status: 404 }
    );
  }

  if (body.action === "increment") {
    const nextProgress = Math.min(goal.progress + 1, goal.target);
    const updatedGoal = await prisma.goal.update({
      where: {
        id,
      },
      data: {
        progress: nextProgress,
        completed: nextProgress >= goal.target,
      },
    });

    revalidatePath("/dashboard");

    return NextResponse.json(updatedGoal);
  } else if (body.action === "decrement") {
    const nextProgress = Math.max(goal.progress - 1, 0);
    const updatedGoal = await prisma.goal.update({
      where: {
        id,
      },
      data: {
        progress: nextProgress,
        completed: false,
      },
    });

    revalidatePath("/dashboard");

    return NextResponse.json(updatedGoal);
  } else if (body.action === "set") {
    const requestedProgress = Number(body.progress);

    if (!Number.isFinite(requestedProgress)) {
      return NextResponse.json(
        { error: "Progress must be a number" },
        { status: 400 }
      );
    }

    const nextProgress = Math.min(
      Math.max(Math.floor(requestedProgress), 0),
      goal.target
    );

    const updatedGoal = await prisma.goal.update({
      where: {
        id,
      },
      data: {
        progress: nextProgress,
        completed: nextProgress >= goal.target,
      },
    });

    revalidatePath("/dashboard");

    return NextResponse.json(updatedGoal);
  } else {
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  }
}
