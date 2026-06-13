import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { logUnservedRequest } from "@/lib/data/actions";
import { userName } from "@/lib/data/selectors";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTimeIN } from "@/lib/format";
import { toast } from "sonner";
import { Inbox, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/common-requests")({ component: CommonRequests });

function CommonRequests() {
  const db = useDb();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [phone, setPhone] = useState("");

  const add = () => {
    if (!text.trim()) return toast.error("Describe what they asked for");
    logUnservedRequest(text.trim(), phone.trim(), user?.id ?? "u-md");
    setText(""); setPhone("");
    toast.success("Logged — helps decide what to stock next");
  };

  return (
    <>
      <PageHeader title="Common Requests" description="Products or services customers ask for that STG doesn't currently provide. Spot demand patterns." />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Plus className="h-4 w-4 text-muted-foreground" /> Log a request we couldn't serve</h2>
          <div className="space-y-3">
            <div className="grid gap-1.5"><Label>What did they ask for?</Label><Textarea rows={3} placeholder="e.g. Tower crane 40T" value={text} onChange={(e) => setText(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Their phone (optional)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <Button onClick={add} className="w-full">Log request</Button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
            {db.unserved.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Nothing logged yet.</div>
            ) : (
              <ul className="divide-y">
                {[...db.unserved].reverse().map((u) => (
                  <li key={u.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Inbox className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{u.text}</p>
                      <p className="text-xs text-muted-foreground">{u.phone || "no phone"} · {userName(db, u.loggedByUserId)} · {formatDateTimeIN(u.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
