/** JSON output shapes for `check` / `list` (stable field names). */

export type CheckViolationJson = {
  trigger: string;
  affectedFile: string;
  reason: string;
  severity: 'warn' | 'error';
};

export type ListRowJson = {
  trigger: string;
  affectedFile: string;
  reason: string;
  severity: 'warn' | 'error';
  linkType: string | null;
};

export function printCheckJson(violations: CheckViolationJson[]): void {
  console.log(JSON.stringify({ violations }, null, 2));
}

export function printListJson(rows: ListRowJson[]): void {
  console.log(JSON.stringify({ rows }, null, 2));
}
