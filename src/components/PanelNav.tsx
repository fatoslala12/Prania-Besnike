"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  ListTodo,
  PlusCircle,
  Users,
  LogOut,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { NotificationBell } from "@/components/NotificationBell";
import {
  ROLE_LABELS,
  canCreateTask,
  canManageUsers,
  canViewReports,
} from "@/lib/constants";
import type { Role } from "@/lib/types";
import { signOut } from "next-auth/react";

type Props = {
  user: {
    name: string;
    role: Role;
    orgUnit: string | null;
  };
};

export function PanelNav({ user }: Props) {
  const pathname = usePathname();

  const links = [
    {
      href: "/panel/dashboard",
      label: "Dashboard",
      short: "Board",
      icon: LayoutDashboard,
      show: true,
    },
    {
      href: "/panel",
      label: "Detyrat",
      short: "Detyrat",
      icon: ListTodo,
      show: true,
      exact: true,
    },
    {
      href: "/panel/detyra/e-re",
      label: "Detyrë e re",
      short: "E re",
      icon: PlusCircle,
      show: canCreateTask(user.role),
    },
    {
      href: "/panel/raporte",
      label: "Raporte",
      short: "Raporte",
      icon: BarChart3,
      show: canViewReports(user),
    },
    {
      href: "/panel/perdoruesit",
      label: "Përdoruesit",
      short: "Usera",
      icon: Users,
      show: canManageUsers(user.role),
    },
  ].filter((l) => l.show);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    if (href === "/panel") return pathname === "/panel";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 shadow-sm backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-5">
            <BrandMark size="sm" href="/panel/dashboard" className="[&_img]:h-9" />
            <nav className="hidden items-center gap-1 rounded-full border border-black/5 bg-ink/[0.03] p-1 md:flex">
              {links.map((link) => {
                const active = isActive(link.href, link.exact);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.8rem] font-semibold transition-all ${
                      active
                        ? "bg-brand text-white shadow-md shadow-brand/25"
                        : "text-ink/65 hover:bg-white hover:text-brand hover:shadow-sm"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 opacity-90" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <Link
              href="/panel/profili"
              aria-label="Profili im"
              title="Profili im"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition sm:h-auto sm:w-auto sm:rounded-xl sm:border-transparent sm:px-2 sm:py-1 sm:text-right ${
                isActive("/panel/profili")
                  ? "border-brand text-brand sm:bg-brand-soft/60"
                  : "border-line bg-white text-ink/70 hover:border-brand hover:text-brand sm:bg-transparent sm:hover:bg-brand-soft/40"
              }`}
            >
              <UserRound className="h-[1.1rem] w-[1.1rem] sm:hidden" />
              <span className="hidden sm:block">
                <span className="block max-w-[10rem] truncate text-sm font-semibold leading-tight text-ink">
                  {user.name}
                </span>
                <span className="block text-[0.7rem] font-medium text-brand">
                  {ROLE_LABELS[user.role]}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-2 text-sm font-semibold text-ink/70 transition hover:border-brand hover:text-brand sm:px-3"
              aria-label="Dil"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Dil</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden print:hidden"
        aria-label="Navigimi i panelit"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
          {links.map((link) => {
            const active = isActive(link.href, link.exact);
            const Icon = link.icon;
            return (
              <li key={link.href} className="flex-1">
                <Link
                  href={link.href}
                  className={`flex flex-col items-center gap-0.5 px-1 py-2 text-[0.65rem] font-semibold transition ${
                    active ? "text-brand" : "text-ink/50"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      active ? "bg-brand-soft" : ""
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 h-[1.15rem] w-[1.15rem]" />
                  </span>
                  {link.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
