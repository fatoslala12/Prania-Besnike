import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { canCreateTask } from "@/lib/constants";
import { NewTaskForm } from "@/components/NewTaskForm";

export const metadata = { title: "Detyrë e re" };

export default async function NewTaskPage() {
  const session = await requireSession();
  if (!canCreateTask(session.user.role)) redirect("/panel");

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
        Detyrë e re
      </h1>
      <p className="mt-1 text-sm text-muted">
        Delegoni te drejtoria/agjencia — të gjithë përdoruesit e saj e shohin dhe e trajtojnë.
      </p>
      <div className="mt-6">
        <NewTaskForm />
      </div>
    </div>
  );
}
