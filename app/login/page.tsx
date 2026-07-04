"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-xl border p-10 shadow-lg">
        <h1 className="mb-8 text-3xl font-bold text-center">
          IdolFlow
        </h1>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="rounded-lg bg-blue-600 px-8 py-4 text-white font-semibold hover:bg-blue-700"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
