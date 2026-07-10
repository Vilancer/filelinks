import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

import type { AgentModelOption } from '@vilancer/filelinks-core';

import { filterModelOptions } from './modelOptions.js';
import { SelectableList } from './SelectableList.js';

type ModelChoice = 'manual' | string;

export type ModelPickerPhaseProps = {
  readonly title: string;
  readonly subtitle: string;
  readonly error: string | null;
  readonly options: AgentModelOption[];
  readonly onSelectModel: (optionKey: string) => void;
  readonly onManual: () => void;
};

export function ModelPickerPhase({
  title,
  subtitle,
  error,
  options,
  onSelectModel,
  onManual,
}: ModelPickerPhaseProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [pickIndex, setPickIndex] = useState(0);

  useEffect(() => {
    setQuery('');
    setDebouncedQuery('');
    setPickIndex(0);
  }, [options]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(
    () => filterModelOptions(options, debouncedQuery),
    [options, debouncedQuery],
  );

  const items = useMemo((): { label: string; value: ModelChoice }[] => {
    const rows = filtered.map((m) => ({
      label: m.label ?? m.id,
      value: m.key,
    }));
    return [...rows, { label: 'Enter model manually', value: 'manual' }];
  }, [filtered]);

  useEffect(() => {
    setPickIndex((i) => {
      if (items.length === 0) {
        return 0;
      }
      return Math.min(i, items.length - 1);
    });
  }, [items.length, debouncedQuery]);

  useInput((_input, key) => {
    if (key.upArrow) {
      setPickIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setPickIndex((i) => Math.min(Math.max(0, items.length - 1), i + 1));
      return;
    }
    if (key.return) {
      const picked = items[pickIndex];
      if (picked === undefined) {
        return;
      }
      if (picked.value === 'manual') {
        onManual();
        return;
      }
      onSelectModel(picked.value);
    }
  });

  const active = items[pickIndex];

  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      {error !== null ? (
        <Text dimColor>Model lookup failed, using fallback list.</Text>
      ) : (
        <Text dimColor>{subtitle}</Text>
      )}
      <Box marginTop={1}>
        <Text color="cyan">› </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          onSubmit={() => {
            const picked = items[pickIndex];
            if (picked === undefined) {
              return;
            }
            if (picked.value === 'manual') {
              onManual();
              return;
            }
            onSelectModel(picked.value);
          }}
          placeholder="type to filter models"
          focus
        />
      </Box>
      <SelectableList<ModelChoice>
        items={items}
        selectedIndex={pickIndex}
        interactive={false}
        onSelect={(v) => {
          if (v === 'manual') {
            onManual();
            return;
          }
          onSelectModel(v);
        }}
      />
      <Text dimColor>
        Matches: {filtered.length}
        {options.length !== filtered.length ? ` of ${options.length}` : ''}{' '}
        {active ? `| selected: ${active.label}` : ''}
      </Text>
      <Text dimColor>Enter pick | ↑/↓ move</Text>
    </Box>
  );
}
