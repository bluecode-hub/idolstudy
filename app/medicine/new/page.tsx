import Link from "next/link";
import MedicineForm from "../MedicineForm";

export default function NewMedicinePage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Add Medicine Reminder</h1>
        <Link
          href="/medicine"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          View Medicines
        </Link>
      </div>

      <MedicineForm />
    </main>
  );
}