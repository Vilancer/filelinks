import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';

import {
  LINK_TYPES,
  LINK_TYPE_DESCRIPTIONS,
  linkTypeForPathKinds,
} from '@filelinks/core';
import type { FileLinkEntry, LinkType } from '@filelinks/core';

import { filterPaths } from '../pathCandidates.js';
import { CliStartLogo } from '../ui/CliStartLogo.js';
import { SelectableList } from './SelectableList.js';

export type AddWizardProps = {
  readonly loadCandidates: () => Promise<
    | string[]
    | {
        readonly candidates: string[];
        readonly directories: string[];
      }
  >;
  readonly onCommit: (entry: FileLinkEntry) => Promise<number>;
};

type Phase =
  | 'loading'
  | 'triggerMode'
  | 'triggerManual'
  | 'triggerPick'
  | 'affectFilter'
  | 'affectReason'
  | 'moreAffects'
  | 'severity'
  | 'linkType';

export function AddWizard({
  loadCandidates,
  onCommit,
}: AddWizardProps): React.ReactElement {
  const { exit } = useApp();
  type PathKind = 'file' | 'dir' | 'unknown';

  const [phase, setPhase] = useState<Phase>('loading');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [directorySet, setDirectorySet] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState('');
  const [triggerKind, setTriggerKind] = useState<PathKind>('unknown');
  const [triggerSourcePath, setTriggerSourcePath] = useState<string | null>(
    null,
  );
  const [triggerQuery, setTriggerQuery] = useState('');
  const [triggerPickIndex, setTriggerPickIndex] = useState(0);
  const [debouncedTriggerQuery, setDebouncedTriggerQuery] = useState('');
  const [affectQuery, setAffectQuery] = useState('');
  const [affectPickIndex, setAffectPickIndex] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [pendingPath, setPendingPath] = useState('');
  const [reasonDraft, setReasonDraft] = useState('');
  const [affects, setAffects] = useState<
    { file: string; reason: string; kind: Exclude<PathKind, 'unknown'> }[]
  >([]);
  const [severity, setSeverity] = useState<'warn' | 'error' | null>(null);
  /** Set synchronously on severity pick so runCommit never reads stale React state. */
  const severityRef = useRef<'warn' | 'error' | null>(null);
  const [loadingTick, setLoadingTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    void loadCandidates()
      .then((loaded) => {
        const elapsed = Date.now() - startedAt;
        const remain = Math.max(0, 700 - elapsed);
        setTimeout(() => {
          if (cancelled) {
            return;
          }
          if (Array.isArray(loaded)) {
            setCandidates(loaded);
            setDirectorySet(new Set());
          } else {
            setCandidates(loaded.candidates);
            setDirectorySet(new Set(loaded.directories));
          }
          setPhase('triggerMode');
        }, remain);
      })
      .catch((e: unknown) => {
        const elapsed = Date.now() - startedAt;
        const remain = Math.max(0, 700 - elapsed);
        setTimeout(() => {
          if (cancelled) {
            return;
          }
          const message = e instanceof Error ? e.message : String(e);
          setLoadError(message);
        }, remain);
      });
    return () => {
      cancelled = true;
    };
  }, [loadCandidates]);

  useEffect(() => {
    if (phase !== 'loading') {
      return;
    }
    const t = setInterval(() => {
      setLoadingTick((n) => n + 1);
    }, 100);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTriggerQuery(triggerQuery), 120);
    return () => clearTimeout(t);
  }, [triggerQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(affectQuery), 120);
    return () => clearTimeout(t);
  }, [affectQuery]);

  const triggerFiltered = useMemo(
    () => filterPaths([...candidates], debouncedTriggerQuery),
    [candidates, debouncedTriggerQuery],
  );

  const isDirectoryCandidate = (value: string): boolean =>
    directorySet.has(value) ||
    candidates.some((c) => c !== value && c.startsWith(`${value}/`));

  const kindOfCandidate = (value: string): Exclude<PathKind, 'unknown'> =>
    isDirectoryCandidate(value) ? 'dir' : 'file';

  /** Directory if git/meta says so or any listed file lives under `picked/`. */
  const pickedTriggerIsDirectory = (picked: string): boolean =>
    directorySet.has(picked) ||
    candidates.some((c) => c !== picked && c.startsWith(`${picked}/`));

  const renderCandidateLabel = (value: string): string =>
    `${isDirectoryCandidate(value) ? '(dir) ' : '(file) '}${value}`;

  const affectKindLock: Exclude<PathKind, 'unknown'> | null =
    affects.length > 0 ? (affects[0]?.kind ?? null) : null;

  const listAffectCandidates = (
    query: string,
    chosen: {
      file: string;
      reason: string;
      kind: Exclude<PathKind, 'unknown'>;
    }[],
    lockKind: Exclude<PathKind, 'unknown'> | null = null,
  ): string[] => {
    const chosenSet = new Set(chosen.map((a) => a.file));
    const source = query.trim()
      ? filterPaths([...candidates], query)
      : candidates;
    return source
      .filter((p) =>
        triggerSourcePath === null ? true : p !== triggerSourcePath,
      )
      .filter((p) => !chosenSet.has(p))
      .filter((p) =>
        lockKind === null ? true : kindOfCandidate(p) === lockKind,
      );
  };

  /**
   * Picker sets `triggerKind`; manual entry leaves `unknown` until we infer from
   * path lists / glob shape so auto linkType matches dir vs file intent.
   */
  const effectiveTriggerKind = (): PathKind => {
    if (triggerKind !== 'unknown') {
      return triggerKind;
    }
    const raw = trigger.trim();
    if (!raw) {
      return 'unknown';
    }
    const t = raw.replace(/\/+$/, '');
    if (directorySet.has(t) || raw.endsWith('/**')) {
      return 'dir';
    }
    if (candidates.includes(t)) {
      return kindOfCandidate(t);
    }
    return 'unknown';
  };

  const resolveAutoLinkType = (): LinkType | null => {
    const k = affectKindLock;
    const tk = effectiveTriggerKind();
    if (k === null || tk === 'unknown') {
      return null;
    }
    return linkTypeForPathKinds(tk, k);
  };

  const pickCurrentAffected = (): void => {
    const picked = listAffectCandidates(
      debouncedQuery,
      affects,
      affectKindLock,
    )[affectPickIndex];
    if (picked === undefined) {
      return;
    }
    setPendingPath(picked);
    setReasonDraft('');
    setPhase('affectReason');
  };

  useEffect(() => {
    setTriggerPickIndex((i) => {
      if (triggerFiltered.length === 0) {
        return 0;
      }
      return Math.min(i, triggerFiltered.length - 1);
    });
  }, [triggerFiltered]);

  useEffect(() => {
    const visible = listAffectCandidates(
      debouncedQuery,
      affects,
      affectKindLock,
    );
    setAffectPickIndex((i) => {
      if (visible.length === 0) {
        return 0;
      }
      return Math.min(i, visible.length - 1);
    });
  }, [debouncedQuery, affects, triggerSourcePath, affectKindLock]);

  useInput((_input, key) => {
    if (phase === 'triggerPick') {
      if (key.upArrow) {
        setTriggerPickIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setTriggerPickIndex((i) =>
          Math.min(Math.max(0, triggerFiltered.length - 1), i + 1),
        );
        return;
      }
      if (key.return) {
        const picked = triggerFiltered[triggerPickIndex];
        if (picked === undefined) {
          return;
        }
        const isLikelyDir = pickedTriggerIsDirectory(picked);
        setTriggerKind(isLikelyDir ? 'dir' : 'file');
        setTriggerSourcePath(picked);
        setTrigger(isLikelyDir ? `${picked}/**` : picked);
        setAffectQuery('');
        setAffectPickIndex(0);
        setPhase('affectFilter');
        return;
      }
      if (key.escape) {
        setPhase('triggerMode');
      }
      return;
    }
    if (phase !== 'affectFilter') {
      return;
    }
    if (key.upArrow) {
      setAffectPickIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      const visible = listAffectCandidates(
        debouncedQuery,
        affects,
        affectKindLock,
      );
      setAffectPickIndex((i) =>
        Math.min(Math.max(0, visible.length - 1), i + 1),
      );
      return;
    }
    if (key.return) {
      pickCurrentAffected();
      return;
    }
    if (key.escape) {
      setAffectQuery('');
      return;
    }
  });

  const runCommit = async (
    linkType?: LinkType,
    commit?: { severity?: 'warn' | 'error' },
  ) => {
    const sev = commit?.severity ?? severityRef.current ?? severity;
    if (sev === null) {
      return;
    }
    const triggerText = trigger.trim();
    if (!triggerText) {
      setPhase('triggerMode');
      return;
    }
    const entry: FileLinkEntry = {
      trigger: triggerText,
      affects: affects.map(({ file, reason }) => ({ file, reason })),
      severity: sev,
      ...(linkType !== undefined ? { linkType } : {}),
    };
    const code = await onCommit(entry);
    process.exitCode = code;
    exit();
  };

  if (phase === 'loading') {
    const frames = ['-', '\\', '|', '/'] as const;
    const frame = frames[loadingTick % frames.length];
    return (
      <CliStartLogo
        frame={frame}
        subtitle="Scanning project files for interactive picker..."
      />
    );
  }

  if (loadError !== null) {
    return (
      <Box flexDirection="column">
        <Text color="red">Unable to prepare add wizard.</Text>
        <Text>{loadError}</Text>
      </Box>
    );
  }

  if (phase === 'affectFilter') {
    const visibleAffectCandidates = listAffectCandidates(
      debouncedQuery,
      affects,
      affectKindLock,
    );
    const items = visibleAffectCandidates.map((p) => ({
      label: renderCandidateLabel(p),
      value: p,
    }));
    const active = visibleAffectCandidates[affectPickIndex] ?? null;
    return (
      <Box flexDirection="column">
        <Text bold>Add link entry - affected path</Text>
        <Text dimColor>
          Trigger: <Text color="cyan">{trigger}</Text>
        </Text>
        <Box>
          <Text dimColor>Note: </Text>
          <Text dimColor>live filter </Text>
          <Text color="cyan">› </Text>
          <TextInput
            value={affectQuery}
            onChange={setAffectQuery}
            onSubmit={() => {
              pickCurrentAffected();
            }}
            placeholder="type to filter affected path"
            focus
          />
        </Box>
        <Box flexDirection="column">
          <SelectableList
            items={items}
            selectedIndex={affectPickIndex}
            interactive={false}
            onSelect={(pickedPath) => {
              setPendingPath(pickedPath);
              setReasonDraft('');
              setPhase('affectReason');
            }}
          />
        </Box>
        <Text dimColor>
          Matches: {visibleAffectCandidates.length}{' '}
          {active ? `| selected: ${renderCandidateLabel(active)}` : ''}
        </Text>
        {affectKindLock !== null ? (
          <Text dimColor>
            Locked affected kind: {affectKindLock} (keeps linkType consistent)
          </Text>
        ) : null}
        <Text dimColor>Enter pick | Esc clear filter | ↑/↓ move</Text>
      </Box>
    );
  }

  if (phase === 'triggerMode') {
    return (
      <Box flexDirection="column">
        <Text bold>Trigger setup</Text>
        <Text dimColor>
          Trigger uses minimatch glob patterns, for example: `src/**/*.ts`,
          `**/*.spec.ts`, or `apps/api/**`.
        </Text>
        <SelectableList
          items={[
            { label: 'Enter trigger pattern manually', value: 'manual' },
            { label: 'Pick trigger from file or directory', value: 'pick' },
          ]}
          onSelect={(v) => {
            if (v === 'manual') {
              setTriggerKind('unknown');
              setTriggerSourcePath(null);
              setPhase('triggerManual');
            } else {
              setTriggerQuery('');
              setTriggerPickIndex(0);
              setPhase('triggerPick');
            }
          }}
        />
      </Box>
    );
  }

  if (phase === 'triggerManual') {
    return (
      <Box flexDirection="column">
        <Text bold>Enter trigger pattern (minimatch glob)</Text>
        <Text dimColor>
          Examples: `src/**/*.ts`, `**/*test*.*`, `packages/cli/**`
        </Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={trigger}
            onChange={setTrigger}
            onSubmit={(v: string) => {
              const t = v.trim();
              if (!t) {
                return;
              }
              setTrigger(t);
              setTriggerKind('unknown');
              setTriggerSourcePath(null);
              setAffectQuery('');
              setAffectPickIndex(0);
              setPhase('affectFilter');
            }}
            placeholder="trigger glob"
            focus
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'triggerPick') {
    const items = triggerFiltered.map((p) => ({
      label: renderCandidateLabel(p),
      value: p,
    }));
    const active = triggerFiltered[triggerPickIndex] ?? null;
    return (
      <Box flexDirection="column">
        <Text bold>Pick trigger from file/directory</Text>
        <Text dimColor>
          Selecting a directory turns it into `&lt;dir&gt;/**` automatically.
        </Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={triggerQuery}
            onChange={setTriggerQuery}
            onSubmit={() => {
              const picked = triggerFiltered[triggerPickIndex];
              if (picked === undefined) {
                return;
              }
              const isLikelyDir = pickedTriggerIsDirectory(picked);
              setTriggerKind(isLikelyDir ? 'dir' : 'file');
              setTriggerSourcePath(picked);
              setTrigger(isLikelyDir ? `${picked}/**` : picked);
              setAffectQuery('');
              setAffectPickIndex(0);
              setPhase('affectFilter');
            }}
            placeholder="type to filter trigger candidates"
            focus
          />
        </Box>
        <Box flexDirection="column">
          <SelectableList
            items={items}
            selectedIndex={triggerPickIndex}
            interactive={false}
            onSelect={(picked) => {
              const isLikelyDir = pickedTriggerIsDirectory(picked);
              setTriggerKind(isLikelyDir ? 'dir' : 'file');
              setTriggerSourcePath(picked);
              setTrigger(isLikelyDir ? `${picked}/**` : picked);
              setAffectQuery('');
              setAffectPickIndex(0);
              setPhase('affectFilter');
            }}
          />
        </Box>
        <Text dimColor>
          Matches: {triggerFiltered.length}{' '}
          {active ? `| selected: ${renderCandidateLabel(active)}` : ''}
        </Text>
        <Text dimColor>Enter pick | Esc back | ↑/↓ move</Text>
      </Box>
    );
  }

  if (phase === 'affectReason') {
    return (
      <Box flexDirection="column">
        <Text>
          Reason for <Text color="green">{pendingPath}</Text>
        </Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={reasonDraft}
            onChange={setReasonDraft}
            onSubmit={(v: string) => {
              const r = v.trim() || 'related';
              const kind = kindOfCandidate(pendingPath);
              const nextAffects = [
                ...affects,
                { file: pendingPath, reason: r, kind },
              ];
              setAffects(nextAffects);
              const remaining = listAffectCandidates(
                '',
                nextAffects,
                nextAffects[0]?.kind ?? null,
              );
              if (remaining.length === 0) {
                setPhase('severity');
              } else {
                setPhase('moreAffects');
              }
            }}
            placeholder="reason"
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'moreAffects') {
    return (
      <Box flexDirection="column">
        <Text bold>Add another affected path?</Text>
        <SelectableList
          items={[
            { label: 'Yes — add another', value: 'yes' },
            { label: 'No — continue', value: 'no' },
          ]}
          onSelect={(v) => {
            if (v === 'yes') {
              setAffectQuery('');
              setAffectPickIndex(0);
              setPhase('affectFilter');
            } else {
              setPhase('severity');
            }
          }}
        />
      </Box>
    );
  }

  if (phase === 'severity') {
    return (
      <Box flexDirection="column">
        <Text bold>Severity for this link (policy exit)</Text>
        <SelectableList
          items={[
            {
              label:
                'warn — missing companions print; exit 0 unless error rows',
              value: 'warn',
            },
            {
              label: 'error — missing companions fail check (exit 1)',
              value: 'error',
            },
          ]}
          onSelect={(v) => {
            severityRef.current = v;
            setSeverity(v);
            const auto = resolveAutoLinkType();
            if (auto !== null) {
              void runCommit(auto, { severity: v });
              return;
            }
            setPhase('linkType');
          }}
        />
      </Box>
    );
  }

  if (phase === 'linkType') {
    type Lt = 'skip' | LinkType;
    const items: { label: string; value: Lt }[] = [
      { label: 'Skip (omit)', value: 'skip' },
      ...LINK_TYPES.map((linkType) => ({
        label: `${linkType} - ${LINK_TYPE_DESCRIPTIONS[linkType]}`,
        value: linkType,
      })),
    ];
    return (
      <Box flexDirection="column">
        <Text bold>Optional linkType (metadata)</Text>
        <SelectableList<Lt>
          items={items}
          onSelect={(v) => {
            const sevPick = severityRef.current ?? severity;
            if (sevPick === null) {
              return;
            }
            if (v === 'skip') {
              void runCommit(undefined, { severity: sevPick });
            } else {
              void runCommit(v, { severity: sevPick });
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Text color="red">Unknown phase</Text>
    </Box>
  );
}
