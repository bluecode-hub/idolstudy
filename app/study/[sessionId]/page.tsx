import Link from "next/link";
import { StudySession } from "../StudySession";
import { prisma } from "@/lib/prisma";

export default async function StudyPage({
  params,
}: {
  params: Promise<{
    sessionId: string;
  }>;
}) {
  const { sessionId } = await params;
  const session = await prisma.studySession.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      goal: true,
    },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="inline-flex text-sm font-semibold text-slate-600 transition hover:text-slate-950"
      >
        Back to dashboard
      </Link>

      <div className="mt-6 space-y-4">
        {session ? (
          <>
            <StudySession goal={session.goal} sessionId={session.id} startedAt={session.startedAt.toISOString()} />
            <p className="text-center text-sm text-slate-500">
              Session ID: {sessionId}
            </p>
          </>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-950">
              Session not found
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              This study session may have been deleted or the link is invalid.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
