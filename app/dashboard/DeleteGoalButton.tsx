"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteGoalButtonProps = {
  goalId: string;
};

export function DeleteGoalButton({ goalId }: DeleteGoalButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteGoal() {
    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete goal");
      }

      router.refresh();
    } catch {
      setError("Could not delete this goal. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={isDeleting}
        onClick={deleteGoal}
        className="mt-3 w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
