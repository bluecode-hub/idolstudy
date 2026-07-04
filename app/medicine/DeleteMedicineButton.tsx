"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteMedicineButtonProps = {
  medicineId: string;
};

export default function DeleteMedicineButton({
  medicineId,
}: DeleteMedicineButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteMedicine() {
    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/medicine/${medicineId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete medicine");
      }

      router.refresh();
    } catch {
      setError("Could not delete this medicine. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={isDeleting}
        onClick={deleteMedicine}
        className="mt-4 rounded bg-red-500 px-4 py-2 text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}
    </div>
  );
}