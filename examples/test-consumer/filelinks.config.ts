import { defineLinks } from '@filelinks/core';

export default defineLinks(
  [
    {
      trigger: 'apps/api/src/routes/user.ts',
      affects: [
        { file: 'apps/api/docs/openapi.yaml', reason: 'Keep OpenAPI in sync' },
      ],
      severity: 'warn',
      agent: {
        runPolicy: 'trigger-only',
        provider: 'cursor',
        runtime: 'local',
        model: 'composer-2.5',
        local: { cwd: '.' },
      },
    },
  ],
  {
    agent: {
      runPolicy: 'trigger-only',
      provider: 'cursor',
      runtime: 'local',
      model: 'composer-2.5',
      local: { cwd: '.' },
    },
    prompt: { temperature: 0.2 },
  },
);
