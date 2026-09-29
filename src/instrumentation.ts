export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.REMINDERS === "off") return;
  const { startReminderScheduler } = await import("@/lib/reminders");
  startReminderScheduler();
}
