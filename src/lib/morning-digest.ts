import { getDb, mutate, newId } from "@/lib/data/store";

/**
 * Daily morning digest — in-app notification for every executive listing today's
 * pending follow-ups. Fires once per user per day on first store hydration.
 *
 * Tracks last-sent date per user in sessionStorage so it only fires once daily,
 * even across page refreshes within the same session.
 */

const DIGEST_KEY = "stg_morning_digest";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function digestSentForUser(userId: string): boolean {
  try {
    const stored = sessionStorage.getItem(`${DIGEST_KEY}_${userId}`);
    return stored === todayDate();
  } catch {
    return false;
  }
}

function markDigestSent(userId: string) {
  try {
    sessionStorage.setItem(`${DIGEST_KEY}_${userId}`, todayDate());
  } catch {}
}

export function fireMorningDigest() {
  const db = getDb();
  const today = todayDate();

  for (const user of db.users) {
    if (user.role !== "exec") continue;
    if (digestSentForUser(user.id)) continue;

    const userLeads = db.leads.filter(
      (l) =>
        l.assignedToUserId === user.id && l.status !== "not_interested" && l.status !== "dormant",
    );
    const leadIds = new Set(userLeads.map((l) => l.id));

    const pendingFollowUps = db.followUps.filter((f) => !f.done && leadIds.has(f.leadId));

    if (pendingFollowUps.length === 0) continue;

    const followUpDetails = pendingFollowUps
      .slice(0, 5)
      .map((f) => {
        const lead = userLeads.find((l) => l.id === f.leadId);
        const name = lead?.name ?? "Unknown";
        const time = new Date(f.dueAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `${name} — ${time}`;
      })
      .join("\n");

    const totalMsg =
      pendingFollowUps.length > 5
        ? `${followUpDetails}\n… and ${pendingFollowUps.length - 5} more`
        : followUpDetails;

    mutate((draft) => {
      draft.notifications.push({
        id: newId("notif"),
        userId: user.id,
        type: "morning_digest",
        title: "Good morning — pending follow-ups",
        message: `You have ${pendingFollowUps.length} follow-up${pendingFollowUps.length > 1 ? "s" : ""} pending today:\n${totalMsg}`,
        priority: "normal",
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    markDigestSent(user.id);
  }
}
