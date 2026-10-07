import { requireSession } from "@/lib/auth-helpers";
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

  return (
    <div className="flex min-h-full flex-col bg-bg">
      <PanelNav user={{ name: session.user.name, role: session.user.role }} />
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
