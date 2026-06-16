import { getDb, mutate } from "@/lib/data/store";
import { newId } from "@/lib/data/store";

/**
 * Escalation engine.
 *
 * Polls every 60 seconds and checks for leads that need attention:
 *
 *   1. NEW lead, no action for 4 h       → notify company admin
 *   2. NEW lead, no action for 24 h      → notify MD
 *   3. needsManualRouting, no action 4 h → escalate to company admin
 *   4. needsManualRouting, no action 24 h → escalate to MD
 *
 * Every lead is tracked by its id in a Set so we only fire each escalation once.
 */

const CHECK_INTERVAL = 60_000; // 60 s
const FOUR_HOURS = 4 * 3_600_000;
const ONE_DAY = 24 * 3_600_000;

const firedEscalations = new Set<string>();

let timer: ReturnType<typeof setInterval> | undefined;

function key(leadId: string, level: string) {
  return `${leadId}::${level}`;
}

function tick() {
  const db = getDb();
  const now = Date.now();

  for (const lead of db.leads) {
    const age = now - new Date(lead.createdAt).getTime();

    // 1. NEW lead, 4 h → admin
    if (lead.status === "new" && age >= FOUR_HOURS && age < ONE_DAY) {
      const k = key(lead.id, "new-4h");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        notifyAdmin(
          lead,
          `Lead "${lead.name}" has been in "New" status for over 4 hours. No action taken yet.`,
        );
      }
    }

    // 2. NEW lead, 24 h → MD
    if (lead.status === "new" && age >= ONE_DAY) {
      const k = key(lead.id, "new-24h");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        notifyMd(
          lead,
          `Lead "${lead.name}" has been in "New" status for over 24 hours. Escalated to MD.`,
        );
      }
    }

    // 3. needsManualRouting, 4 h → admin
    if (lead.needsManualRouting && age >= FOUR_HOURS && age < ONE_DAY) {
      const k = key(lead.id, "route-4h");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        notifyAdmin(
          lead,
          `Lead "${lead.name}" needs manual routing and has been unactioned for over 4 hours.`,
        );
      }
    }

    // 4. needsManualRouting, 24 h → MD
    if (lead.needsManualRouting && age >= ONE_DAY) {
      const k = key(lead.id, "route-24h");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        notifyMd(
          lead,
          `Lead "${lead.name}" needs manual routing and has been unactioned for over 24 hours. MD attention required.`,
        );
      }
    }
  }

  // ── Smart callback notifications: fire when callback time is reached
  const ONE_HOUR = 3_600_000;
  for (const fu of db.followUps) {
    if (fu.done) continue;
    if (!fu.callbackAt) continue;
    const cbTime = new Date(fu.callbackAt).getTime();
    if (Number.isNaN(cbTime)) continue;
    const elapsed = now - cbTime;
    if (elapsed >= 0 && elapsed < ONE_HOUR) {
      const k = key(fu.id, "callback-due");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        const lead = db.leads.find((l) => l.id === fu.leadId);
        if (lead && lead.assignedToUserId) {
          mutate((draft) => {
            draft.notifications.push({
              id: newId("notif"),
              userId: lead.assignedToUserId!,
              type: "callback_reminder",
              title: "Callback time — follow-up due",
              message: `Scheduled callback for "${lead.name}" is due now. ${fu.reason ? `Reason: ${fu.reason}` : ""}`,
              priority: "high",
              read: false,
              linkTo: `/leads/${lead.id}`,
              createdAt: new Date().toISOString(),
            });
          });
        }
      }
    }
  }

  // ── Missed follow-up escalation (Phase 3): 1d → handler, 3d → admin, 7d → MD/high-risk
  for (const fu of db.followUps) {
    if (fu.done) continue;
    const due = new Date(fu.callbackAt ?? fu.dueAt).getTime();
    if (Number.isNaN(due) || due >= now) continue; // not overdue yet
    const overdue = now - due;
    const lead = db.leads.find((l) => l.id === fu.leadId);
    if (!lead) continue;

    if (overdue >= ONE_DAY && overdue < 3 * ONE_DAY) {
      const k = key(fu.id, "fu-1d");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        notifyHandler(lead, `Follow-up for "${lead.name}" is 1+ day overdue. Please call back.`);
      }
    } else if (overdue >= 3 * ONE_DAY && overdue < 7 * ONE_DAY) {
      const k = key(fu.id, "fu-3d");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        notifyAdmin(
          lead,
          `Follow-up for "${lead.name}" is 3+ days overdue. Handler has not actioned it.`,
        );
      }
    } else if (overdue >= 7 * ONE_DAY) {
      const k = key(fu.id, "fu-7d");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        notifyMd(
          lead,
          `HIGH RISK: follow-up for "${lead.name}" is 7+ days overdue. Flagged for MD review.`,
        );
      }
    }
  }

  // ── Quotation validity expiry automation (Phase 6)
  //   2 days before → reminder, 1 day before → reminder, on/after validity → expire + notify.
  for (const q of db.quotations) {
    if (q.status !== "sent") continue;
    const valid = new Date(q.validityDate).getTime();
    if (Number.isNaN(valid)) continue;
    const lead = db.leads.find((l) => l.id === q.leadId);
    if (!lead) continue;
    const msLeft = valid - now;
    const daysLeft = Math.ceil(msLeft / ONE_DAY);

    if (msLeft <= 0) {
      const k = key(q.id, "quote-expired");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        mutate((draft) => {
          const target = draft.quotations.find((x) => x.id === q.id);
          if (target && target.status === "sent") target.status = "expired";
          draft.activities.push({
            id: newId("a"),
            leadId: q.leadId,
            at: new Date().toISOString(),
            byUserId: lead.assignedToUserId ?? "u-md",
            kind: "quotation",
            text: `Quotation ${q.quotationNo} v${q.version} expired on ${q.validityDate} — auto-marked expired.`,
          });
        });
        notifyHandler(lead, `Quotation ${q.quotationNo} v${q.version} has expired. Revise or follow up.`);
      }
    } else if (daysLeft === 1) {
      const k = key(q.id, "quote-1d");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        notifyHandler(lead, `Quotation ${q.quotationNo} v${q.version} expires tomorrow — follow up now.`);
      }
    } else if (daysLeft === 2) {
      const k = key(q.id, "quote-2d");
      if (!firedEscalations.has(k)) {
        firedEscalations.add(k);
        notifyHandler(lead, `Quotation ${q.quotationNo} v${q.version} expires in 2 days — follow up.`);
      }
    }
  }
}

