import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { DevObject } from "@/lib/pm";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Start/stop timer that adds elapsed time to the object's actual hours. */
export function DevTimer({ object }: { object: DevObject }) {
  const queryClient = useQueryClient();
  const startedAt = object.timer_started_at ? new Date(object.timer_started_at).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  async function toggle() {
    setBusy(true);
    try {
      if (startedAt) {
        const hours = (Date.now() - startedAt) / 3_600_000;
        const total = Math.round((Number(object.actual_hours ?? 0) + hours) * 100) / 100;
        const { error } = await supabase
          .from("dev_objects")
          .update({ timer_started_at: null, actual_hours: total })
          .eq("id", object.id);
        if (error) throw error;
        toast.success(`Logged ${hours.toFixed(2)} h on ${object.object_code}`);
      } else {
        const { error } = await supabase
          .from("dev_objects")
          .update({
            timer_started_at: new Date().toISOString(),
            ...(object.status === "not_started" ? { status: "in_progress" as const } : {}),
          })
          .eq("id", object.id);
        if (error) throw error;
        toast.success(`Timer started for ${object.object_code}`);
      }
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {startedAt ? (
        <span className="font-mono text-xs tabular-nums text-primary">{fmt(now - startedAt)}</span>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant={startedAt ? "destructive" : "outline"}
        disabled={busy}
        onClick={toggle}
        aria-label={startedAt ? `Stop timer for ${object.object_code}` : `Start timer for ${object.object_code}`}
      >
        {startedAt ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
        {startedAt ? "Stop" : "Start"}
      </Button>
    </div>
  );
}
