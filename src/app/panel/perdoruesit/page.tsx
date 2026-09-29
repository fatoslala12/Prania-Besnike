import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { canManageUsers } from "@/lib/constants";
import { listUsers } from "@/lib/repo";
import { UsersManager } from "@/components/UsersManager";

export const metadata = { title: "Përdoruesit" };

export default async function UsersPage() {
  const session = await requireSession();
  if (!canManageUsers(session.user.role)) redirect("/panel");

  const users = (await listUsers()).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    orgUnit: u.orgUnit,
  }));

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
        Përdoruesit
      </h1>
      <p className="mt-1 text-sm text-muted">
        Roli + drejtoria/agjencia për akses te detyrat e deleguara.
      </p>
      <div className="mt-6">
        <UsersManager initialUsers={users} />
      </div>
    </div>
  );
}
