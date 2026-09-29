"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ScrollText, Handshake, MessageSquarePlus } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const links = [
  { href: "#besa", label: "Besa", icon: ScrollText },
  { href: "#prania", label: "Prania Besnike", icon: Handshake },
  { href: "#kerkesa", label: "Kërkesa", icon: MessageSquarePlus },
];

type Props = {
  isLoggedIn: boolean;
};

export function SiteHeader({ isLoggedIn }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const ids = links.map((l) => l.href.slice(1));
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 110) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function goTo(href: string) {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 shadow-[0_10px_40px_rgba(17,17,17,0.08)] backdrop-blur-xl"
          : "bg-gradient-to-b from-white to-white/80 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 overflow-visible px-4 py-3">
        <div className="min-w-0 shrink-0">
          <BrandMark size="sm" />
        </div>

        {/* Desktop nav — pill shell */}
        <nav className="hidden items-center gap-1 rounded-full border border-black/5 bg-ink/[0.03] p-1 md:flex">
          {links.map((link) => {
            const id = link.href.slice(1);
            const isActive = active === id;
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(link.href);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.82rem] font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-brand text-white shadow-md shadow-brand/25"
                    : "text-ink/70 hover:bg-white hover:text-brand hover:shadow-sm"
                }`}
              >
                <Icon className="h-3.5 w-3.5 opacity-80" />
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={isLoggedIn ? "/panel" : "/hyr"}
            className="relative z-20 hidden rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/30 sm:inline-flex"
          >
            {isLoggedIn ? "Paneli" : "Hyr"}
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-brand hover:text-brand md:hidden"
            aria-label={open ? "Mbyll menynë" : "Hap menynë"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden border-t border-line/70 bg-white transition-all duration-300 md:hidden ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 px-3 py-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(link.href);
                }}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 font-semibold text-ink/80 transition hover:bg-brand-soft hover:text-brand"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-4 w-4" />
                </span>
                {link.label}
              </a>
            );
          })}
          <Link
            href={isLoggedIn ? "/panel" : "/hyr"}
            className="mt-1 rounded-full bg-brand py-3 text-center text-sm font-bold text-white"
            onClick={() => setOpen(false)}
          >
            {isLoggedIn ? "Paneli" : "Hyr"}
          </Link>
        </div>
      </div>
    </header>
  );
}
