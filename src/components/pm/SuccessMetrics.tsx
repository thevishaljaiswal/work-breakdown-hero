import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Target } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordDialog, type FieldSpec } from "@/components/pm/RecordDialog";
import { STATUS_OPTIONS, fetchSuccessMetrics, statusLabel } from "@/lib/pm";

const metricFields: FieldSpec[] = [
  { name: "kpi", label: "KPI", type: "text", required: true, placeholder: "Bill creation time", span: "half" },
  { name: "target", label: "Target", type: "text", required: true, placeholder: "< 5 minutes", span: "half" },
  { name: "actual", label: "Current / actual", type: "text", placeholder: "6 minutes", span: "half" },
  { name: "category", label: "Category", type: "text", placeholder: "Efficiency", span: "half" },
  { name: "owner", label: "Owner", type: "text", span: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "not_started", span: "half" },
];

const SUGGESTIONS: { kpi: string; target: string; category: string }[] = [
  { kpi: "Bill creation time", target: "< 5 minutes", category: "Efficiency" },
  { kpi: "Approval turnaround", target: "< 24 hours", category: "Efficiency" },
  { kpi: "SAP posting success", target: "> 99%", category: "Reliability" },
  { kpi: "Duplicate bills", target: "0", category: "Quality" },
  { kpi: "Document retrieval", target: "< 5 seconds", category: "Performance" },
  { kpi: "Dashboard load time", target: "< 3 seconds", category: "Performance" },
  { kpi: "User adoption", target: "> 95%", category: "Adoption" },
  { kpi: "SLA compliance", target: "> 98%", category: "Service" },
  { kpi: "Payment delay reduction", target: "50%", category: "Business impact" },
  { kpi: "Manual effort reduction", target: "70%", category: "Business impact" },
];

export function SuccessMetrics({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const metrics = useQuery({
    queryKey: ["success-metrics", projectId],
    queryFn: () => fetchSuccessMetrics(projectId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["success-metrics", projectId] });

  const payload = (values: Record<string, string>) => ({
    kpi: values.kpi,
    target: values.target,
    actual: values.actual || null,
    category: values.category || null,
    owner: values.owner || null,
    status: (values.status || "not_started") as never,
  });

  const addMetric = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase
        .from("success_metrics")
        .insert({ project_id: projectId, ...payload(values) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("KPI added");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMetric = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase.from("success_metrics").update(payload(values)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("KPI updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const seedSuggestions = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("success_metrics").insert(
        SUGGESTIONS.map((s, index) => ({
          project_id: projectId,
          kpi: s.kpi,
          target: s.target,
          category: s.category,
          sort_order: index,
        })),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Standard KPI set added");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const list = metrics.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Success metrics</h2>
        </div>
        <div className="flex items-center gap-2">
          {list.length === 0 ? (
            <Button
              variant="outline"
              disabled={seedSuggestions.isPending}
              onClick={() => seedSuggestions.mutate()}
            >
              Add standard KPI set
            </Button>
          ) : null}
          <RecordDialog
            title="New KPI"
            description="Define a KPI with the target it must meet, e.g. Bill creation time < 5 minutes."
            fields={metricFields}
            submitLabel="Add KPI"
            onSubmit={(values) => addMetric.mutateAsync(values)}
            trigger={
              <Button>
                <Plus className="size-4" /> Add KPI
              </Button>
            }
          />
        </div>
      </div>

      {metrics.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading KPIs…</p>
      ) : list.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No KPIs yet. Add your own or load the standard set (bill creation time, approval
            turnaround, SAP posting success and more).
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {list.map((metric) => (
            <article key={metric.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {metric.category ? (
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {metric.category}
                    </p>
                  ) : null}
                  <h3 className="mt-0.5 font-medium">{metric.kpi}</h3>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                    {metric.target}
                  </p>
                </div>
                <RecordDialog
                  title={`Edit ${metric.kpi}`}
                  fields={metricFields}
                  submitLabel="Save changes"
                  initialValues={metric}
                  onSubmit={(values) => updateMetric.mutateAsync({ id: metric.id, values })}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Edit ${metric.kpi}`} className="size-8">
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">
                  {statusLabel(metric.status)}
                </Badge>
                <span>Actual: {metric.actual || "—"}</span>
                <span>· Owner: {metric.owner || "—"}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
