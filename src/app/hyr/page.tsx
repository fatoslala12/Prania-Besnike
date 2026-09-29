import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { LoginForm } from "@/components/LoginForm";
import { auth } from "@/auth";
import { isLocalMode } from "@/lib/repo";
import Link from "next/link";

export const metadata = {
  title: "Hyr",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/panel");

  return (
    <div className="flex min-h-full flex-col hero-wash">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12">
        <BrandMark size="md" align="center" />

        <div className="surface-card mt-8 w-full p-6 md:p-8">
          <h2 className="text-2xl font-extrabold">Hyni</h2>
          <div className="mt-6">
            <Suspense fallback={<p className="text-sm text-muted">Duke ngarkuar...</p>}>
              <LoginForm showDemo={isLocalMode()} />
            </Suspense>
          </div>
        </div>

        <div className="mt-10 space-y-2 text-center">
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-brand">
            BESIM | EMPATI | SHËRBIM | ANGAZHIM
          </p>
          <p className="text-sm text-ink/80">
            Prania Besnike · MSHMS · Asnjë qytetar pa përgjigje.
          </p>
          <Link
            href="/mbrojtja-e-te-dhenave"
            className="inline-block text-sm font-medium text-brand underline underline-offset-4"
          >
            Mbrojtja e të dhënave
          </Link>
        </div>
      </div>
      <footer className="px-4 pb-6 text-center">
        <DeveloperCredit />
      </footer>
    </div>
  );
}
