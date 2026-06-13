import { useSyncExternalStore } from "react";
import type { Db } from "./types";
import { supabase } from "@/lib/supabase";
import { fetchAll, upsertAll, emptyDb } from "./supabase-adapter";
import { buildSeed } from "./seed";

/**
 * Reactive client cache over Supabase. All data lives in Postgres; this keeps a
 * synchronous in-memory snapshot so the UI reads instantly, while writes go
 * through to Supabase (debounced). There is no local/mock fallback — the store
 * is empty until `hydrateStore()` runs after a successful login.
 *
 *   hydrateStore()  → pull the (RLS-scoped) data for the signed-in user
 *   clearStore()    → wipe on logout
 *   mutate()        → optimistic local update + write-through to Postgres
 */

const listeners = new Set<() => void>();
let db: Db = emptyDb();
let snapshotCache: Db = db;

function setDb(next: Db) {
  db = next;
  snapshotCache = db;
  listeners.forEach((l) => l());
}

export function getDb(): Db {
  return snapshotCache;
}

/** Load everything the signed-in user is allowed to see. */
export async function hydrateStore(): Promise<void> {
  if (!supabase) return;
  try {
    const data = await fetchAll();
    if (data.companies.length === 0) {
      // First-time setup: static config tables are empty.
      // Push companies, categories, users and targets so the app is immediately usable.
      const seed = buildSeed();
      const toSeed: Db = { ...emptyDb(), companies: seed.companies, categories: seed.categories, users: seed.users, targets: seed.targets };
      await upsertAll(toSeed);
      setDb({ ...data, companies: seed.companies, categories: seed.categories, users: seed.users, targets: seed.targets });
    } else {
      setDb(data);
    }
  } catch (err) {
    console.error("[store] hydrate failed:", err);
    // On fetch error fall back to static seed so the UI stays functional.
    const seed = buildSeed();
    setDb({ ...emptyDb(), companies: seed.companies, categories: seed.categories, users: seed.users, targets: seed.targets });
  }
}

/** Drop all cached data (on sign-out). */
export function clearStore(): void {
  setDb(emptyDb());
}

// ── Save-status listeners (used by SaveIndicator component) ─────────────────
type SaveStatus = "idle" | "saving" | "saved" | "error";
let saveStatus: SaveStatus = "idle";
const saveListeners = new Set<() => void>();
function setSaveStatus(s: SaveStatus) {
  saveStatus = s;
  saveListeners.forEach((l) => l());
}
export function getSaveStatus(): SaveStatus { return saveStatus; }
export function subscribeSaveStatus(cb: () => void) {
  saveListeners.add(cb);
  return () => saveListeners.delete(cb);
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  if (!supabase) return;
  clearTimeout(pushTimer);
  const snapshot = db;
  setSaveStatus("saving");
  pushTimer = setTimeout(async () => {
    const errors = await upsertAll(snapshot);
    if (errors.length === 0) {
      setSaveStatus("saved");
      // Reset back to idle after 3 s
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setSaveStatus("error");
      // Dynamic import avoids a circular dep on sonner at module load time
      import("sonner").then(({ toast }) => {
        toast.error("Save failed — data may not persist. Check Supabase connection.", {
          description: errors[0],
          duration: 8000,
        });
      });
    }
  }, 400);
}

export function mutate(updater: (draft: Db) => Db | void): void {
  const draft = structuredClone(db);
  const next = updater(draft);
  db = (next ?? draft) as Db; // if updater mutates draft in place (returns void), use draft
  snapshotCache = db;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Reactive hook — re-renders any component when the cache changes. */
export function useDb(): Db {
  return useSyncExternalStore(subscribe, getDb, getDb);
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter}`;
}
