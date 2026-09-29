"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, MapPin, Clock } from "lucide-react";

type Props = {
  isLoggedIn: boolean;
};

export function HeroSection({ isLoggedIn }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-black/5">
      {/* Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(166,50,64,0.16),transparent_55%),linear-gradient(180deg,#fff 0%,#f7f4f3 100%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(166,50,64,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(166,50,64,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
        }}
        aria-hidden
      />
      {/* Soft orbs */}
      <div
        className="pointer-events-none absolute -left-20 top-8 h-56 w-56 rounded-full bg-brand/10 blur-3xl motion-safe:animate-float-slow"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-4 h-64 w-64 rounded-full bg-brand/[0.08] blur-3xl motion-safe:animate-float-slower"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.15fr_0.85fr] md:items-center md:gap-10 md:py-12 lg:py-14">
        {/* Left: brand + CTA */}
        <div className="text-center md:text-left">
          <div
            className={`hero-item inline-flex ${ready ? "hero-item-in" : ""}`}
            style={{ transitionDelay: "0ms" }}
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/80 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-brand shadow-sm backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-brand" />
              </span>
              Platforma zyrtare
            </span>
          </div>

          <div
            className={`hero-item ${ready ? "hero-item-in" : ""}`}
            style={{ transitionDelay: "80ms" }}
          >
            <Image
              src="/mshms-logo.png"
              alt="Ministria e Shëndetësisë dhe Mirëqenies Sociale"
              width={223}
              height={168}
              priority
              className="mx-auto h-32 w-auto select-none md:mx-0 md:h-40"
            />
          </div>

          <h1
            className={`hero-item mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05] ${
              ready ? "hero-item-in" : ""
            }`}
            style={{ transitionDelay: "160ms" }}
          >
            Prania{" "}
            <span className="bg-gradient-to-r from-brand to-brand-dark bg-clip-text text-transparent">
              Besnike
            </span>
          </h1>
          <p
            className={`hero-item mt-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/60 ${
              ready ? "hero-item-in" : ""
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <span className="rounded bg-brand px-2 py-0.5 tracking-[0.2em] text-white">MSHMS</span>
            Ministria e Shëndetësisë dhe Mirëqenies Sociale
          </p>

          <p
            className={`hero-item mx-auto mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted md:mx-0 md:text-base ${
              ready ? "hero-item-in" : ""
            }`}
            style={{ transitionDelay: "240ms" }}
          >
            Qasje e re për marrëdhënien shtet–qytetar. Dëgjesë, empati dhe
            përgjigje — asnjë qytetar pa përgjigje.
          </p>

          <div
            className={`hero-item mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start ${
              ready ? "hero-item-in" : ""
            }`}
            style={{ transitionDelay: "320ms" }}
          >
            <a
              href="#kerkesa"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("kerkesa")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand/30 transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-xl"
            >
              Dërgo kërkesën
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
            <Link
              href={isLoggedIn ? "/panel" : "/hyr"}
              className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-6 py-3 text-sm font-bold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:text-brand"
            >
              {isLoggedIn ? "Shko te paneli" : "Hyr në sistem"}
            </Link>
          </div>

          <a
            href="#besa"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("besa")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`hero-item mt-6 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/35 transition hover:text-brand md:mt-8 ${
              ready ? "hero-item-in" : ""
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            Zbulo BESA
            <ChevronDown className="h-4 w-4 animate-bounce-soft" />
          </a>
        </div>

        {/* Right: modern info card */}
        <div
          className={`hero-item ${ready ? "hero-item-in" : ""}`}
          style={{ transitionDelay: "200ms" }}
        >
          <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_24px_60px_rgba(166,50,64,0.12)] backdrop-blur-xl md:mx-0 md:p-7">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/10 blur-2xl" />
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-brand">
              Takimi në terren
            </p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
              Çdo të premte
            </p>
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-brand-soft/70 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-muted">Ora</p>
                  <p className="font-bold text-ink">17:00</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-ink/[0.03] px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-muted">Vendndodhja</p>
                  <p className="font-bold text-ink">Në gjithë Shqipërinë</p>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-5">
              {[
                ["Pa kamera", "Neutrale"],
                ["Dëgjesë 1:1", "Përgjigje"],
              ].map(([a, b]) => (
                <div
                  key={a}
                  className="rounded-xl border border-line bg-white px-3 py-2.5 text-center"
                >
                  <p className="text-[0.7rem] font-bold text-brand">{a}</p>
                  <p className="text-xs text-muted">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
