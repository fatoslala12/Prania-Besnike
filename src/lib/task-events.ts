import { STATUS_LABELS } from "@/lib/constants";
import type {
  EventMeta,
  EventType,
  Role,
  TaskPatch,
  TaskRecord,
} from "@/lib/types";

export type EventDraft = { type: EventType; message: string; meta?: EventMeta };

export function createdEvents(
  task: Pick<
    TaskRecord,
    "number" | "isCitizenRequest" | "citizenName" | "orgUnit" | "assigneeId"
  >,
  assigneeName: string | null,
): EventDraft[] {
  const events: EventDraft[] = [
    {
      type: "CREATED",
      message: task.isCitizenRequest
        ? `Kërkesë qytetari u regjistrua${task.citizenName ? ` nga ${task.citizenName}` : ""} (${task.number})`
        : `Detyra ${task.number} u krijua`,
      meta: {
        number: task.number,
        orgUnit: task.orgUnit,
        assigneeId: task.assigneeId,
      },
    },
  ];
  if (task.orgUnit) {
    events.push({
      type: "ASSIGNED",
      message: `U delegua te ${task.orgUnit}`,
      meta: { orgUnit: task.orgUnit },
    });
  }
  if (task.assigneeId) {
    events.push({
      type: "ASSIGNED",
      message: `U caktua te personi ${assigneeName || "përdoruesi"}`,
      meta: { assigneeId: task.assigneeId, assigneeName },
    });
  }
  return events;
}

export function updateEvents(
  prev: TaskRecord,
  patch: TaskPatch,
  ctx: {
    actorName: string;
    actorRole: Role | null;
    prevAssigneeName: string | null;
    nextAssigneeName: string | null;
  },
): EventDraft[] {
  const events: EventDraft[] = [];

  if (patch.status !== undefined && patch.status !== prev.status) {
    const from = STATUS_LABELS[prev.status];
    const to = STATUS_LABELS[patch.status];
    events.push({
      type: "STATUS_CHANGED",
      message: `${ctx.actorName} ndryshoi statusin: ${from} → ${to}`,
      meta: {
        from: prev.status,
        to: patch.status,
        fromLabel: from,
        toLabel: to,
        actorRole: ctx.actorRole,
      },
    });
  }

  if (patch.orgUnit !== undefined && patch.orgUnit !== prev.orgUnit) {
    events.push({
      type: "ASSIGNED",
      message: patch.orgUnit
        ? prev.orgUnit
          ? `U ri-delegua: ${prev.orgUnit} → ${patch.orgUnit}`
          : `U delegua te ${patch.orgUnit}`
        : "U hoq delegimi te drejtoria/agjencia",
      meta: { orgUnit: patch.orgUnit, fromOrgUnit: prev.orgUnit },
    });
  }

  if (patch.assigneeId !== undefined && patch.assigneeId !== prev.assigneeId) {
    if (!patch.assigneeId) {
      events.push({
        type: "UNASSIGNED",
        message: "Caktimi individual u hoq",
        meta: { fromAssigneeId: prev.assigneeId },
      });
    } else {
      events.push({
        type: "ASSIGNED",
        message: ctx.prevAssigneeName
          ? `Ricaktim personi: ${ctx.prevAssigneeName} → ${ctx.nextAssigneeName || "—"}`
          : `U caktua te personi ${ctx.nextAssigneeName || "përdoruesi"}`,
        meta: {
          assigneeId: patch.assigneeId,
          assigneeName: ctx.nextAssigneeName,
          fromAssigneeId: prev.assigneeId,
        },
      });
    }
  }

  if (
    (patch.title !== undefined && patch.title !== prev.title) ||
    (patch.description !== undefined && patch.description !== prev.description)
  ) {
    events.push({
      type: "UPDATED",
      message: "Të dhënat e detyrës u përditësuan",
    });
  }

  return events;
}

export function commentEvent(content: string): EventDraft {
  return {
    type: "COMMENT_ADDED",
    message: `U shtua koment: «${content.slice(0, 80)}${content.length > 80 ? "…" : ""}»`,
  };
}

export function documentEvent(originalName: string): EventDraft {
  return {
    type: "DOCUMENT_UPLOADED",
    message: `U ngarkua dokumenti «${originalName}»`,
    meta: { filename: originalName },
  };
}

export function responseNumber(taskNumber: string, seq: number) {
  return `${taskNumber}-${seq}`;
}

const responseKind = (isFinal: boolean) => (isFinal ? "përfundimtare" : "e pjesshme");

export function responseEvent(number: string, orgUnit: string, isFinal: boolean): EventDraft {
  return {
    type: "RESPONSE_ADDED",
    message: `U lëshua përgjigjja ${responseKind(isFinal)} ${number} nga ${orgUnit}`,
    meta: { number, orgUnit, isFinal },
  };
}

export function responseUpdatedEvent(number: string, isFinal: boolean): EventDraft {
  return {
    type: "UPDATED",
    message: `U ndryshua përgjigjja ${number} (${responseKind(isFinal)})`,
    meta: { number, isFinal },
  };
}

export function emailEvent(docNumber: string, to: string, what: "kërkesës" | "përgjigjes"): EventDraft {
  return {
    type: "EMAIL_SENT",
    message: `Fleta e ${what} ${docNumber} u dërgua me email te ${to}`,
    meta: { number: docNumber, to },
  };
}

export function documentEmailEvent(originalName: string, to: string): EventDraft {
  return {
    type: "EMAIL_SENT",
    message: `Dokumenti «${originalName}» u dërgua me email te ${to}`,
    meta: { filename: originalName, to },
  };
}

/** Timestamps të njëpasnjëshme që renditja e historikut të jetë e qëndrueshme. */
export function eventTimes(count: number, base = Date.now()) {
  return Array.from({ length: count }, (_, i) => new Date(base + i));
}

export function canTaskBeSeenBy(
  task: Pick<TaskRecord, "assigneeId" | "orgUnit">,
  access: { id: string; orgUnit?: string | null },
) {
  return (
    task.assigneeId === access.id ||
    (!!access.orgUnit && task.orgUnit === access.orgUnit)
  );
}
