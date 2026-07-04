import { prisma } from "@/lib/prisma";
import DeleteMedicineButton from "./DeleteMedicineButton";
import { isDatabaseConnectionError } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

type MedicineReminder = {
  id: string;
  name: string;
  dosage: string | null;
  reminderAt: string;
  takenToday: boolean;
};

export default async function MedicinePage() {
  let medicines: MedicineReminder[] = [];
  let databaseUnavailable = false;

  try {
    medicines = await prisma.medicine.findMany({
      orderBy: {
        reminderAt: "asc",
      },
    });
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      throw error;
    }

    databaseUnavailable = true;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Medicines</h1>

      {databaseUnavailable ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Database is not reachable right now. Check your Supabase connection
          string, then refresh this page.
        </div>
      ) : null}

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
