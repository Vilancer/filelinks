import * as Schema from 'effect/Schema';

export const LinkTypeSchema = Schema.Literal(
  'file-file',
  'dir-dir',
  'file-dir',
  'dir-file',
);

export const PromptConfigSchema = Schema.Struct({
  systemPrompt: Schema.optional(Schema.String),
  temperature: Schema.optional(Schema.Number),
  maxTokens: Schema.optional(Schema.Number),
});

export const AgentRunPolicySchema = Schema.Literal(
  'trigger-only',
  'trigger-or-affects',
);

export const AgentProviderIdSchema = Schema.Literal('cursor');

export const AgentRuntimeSchema = Schema.Literal('local', 'cloud');

export const AgentLocalSettingsSchema = Schema.Struct({
  cwd: Schema.String,
});

export const AgentCloudSettingsSchema = Schema.Struct({
  repos: Schema.Array(Schema.String),
});

export const AgentModelParameterSchema = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
});

export const AgentSettingsSchema = Schema.Struct({
  runPolicy: Schema.optional(AgentRunPolicySchema),
  provider: Schema.optional(AgentProviderIdSchema),
  runtime: Schema.optional(AgentRuntimeSchema),
  model: Schema.optional(Schema.String),
  modelParams: Schema.optional(Schema.Array(AgentModelParameterSchema)),
  local: Schema.optional(AgentLocalSettingsSchema),
  cloud: Schema.optional(AgentCloudSettingsSchema),
});

export const AffectedFileSchema = Schema.Struct({
  file: Schema.String,
  reason: Schema.String,
});

const SeveritySchema = Schema.Literal('warn', 'error');

export const FileLinkEntrySchema = Schema.Struct({
  trigger: Schema.String,
  affects: Schema.Array(AffectedFileSchema),
  linkType: Schema.optional(LinkTypeSchema),
  severity: Schema.optional(SeveritySchema),
  prompt: Schema.optional(PromptConfigSchema),
  agent: Schema.optional(AgentSettingsSchema),
});

export const FileLinkConfigSchema = Schema.Struct({
  prompt: Schema.optional(PromptConfigSchema),
  agent: Schema.optional(AgentSettingsSchema),
});

export const FileLinksFileSchema = Schema.Struct({
  links: Schema.Array(FileLinkEntrySchema),
  config: FileLinkConfigSchema,
});

export type PromptConfig = Schema.Schema.Type<typeof PromptConfigSchema>;
export type AgentRunPolicy = Schema.Schema.Type<typeof AgentRunPolicySchema>;
export type AgentProviderId = Schema.Schema.Type<typeof AgentProviderIdSchema>;
export type AgentRuntime = Schema.Schema.Type<typeof AgentRuntimeSchema>;
export type AgentLocalSettings = Schema.Schema.Type<
  typeof AgentLocalSettingsSchema
>;
export type AgentCloudSettings = Schema.Schema.Type<
  typeof AgentCloudSettingsSchema
>;
export type AgentModelParameter = Schema.Schema.Type<
  typeof AgentModelParameterSchema
>;
export type AgentSettings = Schema.Schema.Type<typeof AgentSettingsSchema>;
export type FileLinkConfig = Schema.Schema.Type<typeof FileLinkConfigSchema>;
export type AffectedFile = Schema.Schema.Type<typeof AffectedFileSchema>;
export type LinkType = Schema.Schema.Type<typeof LinkTypeSchema>;
export type FileLinkEntry = Schema.Schema.Type<typeof FileLinkEntrySchema>;

const decodeLinks = Schema.decodeUnknownSync(Schema.Array(FileLinkEntrySchema));
const decodeConfig = Schema.decodeUnknownSync(FileLinkConfigSchema);

export function defineLinks(
  links: readonly FileLinkEntry[],
  config?: FileLinkConfig,
): { links: FileLinkEntry[]; config: FileLinkConfig } {
  const decodedLinks = decodeLinks(links);
  const decodedConfig = decodeConfig(config ?? {});
  return {
    links: [...decodedLinks],
    config: { ...decodedConfig },
  };
}
