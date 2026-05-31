import { describe, expect, it } from 'vitest';

import { filterModelOptions } from './modelOptions.js';

describe('filterModelOptions', () => {
  const options = [
    {
      id: 'composer-2.5',
      label: 'Composer 2.5 (Fast)',
      key: 'composer-2.5|fast=true',
    },
    { id: 'gpt-5.4', label: 'GPT-5.4', key: 'gpt-5.4' },
  ];

  it('returns all options when query is empty', () => {
    expect(filterModelOptions(options, '')).toEqual(options);
  });

  it('matches label and id case-insensitively', () => {
    expect(filterModelOptions(options, 'fast').map((o) => o.id)).toEqual([
      'composer-2.5',
    ]);
    expect(filterModelOptions(options, 'gpt').map((o) => o.id)).toEqual([
      'gpt-5.4',
    ]);
  });
});
