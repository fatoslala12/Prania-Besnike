import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { accessOf, requireSession } from "@/lib/auth-helpers";
import { canAccessTask, canAssignTask, canRespond, isReadOnlyRole } from "@/lib/constants";
import { activeOrgUnitNames, findUserById, getTaskDetail, listUsers } from "@/lib/repo";
import { roleOptions } from "@/lib/user-roles";
import { RoleAutoSwitch } from "@/components/RoleChooser";
import { TaskDetail } from "@/components/TaskDetail";

type Props = { params: Promise<{ id: string }> };

export default async function TaskPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;

  const task = await getTaskDetail(id);
  if (!task) notFound();
  if (!canAccessTask(accessOf(session), task)) {
    const me = await findUserById(session.user.id);
    const other = me
      ? roleOptions(me).find(
          (o) => o.key !== session.user.roleKey && canAccessTask({ id: me.id, ...o }, task),
        )
      : null;
    if (other) return <RoleAutoSwitch option={other} />;
    redirect("/panel");
  }

  const [allUsers, orgUnits] = await Promise.all([listUsers(), activeOrgUnitNames()]);
  const users = allUsers.flatMap((u) => {
    const usable = roleOptions(u).filter((o) => !isReadOnlyRole(o.role));
    const pick = usable.find((o) => !!task.orgUnit && o.orgUnit === task.orgUnit) ?? usable[0];
    if (!pick || !(canAssignTask(session.user.role) || pick.orgUnit === task.orgUnit)) return [];
    return [{ id: u.id, name: u.name, role: pick.role, orgUnit: pick.orgUnit }];
  });

  return (
    <div>
      <Link
        href="/panel"
        className="text-sm font-medium text-brand underline underline-offset-4"
      >
        ← Kthehu te detyrat
      </Link>
      <div className="mt-4">
        <TaskDetail
          task={task}
          users={users}
          orgUnits={orgUnits}
          role={session.user.role}
          canDelete={session.user.role === "ADMIN"}
          canRespond={canRespond(accessOf(session), task)}
        />
      </div>
    </div>
  );
}
