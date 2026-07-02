"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  goalId: string;
};

export function StartSessionButton({ goalId }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  async function startSession() {
    setError("");
    setIsStarting(true);

    try {
      const response = await fetch("/api/study-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goalId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const session = await response.json();

      router.push(`/study/${session.id}`);
    } catch {
      setError("Could not start this session. Please try again.");
      setIsStarting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={isStarting}
        onClick={startSession}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {isStarting ? "Starting..." : "Start Session"}
      </button>
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
