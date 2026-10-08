"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

/** Në celular fushat e filtrave palosen; nga md e lart shfaqen gjithmonë. */
export function MobileFilters({
  activeCount,
  label = "Filtrat e raportit",
  children,
}: {
  activeCount: number;
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-ink/80 md:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-brand" />
          {label}
          {activeCount > 0 && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[0.7rem] text-white">
              {activeCount} aktivë
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`${open ? "block" : "hidden"} space-y-4 md:block`}>{children}</div>
    </>
  );
}