function notifyHandler(
  lead: { id: string; name: string; assignedToUserId: string | null },
  message: string,
) {
  if (!lead.assignedToUserId) return;
  mutate((draft) => {
    draft.notifications.push({
      id: newId("notif"),
      userId: lead.assignedToUserId as string,
      type: "followup_reminder",
      title: "Follow-up overdue",
      message,
      priority: "high",
      read: false,
      linkTo: `/leads/${lead.id}`,
      createdAt: new Date().toISOString(),
    });
  });
}

function notifyAdmin(lead: { id: string; name: string; companyId: string }, message: string) {
  const db = getDb();
  const admins = db.users.filter((u) => u.role === "super_admin" || u.companyId === lead.companyId);
  for (const admin of admins) {
    mutate((draft) => {
      draft.notifications.push({
        id: newId("notif"),
        userId: admin.id,
        type: "escalation",
        title: "Lead escalation — 4 hours",
        message,
        priority: "urgent",
        read: false,
        linkTo: `/leads/${lead.id}`,
        createdAt: new Date().toISOString(),
      });
    });
  }
}

function notifyMd(lead: { id: string; name: string }, message: string) {
  const db = getDb();
  const mds = db.users.filter(
    (u) => u.title?.toLowerCase().includes("md") || u.role === "super_admin",
  );
  for (const md of mds) {
    mutate((draft) => {
      draft.notifications.push({
        id: newId("notif"),
        userId: md.id,
        type: "escalation",
        title: "Lead escalation — 24 hours",
        message,
        priority: "urgent",
        read: false,
        linkTo: `/leads/${lead.id}`,
        createdAt: new Date().toISOString(),
      });
    });
  }
}

/** Start the escalation checker. */
export function startEscalationEngine() {
  stopEscalationEngine();
  // Fire immediately once, then every 60 s
  tick();
  timer = setInterval(tick, CHECK_INTERVAL);
}

/** Stop the escalation checker. */
export function stopEscalationEngine() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}
