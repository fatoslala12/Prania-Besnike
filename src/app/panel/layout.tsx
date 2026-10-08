import { Eye } from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { isReadOnlyRole } from "@/lib/constants";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { ForcePasswordChange } from "@/components/ForcePasswordChange";
import { PanelNav } from "@/components/PanelNav";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  if (session.user.mustChangePassword) {
    return <ForcePasswordChange name={session.user.name} username={session.user.username} />;
  }

  const orgUnit = session.user.orgUnit ?? null;

  return (
    <div className="flex min-h-full flex-col bg-bg">
      <PanelNav user={{ name: session.user.name, role: session.user.role, orgUnit }} />
      {isReadOnlyRole(session.user.role) && (
        <div className="border-b border-sky-200 bg-sky-50 px-3 py-2 text-center text-xs text-sky-900 sm:px-4 sm:text-sm print:hidden">
          <Eye className="mr-1.5 inline h-4 w-4 align-[-3px]" aria-hidden="true" />
          <span className="font-semibold">Vetëm shikim</span>
          {" · "}
          {orgUnit ? `Shihni kërkesat e ${orgUnit}` : "Shihni kërkesat e gjithë sistemit"}, por nuk mund të
          ndryshoni asgjë.
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-4 sm:py-8">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-3 pb-24 pt-2 text-center sm:px-4 md:pb-6">
        <div className="border-t border-line pt-4">
          <DeveloperCredit />
        </div>
      </footer>
    </div>
  );
}
