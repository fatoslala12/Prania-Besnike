import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { canManageUsers } from "@/lib/constants";
import { listOrgUnits, orgUnitUsage } from "@/lib/repo";
import { AdminTabs } from "@/components/AdminTabs";
import { OrgUnitsManager } from "@/components/OrgUnitsManager";

export const metadata = { title: "Drejtoritë" };

export default async function OrgUnitsPage() {
  const session = await requireSession();
  if (!canManageUsers(session.user.role)) redirect("/panel");

  const [units, usage] = await Promise.all([listOrgUnits(), orgUnitUsage()]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Drejtoritë</h1>
          <p className="mt-1 text-sm text-muted">
            Drejtoritë dhe agjencitë që shfaqen në formularin e qytetarit dhe në delegim.
          </p>
        </div>
        <AdminTabs active="units" />
      </div>
      <div className="mt-6">
        <OrgUnitsManager
          initialUnits={units}
          usage={Object.fromEntries(
            units.map((u) => [u.name, usage[u.name] ?? { users: 0, tasks: 0, openTasks: 0 }]),
          )}
        />
      </div>
    </div>
  );
}
