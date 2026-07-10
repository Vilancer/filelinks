import type { AgentModelOption } from '@vilancer/filelinks-core';

const MAX_FILTER_RESULTS = 200;

/** Substring filter on label, id, and option key (case-insensitive). */
export function filterModelOptions(
  options: AgentModelOption[],
  query: string,
): AgentModelOption[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return options;
  }
  const out: AgentModelOption[] = [];
  for (const option of options) {
    const label = (option.label ?? option.id).toLowerCase();
    if (
      label.includes(q) ||
      option.id.toLowerCase().includes(q) ||
      option.key.toLowerCase().includes(q)
    ) {
      out.push(option);
      if (out.length >= MAX_FILTER_RESULTS) {
        break;
      }
    }
  }
  return out;
}
