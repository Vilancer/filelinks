import * as fs from 'node:fs';
import * as path from 'node:path';

import { createElement } from 'react';
import { render } from 'ink';

import {
  AgentMissingApiKeyError,
  defineLinks,
  findConfigFile,
  getAgentProvider,
  loadFileLinksConfig,
  normalizeError,
  modelOptionKey,
  sortAgentModelOptions,
  validateResolvedAgentConfig,
  type AgentModelOption,
  type AgentSettings,
  type FileLinkConfig,
  type FileLinkEntry,
  type PromptConfig,
} from '@filelinks/core';

import { AddWizard } from './add-ui/AddWizard.js';
import { resolveCursorApiKey } from './cursorApiKey.js';
import type { AddCommitPayload } from './add-ui/types.js';
import { listPathCandidatesWithMeta } from './pathCandidates.js';

const FALLBACK_MODELS: AgentModelOption[] = sortAgentModelOptions([
  {
    id: 'composer-2.5',
    label: 'Composer 2.5 (default)',
    params: [{ id: 'fast', value: 'true' }],
    key: modelOptionKey('composer-2.5', [{ id: 'fast', value: 'true' }]),
  },
  {
    id: 'composer-2.5',
    label: 'Composer 2.5 (Standard)',
    params: [{ id: 'fast', value: 'false' }],
    key: modelOptionKey('composer-2.5', [{ id: 'fast', value: 'false' }]),
  },
  {
    id: 'composer-2',
    label: 'Composer 2 (default)',
    params: [{ id: 'fast', value: 'true' }],
    key: modelOptionKey('composer-2', [{ id: 'fast', value: 'true' }]),
  },
  {
    id: 'composer-2',
    label: 'Composer 2 (Standard)',
    params: [{ id: 'fast', value: 'false' }],
    key: modelOptionKey('composer-2', [{ id: 'fast', value: 'false' }]),
  },
]);

export function serializeFileLinksConfig(
  links: FileLinkEntry[],
  config: FileLinkConfig,
): string {
  const linksStr = JSON.stringify(links, null, 2);
  const configStr = JSON.stringify(config, null, 2);
  return `import { defineLinks } from '@filelinks/core';\n\nexport default defineLinks(\n${linksStr},\n${configStr},\n);\n`;
}

export type RunAddOpts = {
  cwd: string;
  configPath?: string;
  verbose: boolean;
  /** When true, refuse (D-24) — `add` is interactive only. */
  json?: boolean;
};

async function commitEntry(
  opts: RunAddOpts,
  payload: AddCommitPayload,
): Promise<number> {
  const decoded = normalizeAddCommitPayload(payload);
  const row = decoded.links[0];
  if (row === undefined) {
    console.error('defineLinks returned no entries');
    return 1;
  }

  let targetPath: string;
  if (opts.configPath) {
    targetPath = path.isAbsolute(opts.configPath)
      ? opts.configPath
      : path.resolve(opts.cwd, opts.configPath);
  } else {
    const found = findConfigFile(opts.cwd);
    targetPath =
      found ?? path.join(path.resolve(opts.cwd), 'filelinks.config.ts');
  }

  if (!fs.existsSync(targetPath)) {
    const merged = defineLinks([row], decoded.config);
    fs.writeFileSync(
      targetPath,
      serializeFileLinksConfig(merged.links, merged.config),
      'utf8',
    );
    console.log(`Created ${targetPath}`);
    return 0;
  }

  const loaded = loadFileLinksConfig(path.dirname(targetPath), {
    configPath: path.basename(targetPath),
  });
  const mergedLinks = [...loaded.links, row];
  const merged = defineLinks(
    mergedLinks,
    mergeConfigUpdates(
      loaded.config,
      decoded.config.agent,
      decoded.config.prompt,
    ),
  );
  fs.writeFileSync(
    targetPath,
    serializeFileLinksConfig(merged.links, merged.config),
    'utf8',
  );
  console.log(`Updated ${targetPath}`);
  return 0;
}

