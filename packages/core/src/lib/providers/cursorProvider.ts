import { Agent, Cursor, CursorAgentError } from '@cursor/sdk';
import type { AgentOptions } from '@cursor/sdk';

import type { ResolvedAgentConfig } from '../agentConfigResolver';
import {
  AgentConfigError,
  AgentMissingApiKeyError,
  AgentRunFailedError,
  AgentStartupError,
  FilelinksError,
} from '../errors';
import { expandCursorModelOptions } from './cursorModelOptions.js';
import type { AgentProvider } from './types';
import type {
  AgentProviderContext,
  AgentRunInput,
  AgentRunResult,
} from './types';

function resolveApiKey(ctx: AgentProviderContext): string {
  const apiKey = ctx.apiKey ?? process.env['CURSOR_API_KEY'];
  if (!apiKey?.trim()) {
    throw new AgentMissingApiKeyError();
  }
  return apiKey.trim();
}

function toCloudRepos(
  repos: string[],
): NonNullable<AgentOptions['cloud']>['repos'] {
  return repos.map((repo) => {
    const trimmed = repo.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return { url: trimmed };
    }
    return { url: `https://github.com/${trimmed}` };
  });
}

function buildAgentCreateOptions(
  config: ResolvedAgentConfig,
  apiKey: string,
): AgentOptions {
  const options: AgentOptions = {
    apiKey,
    model: {
      id: config.model,
      ...(config.modelParams?.length
        ? { params: [...config.modelParams] }
        : {}),
    },
  };

  if (config.runtime === 'local') {
    const local = config.local;
    if (!local) {
      throw new AgentConfigError('agent.local is required for local runtime');
    }
    return {
      ...options,
      local: {
        cwd: local.cwd,
        settingSources: [],
      },
    };
  }

  const cloud = config.cloud;
  if (!cloud) {
    throw new AgentConfigError('agent.cloud is required for cloud runtime');
  }

  return {
    ...options,
    cloud: {
      repos: toCloudRepos([...cloud.repos]),
    },
  };
}

async function disposeAgent(agent: Awaited<ReturnType<typeof Agent.create>>) {
  try {
    await agent[Symbol.asyncDispose]();
  } catch {
    agent.close();
  }
}

export const cursorAgentProvider: AgentProvider = {
  id: 'cursor',

  validateCredentials(ctx: AgentProviderContext): void {
    resolveApiKey(ctx);
  },

  async listModels(ctx: AgentProviderContext) {
    const apiKey = resolveApiKey(ctx);
    const models = await Cursor.models.list({ apiKey });
    return expandCursorModelOptions(models);
  },

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const apiKey = resolveApiKey(input.ctx ?? {});
    const { config, prompt } = input;
    const createOptions = buildAgentCreateOptions(config, apiKey);

    let agent: Awaited<ReturnType<typeof Agent.create>> | undefined;

    try {
      agent = await Agent.create(createOptions);
      const run = await agent.send(prompt);
      const result = await run.wait();

      if (result.status === 'error') {
        throw new AgentRunFailedError('Agent run finished with error status', {
          runId: result.id,
        });
      }

      return {
        status: 'finished',
        runId: result.id,
        ...(result.result !== undefined && { resultText: result.result }),
      };
    } catch (error) {
      if (error instanceof FilelinksError) {
        throw error;
      }
      if (error instanceof CursorAgentError) {
        throw new AgentStartupError(error.message, {
          cause: error,
          details: { isRetryable: error.isRetryable },
        });
      }
      throw new AgentStartupError(
        error instanceof Error ? error.message : 'Agent failed to start',
        { cause: error },
      );
    } finally {
      if (agent !== undefined) {
        await disposeAgent(agent);
      }
    }
  },
};
