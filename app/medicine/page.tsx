import { prisma } from "@/lib/prisma";
import type { Medicine } from "@prisma/client";
import DeleteMedicineButton from "./DeleteMedicineButton";

export const dynamic = "force-dynamic";

export default async function MedicinePage() {
  const medicines: Medicine[] = await prisma.medicine.findMany({
    orderBy: {
      reminderAt: "asc",
    },
  });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Medicines</h1>

      <div className="mt-10 space-y-4">
        {medicines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
            No medicine reminders added yet.
          </div>
        ) : (
          medicines.map((medicine) => (
            <div
              key={medicine.id}
              className="rounded-xl border p-5 shadow-sm"
            >
              <h2 className="text-xl font-bold">{medicine.name}</h2>

              {medicine.dosage ? <p>{medicine.dosage}</p> : null}

              <p className="text-gray-600">Reminder: {medicine.reminderAt}</p>

              <p className="mt-2">
                {medicine.takenToday ? "Taken today" : "Pending"}
              </p>

              <DeleteMedicineButton medicineId={medicine.id} />
            </div>
          ))
        )}
      </div>
    </main>
  );
}
