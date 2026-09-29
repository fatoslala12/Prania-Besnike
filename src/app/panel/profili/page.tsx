import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { ROLE_LABELS } from "@/lib/constants";
import { getUser } from "@/lib/repo";
import { ProfileSettings } from "@/components/ProfileSettings";

export const metadata = { title: "Profili im" };

export default async function ProfilePage() {
  const session = await requireSession();
  const user = await getUser(session.user.id);
  if (!user) redirect("/hyr");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Profili im</h1>
      <p className="mt-1 text-sm text-muted">
        {user.name} · {ROLE_LABELS[user.role]}
        {user.orgUnit ? ` · ${user.orgUnit}` : ""}
      </p>
      <div className="mt-6">
        <ProfileSettings
          username={user.username}
          email={user.email}
          emailNotifications={user.emailNotifications}
        />
      </div>
    </div>
  );
}
