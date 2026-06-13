import { useSyncExternalStore } from "react";
import { getSaveStatus, subscribeSaveStatus } from "@/lib/data/store";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, Loader2, Check } from "lucide-react";

export function SaveIndicator() {
  const status = useSyncExternalStore(subscribeSaveStatus, getSaveStatus, getSaveStatus);

  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
        status === "saving" && "bg-muted text-muted-foreground",
        status === "saved" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        status === "error" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      )}
    >
      {status === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
      {status === "saved"  && <><Check className="h-3 w-3" /> Saved</>}
      {status === "error"  && <><CloudOff className="h-3 w-3" /> Save failed</>}
    </div>
  );
}
