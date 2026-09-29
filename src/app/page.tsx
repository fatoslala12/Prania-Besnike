import {
  Handshake,
  HeartHandshake,
  Landmark,
  ShieldCheck,
  Users,
  Ear,
  Ban,
  FileCheck2,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { HeroSection } from "@/components/HeroSection";
import { CitizenForm } from "@/components/CitizenForm";
import { auth } from "@/auth";

const besaPillars = [
  {
    letter: "B",
    title: "Besim",
    text: "Rritja e besimit të qytetarit te shteti përmes dëgjimit dhe përgjigjes.",
  },
  {
    letter: "E",
    title: "Empati",
    text: "Qasje njerëzore ndaj hallit të individit, pa dallime politike.",
  },
  {
    letter: "S",
    title: "Shërbim",
    text: "Shërbim publik i disiplinuar: shënim, adresim dhe përgjigje ligjore.",
  },
  {
    letter: "A",
    title: "Angazhim",
    text: "Prani e vazhdueshme në terren — çdo të premte, në gjithë Shqipërinë.",
  },
];

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader isLoggedIn={isLoggedIn} />

      <main className="flex-1">
        <HeroSection isLoggedIn={isLoggedIn} />

        <section
          id="besa"
          className="scroll-mt-24 mx-auto max-w-6xl px-4 py-10 md:py-14"
        >
          <p className="section-kicker">Platforma strategjike</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">BESA</h2>
          <p className="mt-3 max-w-3xl text-muted">
            Busulla e mandatit të katërt qeverisës — kalimi nga transformimi
            fizik drejt transformimit të brendshëm institucional.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {besaPillars.map((p) => (
              <article
                key={p.letter}
                className="surface-card group p-5 transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_16px_40px_rgba(166,50,64,0.1)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white transition duration-300 group-hover:scale-110">
                  {p.letter}
                </div>
                <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {p.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white py-10 md:py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div>
                <p className="section-kicker">1 · Shtylla qeverisëse</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
                  Platforma strategjike «Besa»
                </h2>
                <p className="mt-4 leading-relaxed text-ink/80">
                  «Besa» është dokumenti bazë strategjik i prezantuar nga
                  Kryeministri Edi Rama në korrik 2026. Ky program lindi si
                  reflektim i drejtpërdrejtë ndaj pakënaqësive shoqërore dhe
                  protestave të qytetarëve (e njohur si «Protesta e Flamingove»).
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex gap-3">
                    <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <div>
                      <p className="font-semibold">Misioni kryesor</p>
                      <p className="text-sm text-muted">
                        Nga transformimi thjesht infrastrukturor — drejt
                        transformimit të brendshëm që rrit besimin te shteti.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <div>
                      <p className="font-semibold">Objektivi</p>
                      <p className="text-sm text-muted">
                        Ura komunikimi e bazuar te dëgjimi, empatia dhe
                        solidariteti — harmonizimi i zhvillimit me përjetimin e
                        përditshëm të qytetarit.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <div>
                      <p className="font-semibold">Mekanizmat</p>
                      <p className="text-sm text-muted">
                        7 mekanizma zbatimi, përfshirë platformat digjitale si
                        «Pasqyrë Albania» (Flamingo dhe Radar).
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
              <aside className="surface-card border-l-4 border-l-brand p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(166,50,64,0.1)]">
                <p className="text-sm font-bold uppercase tracking-wider text-brand">
                  Filozofia
                </p>
                <p className="mt-3 text-lg font-semibold leading-snug">
                  Shteti nuk duhet vetëm të bëjë punë — duhet të dëgjojë, të
                  empatizojë dhe të përgjigjet.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section
          id="prania"
          className="scroll-mt-24 mx-auto max-w-6xl px-4 py-10 md:py-14"
        >
          <p className="section-kicker">2 · Shtylla organizative</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
            Nisma «Prania Besnike»
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-ink/80">
            Aneksi i brendshëm i dokumentit «Besa». I adresohet ekskluzivisht
            strukturave të Partisë Socialiste — si rregullore strikte pune për
            deputetët dhe drejtuesit në terren.
          </p>

          <div className="mt-8 surface-card overflow-hidden transition duration-300 hover:shadow-[0_20px_50px_rgba(166,50,64,0.12)]">
            <div className="bg-brand px-6 py-5 text-white md:px-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-90">
                Formati i ri i takimit
              </p>
              <p className="mt-1 text-2xl font-extrabold md:text-3xl">
                Çdo të premte · ora 17:00
              </p>
              <p className="mt-1 text-white/85">
                Në çdo njësi administrative, në gjithë Shqipërinë
              </p>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-3 md:p-8">
              <div className="flex gap-3 rounded-xl p-2 transition hover:bg-brand-soft/40">
                <Ban className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <div>
                  <p className="font-semibold">Pa kamera, pa tesera</p>
                  <p className="mt-1 text-sm text-muted">
                    Takime neutrale, jo-propagandistike, të hapura për çdo
                    qytetar.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl p-2 transition hover:bg-brand-soft/40">
                <Ear className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <div>
                  <p className="font-semibold">Dëgjesë individuale</p>
                  <p className="mt-1 text-sm text-muted">
                    Fokus tek halli apo ankesa specifike e individit — jo
                    mbledhje.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl p-2 transition hover:bg-brand-soft/40">
                <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <div>
                  <p className="font-semibold">Ndalimi i mospërgjigjes</p>
                  <p className="mt-1 text-sm text-muted">
                    Shënim, adresim zyrtar dhe përgjigje ligjore — pozitive ose
                    negative.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-10 md:py-14">
          <div className="mx-auto max-w-6xl px-4">
            <p className="section-kicker">Krahasimi</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
              Besa dhe Prania Besnike
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Dy shtylla të njëjtës busullë — qeverisja dhe organizimi në
              terren.
            </p>

            <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-brand text-white">
                    <th className="px-4 py-4 font-semibold md:px-6">
                      Karakteristika
                    </th>
                    <th className="px-4 py-4 font-semibold md:px-6">
                      <span className="inline-flex items-center gap-2">
                        <Landmark className="h-4 w-4" /> Platforma «BESA»
                      </span>
                    </th>
                    <th className="px-4 py-4 font-semibold md:px-6">
                      <span className="inline-flex items-center gap-2">
                        <Handshake className="h-4 w-4" /> «Prania Besnike»
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-card">
                  {[
                    [
                      "Natyra e dokumentit",
                      "Strategjia kryesore qeverisëse.",
                      "Aneks operativ i dokumentit «Besa».",
                    ],
                    [
                      "Kujt i drejtohet?",
                      "Qeverisë, institucioneve publike dhe marrëdhënies me qytetarin.",
                      "Vetëm strukturave të brendshme dhe deputetëve të PS.",
                    ],
                    [
                      "Fokusi kryesor",
                      "Ndryshimi i filozofisë së shtetit (Empati, Transparencë, Llogaridhënie).",
                      "Disiplina e dëgjimit në terren (zgjidhja e problemeve konkrete).",
                    ],
                    [
                      "Zbatimi praktik",
                      "Reforma ligjore, sisteme monitorimi si «Pasqyrë Albania».",
                      "Dëgjesa publike/individuale çdo të premte në orën 17:00.",
                    ],
                    [
                      "Transparenca mediatike",
                      "Komunikohet publikisht me strategji qeveritare.",
                      "Zhvillohet në mjedis neutral, pa praninë e kamerave.",
                    ],
                  ].map((row) => (
                    <tr
                      key={row[0]}
                      className="align-top transition-colors hover:bg-brand-soft/30"
                    >
                      <th className="bg-brand-soft/50 px-4 py-4 font-semibold text-ink md:px-6">
                        {row[0]}
                      </th>
                      <td className="px-4 py-4 text-ink/80 md:px-6">{row[1]}</td>
                      <td className="px-4 py-4 text-ink/80 md:px-6">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section
          id="kerkesa"
          className="scroll-mt-24 mx-auto max-w-3xl px-4 py-10 md:py-14"
        >
          <div className="text-center">
            <Users className="mx-auto h-8 w-8 text-brand" />
            <p className="section-kicker mt-4">Për qytetarët</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
              Dërgo kërkesën tuaj
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              Plotësoni formularin. Kërkesa regjistrohet me numër unik dhe i
              dërgohet drejtpërdrejt drejtorisë/agjencisë përkatëse.
            </p>
          </div>
          <div className="mt-8">
            <CitizenForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
