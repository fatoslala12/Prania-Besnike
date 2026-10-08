import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { accessOf, requireSession } from "@/lib/auth-helpers";
import { canAccessTask, canAssignTask, canRespond, isReadOnlyRole } from "@/lib/constants";
import { activeOrgUnitNames, getTaskDetail, listUsers } from "@/lib/repo";
import { TaskDetail } from "@/components/TaskDetail";

type Props = { params: Promise<{ id: string }> };

export default async function TaskPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;

  const task = await getTaskDetail(id);
  if (!task) notFound();
  if (!canAccessTask(accessOf(session), task)) redirect("/panel");

  const [allUsers, orgUnits] = await Promise.all([listUsers(), activeOrgUnitNames()]);
  const users = allUsers
    .filter((u) => !isReadOnlyRole(u.role))
    .filter((u) => canAssignTask(session.user.role) || u.orgUnit === task.orgUnit)
    .map((u) => ({ id: u.id, name: u.name, role: u.role, orgUnit: u.orgUnit }));

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
