import Link from "next/link";
import { Building2, Users } from "lucide-react";

const TABS = [
  { key: "users", href: "/panel/perdoruesit", label: "Përdoruesit", icon: Users },
  { key: "units", href: "/panel/perdoruesit/drejtorite", label: "Drejtoritë", icon: Building2 },
] as const;

export function AdminTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="inline-flex rounded-full border border-line bg-white p-1" aria-label="Administrimi">
      {TABS.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
            active === key ? "bg-brand text-white shadow-sm" : "text-ink/65 hover:text-brand"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
