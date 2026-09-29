import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/5 bg-white py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-center">
        <BrandMark size="md" align="center" />
        <p className="text-sm text-ink/80">
          Prania Besnike · MSHMS · Asnjë qytetar pa përgjigje.
        </p>
        <Link
          href="/mbrojtja-e-te-dhenave"
          className="text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-dark"
        >
          Mbrojtja e të dhënave
        </Link>
      </div>
    </footer>
  );
}
