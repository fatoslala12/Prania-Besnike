import { requireSession } from "@/lib/auth-helpers";
import { PanelNav } from "@/components/PanelNav";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-full flex-col bg-bg">
      <PanelNav user={{ name: session.user.name, role: session.user.role }} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 pb-24 sm:px-4 sm:py-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}
