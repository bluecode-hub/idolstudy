"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewGoalPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState("QUESTIONS");
  const [target, setTarget] = useState(50);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function createGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Goal title is required.");
      return;
    }

    if (target <= 0) {
      setError("Target must be greater than zero.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          goalType,
          target,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create goal.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not create the goal. Please try again.");
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="inline-flex text-sm font-semibold text-slate-600 transition hover:text-slate-950"
      >
        Back to dashboard
      </Link>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
            Study Goal
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Create Goal
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Set a target for questions, chapters, or focused study time.
          </p>
        </div>

        <form className="mt-6 space-y-6" onSubmit={createGoal}>
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-slate-800"
            >
              Goal title
            </label>
            <input
              id="title"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              placeholder="Finish algebra practice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="goalType"
                className="block text-sm font-semibold text-slate-800"
              >
                Goal type
              </label>
              <select
                id="goalType"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
              >
                <option value="QUESTIONS">Questions</option>
                <option value="CHAPTER">Chapter</option>
                <option value="TIMER">Timer</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="target"
                className="block text-sm font-semibold text-slate-800"
              >
                Target
              </label>
              <input
                id="target"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                min={1}
                type="number"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSaving ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
