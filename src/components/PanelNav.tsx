"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  ListTodo,
  Menu,
  PlusCircle,
  Users,
  LogOut,
  UserRound,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { NotificationBell } from "@/components/NotificationBell";
import {
  ROLE_LABELS,
  canCreateTask,
  canManageUsers,
  canViewActivity,
  canViewReports,
  shortOrgUnit,
} from "@/lib/constants";
import type { Role } from "@/lib/types";
import { signOut } from "next-auth/react";

type Props = {
  user: {
    name: string;
    role: Role;
    orgUnit: string | null;
    roleCount: number;
  };
};

/** Sa lidhje zënë vend në shiritin poshtë në celular; të tjerat shkojnë te "Më shumë". */
const MOBILE_SLOTS = 4;

export function PanelNav({ user }: Props) {
  const pathname = usePathname();
  const multiRole = user.roleCount > 1;
  /** Fleta "Më shumë" mbyllet vetë kur ndryshon faqja. */
  const [openPath, setOpenPath] = useState<string | null>(null);
  const moreOpen = openPath === pathname;
  const setMoreOpen = (open: boolean) => setOpenPath(open ? pathname : null);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenPath(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

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
    {
      href: "/panel/aktiviteti",
      label: "Aktiviteti",
      short: "Aktiviteti",
      icon: Activity,
      show: canViewActivity(user.role),
    },
  ].filter((l) => l.show);

  const primary = links.slice(0, MOBILE_SLOTS);
  const overflow = links.slice(MOBILE_SLOTS);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    if (href === "/panel") return pathname === "/panel";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const moreActive = overflow.some((l) => isActive(l.href)) || isActive("/panel/profili");
  const roleLine = `${ROLE_LABELS[user.role]}${user.orgUnit ? ` · ${shortOrgUnit(user.orgUnit)}` : ""}`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 shadow-sm backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
            <BrandMark size="sm" href="/panel/dashboard" className="shrink-0 [&_img]:h-9" />
            <nav className="hidden items-center gap-1 rounded-full border border-black/5 bg-ink/[0.03] p-1 md:flex">
              {links.map((link) => {
                const active = isActive(link.href, link.exact);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={link.label}
                    aria-label={link.label}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.8rem] font-semibold transition-all ${
                      active
                        ? "bg-brand text-white shadow-md shadow-brand/25"
                        : "text-ink/65 hover:bg-white hover:text-brand hover:shadow-sm"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 opacity-90" />
                    {links.length > 4 ? (
                      <>
                        <span className="hidden lg:inline xl:hidden">{link.short}</span>
                        <span className="hidden xl:inline">{link.label}</span>
                      </>
                    ) : (
                      <span className="hidden lg:inline">{link.label}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
                <span className="block max-w-[9rem] truncate text-sm font-semibold leading-tight text-ink">
                  {user.name}
                </span>
                <span className="block max-w-[11rem] truncate text-[0.7rem] font-medium text-brand">
                  {ROLE_LABELS[user.role]}
                  {multiRole && user.orgUnit ? ` · ${shortOrgUnit(user.orgUnit)}` : ""}
                </span>
              </span>
            </Link>
            {multiRole && (
              <Link
                href={`/roli?next=${encodeURIComponent(pathname)}`}
                className="hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-2 text-sm font-semibold text-ink/70 transition hover:border-brand hover:text-brand md:inline-flex"
                aria-label="Ndërro rolin"
                title="Ndërro rolin"
              >
                <ArrowLeftRight className="h-4 w-4" />
                {links.length <= 4 && <span className="hidden pr-0.5 xl:inline">Ndërro rolin</span>}
              </Link>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-2 text-sm font-semibold text-ink/70 transition hover:border-brand hover:text-brand md:inline-flex lg:px-3"
              aria-label="Dil"
              title="Dil"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Dil</span>
            </button>
          </div>
        </div>
        {multiRole && (
          <Link
            href={`/roli?next=${encodeURIComponent(pathname)}`}
            className="flex items-center justify-between gap-2 border-t border-black/5 bg-brand-soft/50 px-3 py-1.5 text-xs md:hidden"
          >
            <span className="min-w-0 truncate">
              <span className="text-muted">Roli aktiv: </span>
              <b className="text-brand">{roleLine}</b>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-ink/70">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Ndërro
            </span>
          </Link>
        )}
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden print:hidden"
        aria-label="Navigimi i panelit"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
          {primary.map((link) => {
            const active = isActive(link.href, link.exact);
            const Icon = link.icon;
            return (
              <li key={link.href} className="min-w-0 flex-1">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 px-1 py-2 text-[0.65rem] font-semibold transition ${
                    active ? "text-brand" : "text-ink/50"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      active ? "bg-brand-soft" : ""
                    }`}
                  >
                    <Icon className="h-[1.15rem] w-[1.15rem]" />
                  </span>
                  <span className="max-w-full truncate">{link.short}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              aria-expanded={moreOpen}
              aria-controls="panel-more"
              className={`flex w-full flex-col items-center gap-0.5 px-1 py-2 text-[0.65rem] font-semibold transition ${
                moreActive || moreOpen ? "text-brand" : "text-ink/50"
              }`}
            >
              <span
                className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition ${
                  moreActive || moreOpen ? "bg-brand-soft" : ""
                }`}
              >
                <Menu className="h-[1.15rem] w-[1.15rem]" />
              </span>
              Më shumë
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Më shumë" id="panel-more">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            aria-label="Mbyll"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-zinc-200" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{user.name}</p>
                <p className="truncate text-xs font-medium text-brand">{roleLine}</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink/60"
                aria-label="Mbyll"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {overflow.length > 0 && (
              <>
                <p className="mt-5 mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Administrimi</p>
                <div className="grid grid-cols-2 gap-2">
                  {overflow.map((link) => {
                    const active = isActive(link.href, link.exact);
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-2.5 rounded-2xl border p-3 text-sm font-semibold transition ${
                          active ? "border-brand bg-brand-soft text-brand" : "border-line bg-bg/50 text-ink/80 active:bg-bg"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            <p className="mt-5 mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Llogaria</p>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              <li>
                <Link
                  href="/panel/profili"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-3 text-sm font-semibold active:bg-bg"
                >
                  <UserRound className="h-[1.1rem] w-[1.1rem] text-ink/50" />
                  <span className="flex-1">Profili im</span>
                  <ChevronRight className="h-4 w-4 text-ink/30" />
                </Link>
              </li>
              {multiRole && (
                <li>
                  <Link
                    href={`/roli?next=${encodeURIComponent(pathname)}`}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-3 text-sm font-semibold active:bg-bg"
                  >
                    <ArrowLeftRight className="h-[1.1rem] w-[1.1rem] text-ink/50" />
                    <span className="flex-1">
                      Ndërro rolin
                      <span className="block text-xs font-normal text-muted">Keni {user.roleCount} role</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink/30" />
                  </Link>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm font-semibold text-brand active:bg-bg"
                >
                  <LogOut className="h-[1.1rem] w-[1.1rem]" />
                  Dil nga llogaria
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