export function mergeConfigUpdates(
  config: FileLinkConfig,
  configAgent?: AgentSettings,
  configPrompt?: PromptConfig,
): FileLinkConfig {
  if (configAgent === undefined && configPrompt === undefined) {
    return { ...config };
  }
  return {
    ...config,
    ...(configAgent !== undefined ? { agent: configAgent } : {}),
    ...(configPrompt !== undefined ? { prompt: configPrompt } : {}),
  };
}

export function normalizeAddCommitPayload(payload: AddCommitPayload): {
  links: FileLinkEntry[];
  config: FileLinkConfig;
} {
  return defineLinks([payload.entry], {
    ...(payload.configAgent ? { agent: payload.configAgent } : {}),
    ...(payload.configPrompt ? { prompt: payload.configPrompt } : {}),
  });
}

export async function listWizardModels(
  agent: AgentSettings,
  cwd: string,
): Promise<AgentModelOption[]> {
  try {
    const resolved = validateResolvedAgentConfig(agent);
    const provider = getAgentProvider(resolved.provider);
    const apiKey = resolveCursorApiKey({ cwd });
    provider.validateCredentials({ apiKey });
    const liveModels = await provider.listModels({ apiKey });
    if (liveModels.length === 0) {
      return FALLBACK_MODELS;
    }
    return sortAgentModelOptions(liveModels);
  } catch (e) {
    if (e instanceof AgentMissingApiKeyError) {
      throw e;
    }
    return FALLBACK_MODELS;
  }
}

export function summarizeExistingGlobalAgent(
  cwd: string,
  configPath?: string,
): string | undefined {
  const targetPath = configPath
    ? path.isAbsolute(configPath)
      ? configPath
      : path.resolve(cwd, configPath)
    : findConfigFile(cwd);
  if (!targetPath || !fs.existsSync(targetPath)) {
    return undefined;
  }
  try {
    const loaded = loadFileLinksConfig(path.dirname(targetPath), {
      configPath: path.basename(targetPath),
    });
    const agent = loaded.config.agent;
    if (!agent) {
      return undefined;
    }
    const parts: string[] = [];
    if (agent.provider) {
      parts.push(`provider=${agent.provider}`);
    }
    if (agent.runtime) {
      parts.push(`runtime=${agent.runtime}`);
    }
    if (agent.model) {
      const fast = agent.modelParams?.find(
        (p) => p.id === 'fast' && p.value === 'true',
      );
      parts.push(fast ? `model=${agent.model} (fast)` : `model=${agent.model}`);
    }
    if (agent.runtime === 'local' && agent.local?.cwd) {
      parts.push(`cwd=${agent.local.cwd}`);
    }
    if (agent.runtime === 'cloud' && agent.cloud?.repos?.length) {
      parts.push(`repos=${agent.cloud.repos.join(',')}`);
    }
    return parts.join(' | ');
  } catch {
    return undefined;
  }
}

function exitCodeNumber(): number {
  const c = process.exitCode;
  return typeof c === 'number' ? c : 0;
}

export async function runAdd(opts: RunAddOpts): Promise<number> {
  if (opts.json) {
    console.error('filelinks add is interactive only; omit --json to run add.');
    return 1;
  }

  try {
    const existingGlobalAgentSummary = summarizeExistingGlobalAgent(
      opts.cwd,
      opts.configPath,
    );
    const { waitUntilExit } = render(
      createElement(AddWizard, {
        cwd: opts.cwd,
        loadCandidates: async () => {
          const { candidates, directories } = listPathCandidatesWithMeta(
            opts.cwd,
          );
          if (candidates.length === 0) {
            throw new Error(
              'filelinks add: no paths found to choose from (empty tree or cwd).',
            );
          }
          return { candidates, directories: [...directories] };
        },
        onCommit: async (payload: AddCommitPayload) => {
          try {
            return await commitEntry(opts, payload);
          } catch (e: unknown) {
            const h = normalizeError(e);
            console.error(h.message);
            return 1;
          }
        },
        loadModels: (agent) => listWizardModels(agent, opts.cwd),
        existingGlobalAgentSummary,
      }),
    );
    await waitUntilExit();
    return exitCodeNumber();
  } catch (e: unknown) {
    const h = normalizeError(e);
    console.error(h.message);
    return 1;
  }
}
