import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { canManageUsers } from "@/lib/constants";
import { listAllUsers, listOrgUnits } from "@/lib/repo";
import { AdminTabs } from "@/components/AdminTabs";
import { UsersManager } from "@/components/UsersManager";

export const metadata = { title: "Përdoruesit" };

export default async function UsersPage() {
  const session = await requireSession();
  if (!canManageUsers(session.user.role)) redirect("/panel");

  const [users, orgUnits] = await Promise.all([listAllUsers(), listOrgUnits()]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Përdoruesit</h1>
          <p className="mt-1 text-sm text-muted">
            Roli + drejtoria/agjencia për akses te detyrat e deleguara.
          </p>
        </div>
        <AdminTabs active="users" />
      </div>
      <div className="mt-6">
        <UsersManager
          initialUsers={users}
          orgUnits={orgUnits.map((o) => ({ name: o.name, active: o.active }))}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
