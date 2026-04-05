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
});

export const FileLinkConfigSchema = Schema.Struct({
  prompt: Schema.optional(PromptConfigSchema),
});

export const FileLinksFileSchema = Schema.Struct({
  links: Schema.Array(FileLinkEntrySchema),
  config: FileLinkConfigSchema,
});

export type PromptConfig = Schema.Schema.Type<typeof PromptConfigSchema>;
export type FileLinkConfig = Schema.Schema.Type<typeof FileLinkConfigSchema>;
export type AffectedFile = Schema.Schema.Type<typeof AffectedFileSchema>;
export type LinkType = Schema.Schema.Type<typeof LinkTypeSchema>;
export type FileLinkEntry = Schema.Schema.Type<typeof FileLinkEntrySchema>;

const decodeLinks = Schema.decodeUnknownSync(Schema.Array(FileLinkEntrySchema));
const decodeConfig = Schema.decodeUnknownSync(FileLinkConfigSchema);

export function defineLinks(
  links: unknown,
  config?: unknown,
): { links: FileLinkEntry[]; config: FileLinkConfig } {
  const decodedLinks = decodeLinks(links);
  const decodedConfig = decodeConfig(config ?? {});
  return {
    links: [...decodedLinks],
    config: { ...decodedConfig },
  };
}
