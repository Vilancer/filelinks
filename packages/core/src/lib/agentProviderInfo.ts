import type { AgentClaudeAuth, AgentProviderId, AgentRuntime } from './schema';

/** Built-in agent providers, in the order the CLI offers them. */
export const AGENT_PROVIDER_IDS: readonly AgentProviderId[] = [
  'cursor',
  'claude',
];

/** Short labels for CLI pickers and docs. */
export const AGENT_PROVIDER_DESCRIPTIONS: Record<AgentProviderId, string> = {
  cursor: 'Cursor agent via @cursor/sdk (CURSOR_API_KEY; local or cloud).',
  claude:
    'Claude Code via @anthropic-ai/claude-agent-sdk (device login or setup token; local only).',
};

/** Model used when `agent.model` is omitted. */
export const DEFAULT_AGENT_MODELS: Record<AgentProviderId, string> = {
  cursor: 'composer-2.5',
  claude: 'claude-opus-5-5',
};

/** Runtimes each provider can execute. */
export const AGENT_PROVIDER_RUNTIMES: Record<
  AgentProviderId,
  readonly AgentRuntime[]
> = {
  cursor: ['local', 'cloud'],
  claude: ['local'],
};

export const CLAUDE_AUTH_MODES: readonly AgentClaudeAuth[] = [
  'device',
  'token',
];

export const CLAUDE_AUTH_DESCRIPTIONS: Record<AgentClaudeAuth, string> = {
  device:
    'Use the Claude Code login and settings already on this machine (run `claude` and /login once).',
  token:
    'Use a token from `claude setup-token` (CLAUDE_CODE_OAUTH_TOKEN) or an ANTHROPIC_API_KEY.',
};

/** Default when `agent.claude.auth` is omitted. */
export const DEFAULT_CLAUDE_AUTH: AgentClaudeAuth = 'device';
