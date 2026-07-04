"use client";

import { useState } from "react";

export default function MedicineForm() {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [reminderAt, setReminderAt] = useState("");

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const response = await fetch(
      "/api/medicine",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          name,
          dosage,
          reminderAt,
        }),
      }
    );

    if (response.ok) {
      setName("");
      setDosage("");
      setReminderAt("");

      alert("Medicine saved!");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <label className="block mb-2 font-medium">
          Medicine Name
        </label>

        <input
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Vitamin D"
          required
        />
      </div>

      <div>
        <label className="block mb-2 font-medium">
          Dosage
        </label>

        <input
          value={dosage}
          onChange={(e) =>
            setDosage(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="1 tablet"
        />
      </div>

      <div>
        <label className="block mb-2 font-medium">
          Reminder Time
        </label>

        <input
          type="time"
          value={reminderAt}
          onChange={(e) =>
            setReminderAt(
              e.target.value
            )
          }
          className="w-full rounded border p-3"
          required
        />
      </div>

      <button
        className="rounded bg-blue-600 px-6 py-3 text-white"
      >
        Save Medicine
      </button>
    </form>
  );
}