import type { ModelListItem, ModelVariant } from '@cursor/sdk';

import type { AgentModelParameter } from '../schema.js';
import type { AgentModelOption } from './types.js';

/** Params that are useful to show in picker labels (not internal flags). */
const MEANINGFUL_PARAM_IDS = new Set([
  'context',
  'effort',
  'reasoning',
  'fast',
  'thinking',
]);

function sortedParams(
  params: AgentModelParameter[] | undefined,
): AgentModelParameter[] | undefined {
  if (!params?.length) {
    return undefined;
  }
  return [...params].sort((a, b) => a.id.localeCompare(b.id));
}

/** Stable key for UI selection and round-tripping variant choices. */
export function modelOptionKey(
  id: string,
  params?: AgentModelParameter[],
): string {
  const normalized = sortedParams(params);
  if (!normalized?.length) {
    return id;
  }
  return `${id}|${normalized.map((p) => `${p.id}=${p.value}`).join('&')}`;
}

export function parseModelOptionKey(key: string): {
  id: string;
  params?: AgentModelParameter[];
} {
  const pipe = key.indexOf('|');
  if (pipe === -1) {
    return { id: key };
  }
  const id = key.slice(0, pipe);
  const params: AgentModelParameter[] = [];
  for (const segment of key.slice(pipe + 1).split('&')) {
    const eq = segment.indexOf('=');
    if (eq === -1) {
      continue;
    }
    params.push({
      id: segment.slice(0, eq),
      value: segment.slice(eq + 1),
    });
  }
  return params.length > 0 ? { id, params } : { id };
}

function baselineParamMap(
  item: ModelListItem,
  variants: ModelVariant[],
): Map<string, string> {
  const def = variants.find((v) => v.isDefault) ?? variants[0];
  const map = new Map<string, string>();
  for (const param of def?.params ?? []) {
    if (item.parameters?.some((p) => p.id === param.id)) {
      map.set(param.id, param.value);
    }
  }
  return map;
}

function describeEnabledParam(
  item: ModelListItem,
  param: AgentModelParameter,
): string | undefined {
  const paramDef = item.parameters?.find((p) => p.id === param.id);
  if (!paramDef) {
    return undefined;
  }

  const valueDef = paramDef.values.find((v) => v.value === param.value);

  if (param.value === 'none' && param.id === 'reasoning') {
    return undefined;
  }

  if (valueDef?.displayName) {
    return valueDef.displayName;
  }

  if (param.value === 'true') {
    return paramDef.displayName;
  }

  return undefined;
}

function describeParamDelta(
  item: ModelListItem,
  param: AgentModelParameter,
  baselineValue: string | undefined,
): string | undefined {
  if (!MEANINGFUL_PARAM_IDS.has(param.id)) {
    return undefined;
  }
  if (baselineValue === param.value) {
    return undefined;
  }

  if (param.value === 'false') {
    if (baselineValue === 'true') {
      if (param.id === 'fast') {
        return 'Standard';
      }
      if (param.id === 'thinking') {
        return 'Thinking off';
      }
    }
    return undefined;
  }

  return describeEnabledParam(item, param);
}

export function describeModelVariant(
  item: ModelListItem,
  variant: ModelVariant,
  baseline?: Map<string, string>,
): string {
  const base = variant.displayName || item.displayName;

  if (variant.isDefault) {
    return `${base} (default)`;
  }

  const baselineMap = baseline ?? new Map<string, string>();
  const tags: string[] = [];

  for (const param of variant.params) {
    const tag = describeParamDelta(item, param, baselineMap.get(param.id));
    if (tag) {
      tags.push(tag);
    }
  }

  if (tags.length === 0) {
    return base;
  }

  return `${base} (${tags.join(', ')})`;
}

/** Sort wizard rows: base model id, then base variant before parameterized ones, then label. */
export function sortAgentModelOptions(
  options: AgentModelOption[],
): AgentModelOption[] {
  return [...options].sort((a, b) => {
    const idCmp = a.id.localeCompare(b.id, undefined, { sensitivity: 'base' });
    if (idCmp !== 0) {
      return idCmp;
    }
    const aHasParams = a.key.includes('|');
    const bHasParams = b.key.includes('|');
    if (aHasParams !== bHasParams) {
      return aHasParams ? 1 : -1;
    }
    return (a.label ?? a.id).localeCompare(b.label ?? b.id, undefined, {
      sensitivity: 'base',
    });
  });
}

function sortModelListItems(items: ModelListItem[]): ModelListItem[] {
  return [...items].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: 'base',
    }),
  );
}

function sortVariants(
  item: ModelListItem,
  variants: ModelVariant[],
  baseline: Map<string, string>,
): ModelVariant[] {
  return [...variants].sort((a, b) => {
    if (a.isDefault && !b.isDefault) {
      return -1;
    }
    if (!a.isDefault && b.isDefault) {
      return 1;
    }
    return describeModelVariant(item, a, baseline).localeCompare(
      describeModelVariant(item, b, baseline),
      undefined,
      { sensitivity: 'base' },
    );
  });
}

/** Expand Cursor catalog entries into wizard-selectable rows (includes fast / preset variants). */
export function expandCursorModelOptions(
  items: ModelListItem[],
): AgentModelOption[] {
  const options: AgentModelOption[] = [];

  for (const item of sortModelListItems(items)) {
    const variants = item.variants;
    if (!variants?.length) {
      options.push({
        id: item.id,
        label: item.displayName,
        key: modelOptionKey(item.id),
      });
      continue;
    }

    const baseline = baselineParamMap(item, variants);

    for (const variant of sortVariants(item, variants, baseline)) {
      const params = sortedParams(variant.params);
      options.push({
        id: item.id,
        label: describeModelVariant(item, variant, baseline),
        ...(params !== undefined && { params }),
        key: modelOptionKey(item.id, params),
      });
    }
  }

  return sortAgentModelOptions(options);
}
