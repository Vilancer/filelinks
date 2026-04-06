import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

export type SelectableItem<T extends string = string> = {
  readonly label: string;
  readonly value: T;
};

type Props<T extends string> = {
  readonly items: SelectableItem<T>[];
  readonly onSelect: (value: T) => void;
  readonly initialIndex?: number;
  readonly selectedIndex?: number;
  readonly interactive?: boolean;
  readonly maxVisibleItems?: number;
};

export function SelectableList<T extends string>({
  items,
  onSelect,
  initialIndex = 0,
  selectedIndex,
  interactive = true,
  maxVisibleItems = 8,
}: Props<T>): React.ReactElement {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex((i) => Math.min(Math.max(0, i), Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    if (selectedIndex !== undefined) {
      setIndex(
        Math.min(Math.max(0, selectedIndex), Math.max(0, items.length - 1)),
      );
    }
  }, [items.length, selectedIndex]);

  useInput((_input, key) => {
    if (!interactive) {
      return;
    }
    if (key.upArrow) {
      setIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setIndex((i) => Math.min(items.length - 1, i + 1));
    }
    if (key.return) {
      const it = items[index];
      if (it !== undefined) {
        onSelect(it.value);
      }
    }
  });

  const visible = (() => {
    if (items.length <= maxVisibleItems) {
      return { slice: items, offset: 0 };
    }
    const half = Math.floor(maxVisibleItems / 2);
    const start = Math.max(
      0,
      Math.min(index - half, items.length - maxVisibleItems),
    );
    return {
      slice: items.slice(start, start + maxVisibleItems),
      offset: start,
    };
  })();

  return (
    <Box flexDirection="column">
      {items.length === 0 ? (
        <Text dimColor>No matches. Keep typing to refine.</Text>
      ) : null}
      {visible.offset > 0 ? <Text dimColor> ...</Text> : null}
      {visible.slice.map((it, visibleIdx) => {
        const idx = visible.offset + visibleIdx;
        return (
          <Text
            key={`${it.value}-${idx}`}
            color={idx === index ? 'cyan' : 'white'}
          >
            {idx === index ? '› ' : '  '}
            {it.label}
          </Text>
        );
      })}
      {visible.offset + visible.slice.length < items.length ? (
        <Text dimColor> ...</Text>
      ) : null}
    </Box>
  );
}
