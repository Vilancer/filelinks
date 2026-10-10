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
  /** Agent reply for `suggest` runs. */
  suggestion?: string;
};

/** A missing companion an agent wrote during `check --run-agents`. */
export type AgentFixJson = {
  path: string;
  /** True when `--stage-fixes` staged it. */
  staged: boolean;
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
  agentFixes?: AgentFixJson[],
): void {
  const payload: {
    violations: CheckViolationJson[];
    agentRuns?: AgentRunSummaryJson[];
    agentFixes?: AgentFixJson[];
  } = { violations };
  if (agentRuns !== undefined) {
    payload.agentRuns = agentRuns;
  }
  if (agentFixes !== undefined) {
    payload.agentFixes = agentFixes;
  }
  console.log(JSON.stringify(payload, null, 2));
}

export function printListJson(rows: ListRowJson[]): void {
  console.log(JSON.stringify({ rows }, null, 2));
}

export function printSuggestJson(suggestions: AgentRunSummaryJson[]): void {
  console.log(JSON.stringify({ suggestions }, null, 2));
}
