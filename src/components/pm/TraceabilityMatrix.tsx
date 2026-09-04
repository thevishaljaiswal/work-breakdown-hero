import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  type TraceabilityRow,
} from "@/lib/pm";

const REQUIREMENT_FIELDS: FieldSpec[] = [
  { name: "story_code", label: "User Story ID", type: "text", placeholder: "US-101", span: "half" },
  { name: "requirement_id", label: "Requirement ID", type: "text", placeholder: "RQ-101", span: "half" },
  { name: "story", label: "User Story", type: "textarea", required: true },
  { name: "acceptance_criteria", label: "Acceptance Criteria", type: "textarea" },
  { name: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS, span: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, span: "half" },
];

const TEST_CASE_FIELDS: FieldSpec[] = [
  { name: "test_case_id", label: "Test Case ID", type: "text", placeholder: "TC-103", span: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, span: "half" },
  { name: "test_scenario", label: "Test Scenario", type: "textarea", placeholder: "Duplicate Vendor Validation" },
];

function IdCell({ id, text, note }: { id: string; text?: string | null; note?: string }) {
  return (
    <>
      <span className="font-mono text-xs text-primary">{id}</span>
      <p className="mt-0.5 whitespace-pre-line text-muted-foreground">{text || "—"}</p>
      {note ? <p className="mt-0.5 text-xs text-muted-foreground">{note}</p> : null}
    </>
  );
}

export function TraceabilityMatrix({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const rows = useQuery({
    queryKey: ["traceability", projectId],
    queryFn: () => fetchTraceability(projectId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["traceability", projectId] });
    queryClient.invalidateQueries({ queryKey: ["sprint-backlog"] });
  };

  const updateRequirement = useMutation({
    mutationFn: async ({ row, values }: { row: TraceabilityRow; values: Record<string, string> }) => {
      const { error: storyError } = await supabase
        .from("user_stories")
        .update({ story_code: values.story_code || row.story_code, story: values.story })
        .eq("id", row.story_id);
      if (storyError) throw storyError;

      if (row.requirement_row_id) {
        const { error } = await supabase
          .from("story_requirements")
          .update({
            requirement_id: values.requirement_id || row.requirement_id,
            acceptance_criteria: values.acceptance_criteria || null,
            priority: (values.priority || "medium") as never,
            status: (values.status || "not_started") as never,
          })
          .eq("id", row.requirement_row_id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Requirement updated");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTestCase = useMutation({
    mutationFn: async ({ row, values }: { row: TraceabilityRow; values: Record<string, string> }) => {
      const { error } = await supabase
        .from("story_tasks")
        .update({
          test_case_id: values.test_case_id || null,
          test_scenario: values.test_scenario || null,
          status: (values.status || "not_started") as never,
        })
        .eq("id", row.task_id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test case updated");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeRequirement = useMutation({
    mutationFn: (row: TraceabilityRow) => deleteUserStory(row.story_id),
    onSuccess: () => {
      toast.success("User story deleted");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeTestCase = useMutation({
    mutationFn: (row: TraceabilityRow) => deleteTestCase(row.task_id!),
    onSuccess: () => {
      toast.success("Test case deleted");
      invalidate();
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
          Nothing to trace yet. Add user stories, requirements and test cases in Sprint planning —
          they appear here automatically.
        </p>
      </div>
    );
  }

  const requirementRows = Array.from(
    new Map(
      data.map((row) => [row.requirement_row_id ?? `story:${row.story_id}`, row]),
    ).values(),
  );
  const testCaseRows = data.filter((row) => row.task_id);

  return (
    <Tabs defaultValue="requirements" className="w-full">
      <TabsList>
        <TabsTrigger value="requirements">Requirements</TabsTrigger>
        <TabsTrigger value="test-cases">Test cases</TabsTrigger>
      </TabsList>

      <TabsContent value="requirements" className="mt-4">
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="p-3 font-medium">User Story</th>
                <th className="p-3 font-medium">Requirement</th>
                <th className="p-3 font-medium">Priority</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium sr-only">Edit</th>
              </tr>
            </thead>
            <tbody>
              {requirementRows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 align-top last:border-0">
                  <td className="p-3">
                    <span className="font-mono text-xs text-muted-foreground">{row.story_code}</span>
                    <p className="mt-0.5">{row.story}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.sprint_name}</p>
                  </td>
                  <td className="p-3">
                    <IdCell id={row.requirement_id} text={row.acceptance_criteria} />
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
                        description="Update the user story and its requirement."
                        fields={REQUIREMENT_FIELDS}
                        submitLabel="Save changes"
                        initialValues={{
                          story_code: row.story_code,
                          story: row.story,
                          requirement_id: row.requirement_id === "—" ? "" : row.requirement_id,
                          acceptance_criteria: row.acceptance_criteria ?? "",
                          priority: row.priority === "—" ? "medium" : row.priority,
                          status: row.status,
                        }}
                        onSubmit={(values) => updateRequirement.mutateAsync({ row, values })}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label={`Edit ${row.requirement_id}`}>
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <DeleteButton
                        label={row.story_code}
                        cascadeNote="its requirements and test cases"
                        onConfirm={() => removeRequirement.mutateAsync(row)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="test-cases" className="mt-4">
        {testCaseRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No test cases yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 font-medium">User Story</th>
                  <th className="p-3 font-medium">Test Case</th>
                  <th className="p-3 font-medium">Requirement</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium sr-only">Edit</th>
                </tr>
              </thead>
              <tbody>
                {testCaseRows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 align-top last:border-0">
                    <td className="p-3">
                      <span className="font-mono text-xs text-muted-foreground">{row.story_code}</span>
                      <p className="mt-0.5">{row.story}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.sprint_name}</p>
                    </td>
                    <td className="p-3">
                      <IdCell id={row.test_case_id} text={row.test_scenario} />
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-primary">{row.requirement_id}</span>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <RecordDialog
                          title={`Edit ${row.test_case_id}`}
                          description="Update the linked test case."
                          fields={TEST_CASE_FIELDS}
                          submitLabel="Save changes"
                          initialValues={{
                            test_case_id: row.test_case_id === "—" ? "" : row.test_case_id,
                            test_scenario: row.test_scenario ?? "",
                            status: row.status,
                          }}
                          onSubmit={(values) => updateTestCase.mutateAsync({ row, values })}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label={`Edit ${row.test_case_id}`}>
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <DeleteButton
                          label={row.test_case_id}
                          onConfirm={() => removeTestCase.mutateAsync(row)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
