import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/pm/StatusBadge";
import { RecordDialog, type FieldSpec } from "@/components/pm/RecordDialog";
import { supabase } from "@/integrations/supabase/client";
import { DeleteButton } from "@/components/pm/DeleteButton";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  deleteTestCase,
  deleteUserStory,
  fetchTraceability,
  priorityLabel,
  statusLabel,
  type TraceabilityRow,
} from "@/lib/pm";

const ROW_FIELDS: FieldSpec[] = [
  { name: "requirement_id", label: "Requirement ID", type: "text", placeholder: "RQ-101", span: "half" },
  { name: "story_code", label: "User Story ID", type: "text", placeholder: "US-101", span: "half" },
  { name: "story", label: "User Story", type: "textarea", required: true },
  { name: "acceptance_criteria", label: "Acceptance Criteria", type: "textarea" },
  { name: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS, span: "half" },
  { name: "test_case_id", label: "Test Case ID", type: "text", placeholder: "TC-103", span: "half" },
  { name: "test_scenario", label: "Test Scenario", type: "textarea", placeholder: "Duplicate Vendor Validation" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, span: "half" },
];

const STORY_ONLY_FIELDS = ROW_FIELDS.filter(
  (f) => !["test_case_id", "test_scenario"].includes(f.name),
);

export function TraceabilityMatrix({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const rows = useQuery({
    queryKey: ["traceability", projectId],
    queryFn: () => fetchTraceability(projectId),
  });

  const updateRow = useMutation({
    mutationFn: async ({ row, values }: { row: TraceabilityRow; values: Record<string, string> }) => {
      const { error: storyError } = await supabase
        .from("user_stories")
        .update({
          story_code: values.story_code || row.story_code,
          story: values.story,
        })
        .eq("id", row.story_id);
      if (storyError) throw storyError;

      if (row.requirement_row_id) {
        const { error: reqError } = await supabase
          .from("story_requirements")
          .update({
            requirement_id: values.requirement_id || row.requirement_id,
            acceptance_criteria: values.acceptance_criteria || null,
            priority: (values.priority || "medium") as never,
            ...(row.task_id ? {} : { status: (values.status || "not_started") as never }),
          })
          .eq("id", row.requirement_row_id);
        if (reqError) throw reqError;
      }

      if (row.task_id) {
        const { error: taskError } = await supabase
          .from("story_tasks")
          .update({
            test_case_id: values.test_case_id || null,
            test_scenario: values.test_scenario || null,
            status: (values.status || "not_started") as never,
          })
          .eq("id", row.task_id);
        if (taskError) throw taskError;
      }
    },
    onSuccess: () => {
      toast.success("Traceability row updated");
      queryClient.invalidateQueries({ queryKey: ["traceability", projectId] });
      queryClient.invalidateQueries({ queryKey: ["sprint-backlog"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeRow = useMutation({
    mutationFn: (row: TraceabilityRow) =>
      row.task_id ? deleteTestCase(row.task_id) : deleteUserStory(row.story_id),
    onSuccess: () => {
      toast.success("Traceability row deleted");
      queryClient.invalidateQueries({ queryKey: ["traceability", projectId] });
      queryClient.invalidateQueries({ queryKey: ["sprint-backlog"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = rows.data ?? [];

  if (rows.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading traceability matrix…</p>;
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nothing to trace yet. Add user stories and test cases in Sprint planning — they appear
          here automatically, linked by Requirement ID.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="p-3 font-medium">User Story</th>
            <th className="p-3 font-medium">Requirement</th>
            <th className="p-3 font-medium">Test Case</th>
            <th className="p-3 font-medium">Priority</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium sr-only">Edit</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-border/60 align-top last:border-0">
              <td className="p-3">
                <span className="font-mono text-xs text-muted-foreground">{row.story_code}</span>
                <p className="mt-0.5">{row.story}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{row.sprint_name}</p>
              </td>
              <td className="p-3">
                <span className="font-mono text-xs text-primary">{row.requirement_id}</span>
                <p className="mt-0.5 whitespace-pre-line text-muted-foreground">
                  {row.acceptance_criteria || "—"}
                </p>
              </td>
              <td className="p-3">
                <span className="font-mono text-xs">{row.test_case_id}</span>
                <p className="mt-0.5 whitespace-pre-line text-muted-foreground">
                  {row.test_scenario || "—"}
                </p>
              </td>
              <td className="p-3">
                {row.priority === "—" ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    {priorityLabel(row.priority)}
                  </Badge>
                )}
              </td>
              <td className="p-3">
                <StatusBadge status={row.status} />
              </td>

              <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-1">
                <RecordDialog
                  title={`Edit ${row.requirement_id}`}
                  description="Update the requirement, user story and linked test case."
                  fields={row.task_id ? ROW_FIELDS : STORY_ONLY_FIELDS}
                  submitLabel="Save changes"
                  initialValues={{
                    requirement_id: row.requirement_id === "—" ? "" : row.requirement_id,
                    story_code: row.story_code,
                    story: row.story,
                    acceptance_criteria: row.acceptance_criteria ?? "",
                    test_case_id: row.test_case_id === "—" ? "" : row.test_case_id,
                    test_scenario: row.test_scenario ?? "",
                    priority: row.priority === "—" ? "medium" : row.priority,
                    status: row.status,
                  }}
                  onSubmit={(values) => updateRow.mutateAsync({ row, values })}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Edit ${row.requirement_id}`}>
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
                <DeleteButton
                  label={row.task_id ? row.test_case_id : row.story_code}
                  cascadeNote={row.task_id ? undefined : "its test cases"}
                  onConfirm={() => removeRow.mutateAsync(row)}
                />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
