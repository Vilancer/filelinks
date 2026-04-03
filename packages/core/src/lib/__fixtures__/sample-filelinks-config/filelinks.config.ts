import { defineLinks } from '../../schema';

export default defineLinks(
  [
    {
      trigger: 'apps/**/*.ts',
      linkType: 'file-file',
      affects: [{ file: 'docs/openapi.yaml', reason: 'Keep OpenAPI in sync' }],
    },
  ],
  { prompt: { temperature: 0.2 } },
);
