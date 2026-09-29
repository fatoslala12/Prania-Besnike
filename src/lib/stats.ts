import type { DashboardStats, TaskRecord, TaskStatus } from "@/lib/types";

export function computeStats(
  tasks: Pick<
    TaskRecord,
    "id" | "status" | "orgUnit" | "assigneeId" | "isCitizenRequest" | "createdAt"
  >[],
  ctx: {
    docTaskIds: Set<string>;
    userNames: Map<string, string>;
    recentEvents: DashboardStats["recentEvents"];
    usersCount: number;
  },
): DashboardStats {
  const byStatus: Record<TaskStatus, number> = {
    I_RI: 0,
    NE_PROCES: 0,
    PERFUNDUAR: 0,
    BLOKUAR: 0,
  };
  const byUnit = new Map<string, number>();
  const byAssignee = new Map<string, number>();
  for (const t of tasks) {
    byStatus[t.status]++;
    const unit = t.orgUnit || "Pa njësi";
    byUnit.set(unit, (byUnit.get(unit) || 0) + 1);
    if (t.assigneeId) byAssignee.set(t.assigneeId, (byAssignee.get(t.assigneeId) || 0) + 1);
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      date: key,
      label: `${d.getDate()}.${d.getMonth() + 1}`,
      count: tasks.filter((t) => t.createdAt.slice(0, 10) === key).length,
    };
  });

  return {
    total: tasks.length,
    unassigned: tasks.filter((t) => !t.orgUnit && !t.assigneeId).length,
    citizen: tasks.filter((t) => t.isCitizenRequest).length,
    withDocs: tasks.filter((t) => ctx.docTaskIds.has(t.id)).length,
    byStatus,
    ministries: [...byUnit]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    byAssignee: [...byAssignee]
      .map(([id, count]) => ({ id, name: ctx.userNames.get(id) || "—", count }))
      .sort((a, b) => b.count - a.count),
    recentEvents: ctx.recentEvents,
    last7,
    usersCount: ctx.usersCount,
  };
}
