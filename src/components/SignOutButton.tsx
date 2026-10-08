"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-brand hover:text-brand"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Dil
    </button>
  );
}
