import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = {
  title: "Mbrojtja e të dhënave",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <BrandMark size="sm" />
          <Link href="/" className="text-sm font-medium text-brand underline underline-offset-4">
            Kthehu
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <p className="section-kicker">Ligji nr. 124/2024</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
          Mbrojtja e të dhënave tuaja
        </h1>
        <p className="mt-3 text-lg text-muted">
          Si e zbatojmë Ligjin nr. 124/2024 «Për mbrojtjen e të dhënave
          personale».
        </p>

        <div className="prose-legal mt-8 space-y-4">
          <p>
            <strong>Kush jemi.</strong> Prania Besnike është shërbimi i
            Ministrisë së Shëndetësisë dhe Mirëqenies Sociale (MSHMS) për
            kërkesat dhe ankesat e qytetarëve. Kur na e besoni një hall, na besoni edhe të dhënat tuaja
            personale — dhe ligji na ngarkon përgjegjësinë t&apos;i mbrojmë. Kjo
            faqe shpjegon shkurt çfarë kërkon ligji dhe si e zbatojmë ne.
          </p>
          <p>
            Për çdo pyetje ose kërkesë mbi të dhënat tuaja, drejtojuni
            ndërmjetësit të zonës suaj në dëgjesën e së premtes — kontaktin e
            tij e gjeni te kalendari i dëgjesave — ose shkruani te{" "}
            <a
              href="mailto:privatesia@praniabesnike.al"
              className="font-medium text-brand underline underline-offset-2"
            >
              privatesia@praniabesnike.al
            </a>
            .
          </p>

          <h2>1. Parimet që na detyron ligji</h2>
          <p>
            Neni 5 i ligjit vendos parime që janë të detyrueshme për këdo që
            përpunon të dhëna. Ja si i zbatojmë:
          </p>
          <ul>
            <li>
              <strong>Ligjshmëri dhe transparencë</strong> — ju dini që në
              fillim çfarë merret dhe pse; asgjë nuk ndodh pas shpine.
            </li>
            <li>
              <strong>Kufizim i qëllimit</strong> — të dhënat shërbejnë vetëm për
              ta ndjekur ankesën tuaj deri në përgjigje. Për asnjë qëllim tjetër,
              në asnjë rrethanë.
            </li>
            <li>
              <strong>Minimizim</strong> — merret vetëm ajo që është e
              domosdoshme; asgjë për çdo rast.
            </li>
            <li>
              <strong>Saktësi</strong> — çdo e dhënë e pasaktë korrigjohet sapo
              na e thoni.
            </li>
            <li>
              <strong>Kufizim i ruajtjes</strong> — nuk mbahen përgjithmonë (shih
              pikën 4).
            </li>
            <li>
              <strong>Integritet dhe konfidencialitet</strong> — mbrohen nga
              humbja dhe nga aksesi i paautorizuar.
            </li>
            <li>
              <strong>Llogaridhënie</strong> — përgjegjësia për zbatimin është
              jona dhe ne duhet ta provojmë atë.
            </li>
          </ul>

          <h2>2. Mbi çfarë baze përpunohen</h2>
          <p>
            Ligji lejon përpunimin vetëm kur ka një bazë të qartë. Ne
            mbështetemi në pëlqimin tuaj, të dhënë shprehimisht dhe të lirë, dhe
            në detyrën ligjore të deputetit për të shqyrtuar kërkesat e
            zgjedhësve. Pa pëlqimin tuaj, të dhënat nuk i përcillen askujt.
            Pëlqimin mund ta tërhiqni në çdo kohë, po aq lehtë sa e dhatë;
            tërheqja vlen për të ardhmen dhe nuk e cenon atë që është bërë
            ligjshëm përpara saj.
          </p>

          <h2>3. Konfidencialiteti dhe paanësia</h2>
          <p>
            Ligji i mbron veçanërisht të dhënat e ndjeshme — mes tyre bindjet
            politike, shëndeti dhe besimi fetar. Rregull absolut i kësaj zyre:
            mendimin politik ose përkatësinë partiake të qytetarit nuk e
            regjistrojmë kurrë, në asnjë formë. Halli shqyrtohet njësoj për të
            gjithë.
          </p>
          <p>
            Të dhënat tuaja i sheh vetëm personi që ka nevojë t&apos;i shohë për
            ta çuar përpara ankesën tuaj, dhe institucionit përgjegjës i shkon
            vetëm aq sa i duhet për t&apos;ju kthyer përgjigje. Askush tjetër.
          </p>
          <p>
            <strong>Ndihmësit teknikë.</strong> Për ta çuar ankesën tuaj te
            institucioni përdorim shërbime të kontraktuara që punojnë vetëm në
            emrin tonë, pa të drejtë t&apos;i përdorin të dhënat për vete: postën
            elektronike zyrtare, SMS-në e konfirmimit, një ndihmës të
            automatizuar që përgatit draftin e shkresës (ai sheh emrin tuaj,
            vendbanimin dhe përshkrimin e hallit; drafti kontrollohet gjithmonë
            nga një njeri para se të niset) dhe ruajtjen e enkriptuar të kopjes
            rezervë. Asnjëri nuk merr bindje politike apo të dhëna të tjera të
            ndjeshme, sepse ne nuk i regjistrojmë.
          </p>

          <h2>4. Siguria dhe sa kohë ruhen</h2>
          <p>
            Ligji kërkon masa teknike e organizative në përpjesëtim me rrezikun,
            dhe njoftim pa vonesë nëse ndodh një shkelje që rrezikon të drejtat
            tuaja. Ne mbajmë masat e duhura mbrojtëse, e kufizojmë aksesin te
            personat e autorizuar dhe e mbajmë të gjurmueshëm çdo shikim të
            dosjes suaj.
          </p>
          <p>
            Të dhënat që ju identifikojnë ruhen vetëm aq sa e kërkon qëllimi dhe
            afatet e parashikuara nga ligji:{" "}
            <strong>24 muaj pas mbylljes së ankesës</strong>. Pas kalimit të tyre
            asgjësohen — emri, telefoni, teksti i hallit dhe dokumentet hiqen —
            dhe mbetet vetëm informacion pa emër: shifra për statistikë dhe
            llogaridhënie publike.
          </p>

          <h2>5. Të drejtat tuaja (nenet 12–20)</h2>
          <p>
            Ligji ju jep të drejta që ne jemi të detyruar t&apos;i respektojmë:
          </p>
          <ul>
            <li>
              <strong>Të informoheni</strong> — të dini kush i përpunon të
              dhënat tuaja, pse dhe mbi çfarë baze.
            </li>
            <li>
              <strong>Akses</strong> — të dini çfarë kemi për ju dhe të merrni
              kopje.
            </li>
            <li>
              <strong>Korrigjim</strong> — të ndreqet çdo e dhënë e pasaktë ose e
              paplotë.
            </li>
            <li>
              <strong>Fshirje</strong> — të kërkoni heqjen e tyre kur nuk janë
              më të nevojshme ose kur tërhiqni pëlqimin.
            </li>
            <li>
              <strong>Kufizim</strong> — të ndalet përpunimi ndërkohë që një
              kërkesë juaja shqyrtohet.
            </li>
            <li>
              <strong>Kundërshtim</strong> — të kundërshtoni përpunimin për
              arsyet tuaja.
            </li>
            <li>
              <strong>Të mos i nënshtroheni një vendimi thjesht automatik</strong>{" "}
              — te ne çdo vendim për ankesën tuaj merret nga një njeri.
            </li>
          </ul>

          <h2>6. Si i ushtroni dhe ku ankoheni</h2>
          <p>
            Kërkesën mund t&apos;ia bëni gojarisht ndërmjetësit të zonës suaj në
            dëgjesë, ose me shkrim te{" "}
            <a
              href="mailto:privatesia@praniabesnike.al"
              className="font-medium text-brand underline underline-offset-2"
            >
              privatesia@praniabesnike.al
            </a>
            . Është falas dhe ju përgjigjemi brenda afatit ligjor.
          </p>
          <p>
            Nëse nuk jeni të kënaqur me përgjigjen tonë, keni të drejtë të
            ankoheni te Komisioneri për të Drejtën e Informimit dhe Mbrojtjen e
            të Dhënave Personale (
            <a
              href="https://idp.al"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand underline underline-offset-2"
            >
              idp.al
            </a>
            ), si dhe t&apos;i drejtoheni gjykatës.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
