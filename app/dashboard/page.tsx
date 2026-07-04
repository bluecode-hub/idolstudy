import { prisma } from "@/lib/prisma";
import { DeleteGoalButton } from "./DeleteGoalButton";
import { StartSessionButton } from "./StartSessionButton";
import Link from "next/link";
import UpcomingMeetings from "@/app/components/UpcomingMeeting";
import { isDatabaseConnectionError } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

type DashboardGoal = {
  id: string;
  title: string;
  goalType: string;
  target: number;
  progress: number;
};

export default async function DashboardPage() {
  let goals: DashboardGoal[] = [];
  let databaseUnavailable = false;

  try {
    goals = await prisma.goal.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      throw error;
    }

    databaseUnavailable = true;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
            IdolStudy
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/new-goal"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + New Goal
          </Link>

          <Link
            href="/medicine/new"
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            Add Medicine
          </Link>

          <Link
            href="/medicine"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Medicines
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Login
          </Link>
        </div>
      </div>

      <UpcomingMeetings />

      {databaseUnavailable ? (
        <section className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Database is not reachable right now. Check your Supabase connection
          string, then refresh this page.
        </section>
      ) : null}

      {goals.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            No goals yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Create your first study goal to start tracking progress from this
            dashboard.
          </p>
          <Link
            href="/dashboard/new-goal"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + New Goal
          </Link>
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const percentage =
            goal.target > 0
              ? (goal.progress / goal.target) * 100
              : 0;
          const boundedPercentage = Math.min(Math.max(percentage, 0), 100);

          return (
            <article
              key={goal.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-950">
                {goal.title}
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                {goal.goalType}
              </p>

              <p className="mt-5 text-sm text-slate-700">
                Progress: {goal.progress} / {goal.target}
              </p>

              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${boundedPercentage}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-sm text-slate-500">
                {boundedPercentage.toFixed(1)}% complete
              </p>

              <div className="mt-5 space-y-2">
                <StartSessionButton goalId={goal.id} />
                <DeleteGoalButton goalId={goal.id} />
              </div>
              
            </article>
            
          );
        })}
        </section>
      )}
    </main>
  );
}
