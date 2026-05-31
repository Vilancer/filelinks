import { describe, expect, it } from 'vitest';

import {
  describeModelVariant,
  expandCursorModelOptions,
  modelOptionKey,
  parseModelOptionKey,
  sortAgentModelOptions,
} from './cursorModelOptions.js';

const opusItem = {
  id: 'claude-opus-4-7',
  displayName: 'Opus 4.7',
  parameters: [
    {
      id: 'thinking',
      displayName: 'Thinking',
      values: [{ value: 'false' }, { value: 'true' }],
    },
    {
      id: 'context',
      displayName: 'Context',
      values: [
        { value: '300k', displayName: '300K' },
        { value: '1m', displayName: '1M' },
      ],
    },
    {
      id: 'effort',
      displayName: 'Effort',
      values: [
        { value: 'low', displayName: 'Low' },
        { value: 'xhigh', displayName: 'Extra High' },
        { value: 'max', displayName: 'Max' },
      ],
    },
    {
      id: 'fast',
      displayName: 'Fast',
      values: [{ value: 'false' }, { value: 'true', displayName: 'Fast' }],
    },
  ],
} as const;

const opusBaseline = new Map<string, string>([
  ['thinking', 'true'],
  ['context', '1m'],
  ['effort', 'xhigh'],
  ['fast', 'false'],
]);

describe('cursorModelOptions', () => {
  it('parseModelOptionKey preserves = in param values', () => {
    const key = 'model-id|note=a=b';
    expect(parseModelOptionKey(key)).toEqual({
      id: 'model-id',
      params: [{ id: 'note', value: 'a=b' }],
    });
  });

  it('expands fast variants for composer models', () => {
    const options = expandCursorModelOptions([
      {
        id: 'composer-2.5',
        displayName: 'Composer 2.5',
        parameters: [
          {
            id: 'fast',
            displayName: 'Fast',
            values: [
              { value: 'false' },
              { value: 'true', displayName: 'Fast' },
            ],
          },
        ],
        variants: [
          {
            displayName: 'Composer 2.5',
            params: [{ id: 'fast', value: 'true' }],
            isDefault: true,
          },
          {
            displayName: 'Composer 2.5',
            params: [{ id: 'fast', value: 'false' }],
          },
        ],
      },
    ]);

    expect(options).toHaveLength(2);
    expect(options.map((o) => o.label)).toEqual([
      'Composer 2.5 (default)',
      'Composer 2.5 (Standard)',
    ]);
    expect(options[0]?.params).toEqual([{ id: 'fast', value: 'true' }]);
    expect(options[0]?.key).toBe(
      modelOptionKey('composer-2.5', [{ id: 'fast', value: 'true' }]),
    );
  });

  it('sortAgentModelOptions groups by base model id then label', () => {
    const sorted = sortAgentModelOptions([
      {
        id: 'gpt-5.4',
        label: 'GPT-5.4 (Fast)',
        key: 'gpt-5.4|fast=true',
      },
      {
        id: 'composer-2.5',
        label: 'Composer 2.5 (Standard)',
        key: 'composer-2.5|fast=false',
      },
      {
        id: 'composer-2.5',
        label: 'Composer 2.5 (default)',
        key: 'composer-2.5|fast=true',
      },
    ]);

    expect(sorted.map((o) => o.key)).toEqual([
      'composer-2.5|fast=true',
      'composer-2.5|fast=false',
      'gpt-5.4|fast=true',
    ]);
  });

  it('describeModelVariant shows only deltas from default preset', () => {
    expect(
      describeModelVariant(
        opusItem,
        {
          displayName: 'Opus 4.7',
          params: [
            { id: 'thinking', value: 'true' },
            { id: 'context', value: '1m' },
            { id: 'effort', value: 'xhigh' },
            { id: 'fast', value: 'false' },
          ],
          isDefault: true,
        },
        opusBaseline,
      ),
    ).toBe('Opus 4.7 (default)');

    expect(
      describeModelVariant(
        opusItem,
        {
          displayName: 'Opus 4.7',
          params: [
            { id: 'thinking', value: 'false' },
            { id: 'context', value: '1m' },
            { id: 'effort', value: 'max' },
            { id: 'fast', value: 'false' },
          ],
        },
        opusBaseline,
      ),
    ).toBe('Opus 4.7 (Thinking off, Max)');

    expect(
      describeModelVariant(
        opusItem,
        {
          displayName: 'Opus 4.7',
          params: [
            { id: 'thinking', value: 'true' },
            { id: 'context', value: '300k' },
            { id: 'effort', value: 'low' },
            { id: 'fast', value: 'true' },
          ],
        },
        opusBaseline,
      ),
    ).toBe('Opus 4.7 (300K, Low, Fast)');
  });
});
