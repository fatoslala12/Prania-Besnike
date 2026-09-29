"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-ghost inline-flex items-center justify-center gap-1.5 !py-2 text-sm"
    >
      <Printer className="h-4 w-4" />
      Printo / PDF
    </button>
  );
}
