import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { fetchTraceability, priorityLabel, statusLabel } from "@/lib/pm";

export function TraceabilityMatrix({ projectId }: { projectId: string }) {
  const rows = useQuery({
    queryKey: ["traceability", projectId],
    queryFn: () => fetchTraceability(projectId),
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
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="p-3 font-medium">Requirement ID</th>
            <th className="p-3 font-medium">User Story</th>
            <th className="p-3 font-medium">Acceptance Criteria</th>
            <th className="p-3 font-medium">Test Case ID</th>
            <th className="p-3 font-medium">Test Scenario</th>
            <th className="p-3 font-medium">Priority</th>
            <th className="p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-border/60 align-top last:border-0">
              <td className="p-3 font-mono text-xs text-primary">{row.requirement_id}</td>
              <td className="p-3">
                <span className="font-mono text-xs text-muted-foreground">{row.story_code}</span>
                <p className="mt-0.5">{row.story}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{row.sprint_name}</p>
              </td>
              <td className="whitespace-pre-line p-3 text-muted-foreground">
                {row.acceptance_criteria || "—"}
              </td>
              <td className="p-3 font-mono text-xs">{row.test_case_id}</td>
              <td className="whitespace-pre-line p-3 text-muted-foreground">
                {row.test_scenario || "—"}
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
                <Badge variant="secondary" className="text-[10px]">
                  {statusLabel(row.status)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
