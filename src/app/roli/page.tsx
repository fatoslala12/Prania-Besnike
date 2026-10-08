import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { RoleChooser } from "@/components/RoleChooser";
import { SignOutButton } from "@/components/SignOutButton";
import { requireSession } from "@/lib/auth-helpers";
import { findUserById } from "@/lib/repo";
import { roleOptions } from "@/lib/user-roles";

export const metadata = { title: "Zgjidhni rolin" };

type Props = { searchParams: Promise<{ next?: string }> };

function safeNext(next: string | undefined) {
  return next && /^\/panel(\/|$|\?)/.test(next) && !next.startsWith("//") ? next : "/panel";
}

export default async function RolePage({ searchParams }: Props) {
  const session = await requireSession();
  const next = safeNext((await searchParams).next);
  if (session.user.mustChangePassword) redirect("/panel");

  const user = await findUserById(session.user.id);
  if (!user) redirect("/hyr");
  const options = roleOptions(user);
  if (options.length === 1) redirect(next);

  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex min-h-full flex-col hero-wash">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12">
        <BrandMark size="md" align="center" />

        <div className="surface-card mt-8 w-full p-6 md:p-8">
          <h1 className="text-2xl font-extrabold">Zgjidhni rolin</h1>
          <p className="mt-1.5 text-sm text-muted">
            Përshëndetje {firstName}. Llogaria juaj ka {options.length} role. Zgjidhni me cilin do të
            punoni — mund ta ndërroni kurdo me «Ndërro rolin» lart në panel.
          </p>
          <div className="mt-6">
            <RoleChooser
              options={options}
              currentKey={session.user.needsRole ? null : session.user.roleKey}
              next={next}
            />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
            {session.user.needsRole ? (
              <span className="text-muted">Njoftimet ju vijnë për të gjitha rolet.</span>
            ) : (
              <Link href={next} className="font-semibold text-brand underline underline-offset-4">
                ← Kthehu pa ndërruar
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>
      <footer className="px-4 pb-6 text-center">
        <DeveloperCredit />
      </footer>
    </div>
  );
}
