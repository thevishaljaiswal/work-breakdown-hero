import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/pm";

const STATUS_CLASS: Record<string, string> = {
  not_started: "bg-status-not-started text-status-not-started-foreground",
  in_progress: "bg-status-in-progress text-status-in-progress-foreground",
  on_hold: "bg-status-on-hold text-status-on-hold-foreground",
  completed: "bg-status-completed text-status-completed-foreground",
  cancelled: "bg-status-cancelled text-status-cancelled-foreground",
};

/** Status pill whose background encodes the status — used in every report/list. */
export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const value = status ?? "";
  const tone = STATUS_CLASS[value] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone,
        className,
      )}
    >
      {value ? statusLabel(value) : "—"}
    </span>
  );
}
