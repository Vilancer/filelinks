/** JSON output shapes for `check` / `list` (stable field names). */

export type CheckViolationJson = {
  trigger: string;
  affectedFile: string;
  reason: string;
  severity: 'warn' | 'error';
};

export type AgentRunSummaryJson = {
  trigger: string;
  status: 'ok' | 'error';
  runId?: string;
};

export type ListRowJson = {
  trigger: string;
  affectedFile: string;
  reason: string;
  severity: 'warn' | 'error';
  linkType: string | null;
};

export function printCheckJson(
  violations: CheckViolationJson[],
  agentRuns?: AgentRunSummaryJson[],
): void {
  const payload: {
    violations: CheckViolationJson[];
    agentRuns?: AgentRunSummaryJson[];
  } = { violations };
  if (agentRuns !== undefined) {
    payload.agentRuns = agentRuns;
  }
  console.log(JSON.stringify(payload, null, 2));
}

export function printListJson(rows: ListRowJson[]): void {
  console.log(JSON.stringify({ rows }, null, 2));
}
