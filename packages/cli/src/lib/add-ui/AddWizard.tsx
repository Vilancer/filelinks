import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';

import {
  LINK_TYPES,
  LINK_TYPE_DESCRIPTIONS,
  linkTypeForPathKinds,
} from '@filelinks/core';
import {
  parseModelOptionKey,
  type AgentModelOption,
  type AgentModelParameter,
  type AgentRunPolicy,
  type AgentRuntime,
  type AgentSettings,
  type FileLinkEntry,
  type LinkType,
  type PromptConfig,
} from '@filelinks/core';

import { filterPaths } from '../pathCandidates.js';
import { CliStartLogo } from '../ui/CliStartLogo.js';
import { ModelPickerPhase } from './ModelPickerPhase.js';
import { SelectableList } from './SelectableList.js';
import type { AddCommitPayload } from './types.js';

export type AddWizardProps = {
  readonly cwd: string;
  readonly loadCandidates: () => Promise<
    | string[]
    | {
        readonly candidates: string[];
        readonly directories: string[];
      }
  >;
  readonly loadModels: (
    agent: AgentSettings,
    cwd: string,
  ) => Promise<AgentModelOption[]>;
  readonly existingGlobalAgentSummary?: string;
  readonly onCommit: (payload: AddCommitPayload) => Promise<number>;
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
  | 'linkType'
  | 'agentGlobalPrompt'
  | 'agentGlobalPolicy'
  | 'agentGlobalRuntime'
  | 'agentGlobalLocalCwd'
  | 'agentGlobalCloudRepos'
  | 'agentGlobalModel'
  | 'agentGlobalModelManual'
  | 'agentLinkPrompt'
  | 'agentLinkPolicy'
  | 'agentLinkRuntime'
  | 'agentLinkLocalCwd'
  | 'agentLinkCloudRepos'
  | 'agentLinkModel'
  | 'agentLinkModelManual'
  | 'promptGlobalPrompt'
  | 'promptGlobalSystem'
  | 'promptGlobalTemperature'
  | 'promptGlobalMaxTokens'
  | 'promptLinkPrompt'
  | 'promptLinkSystem'
  | 'promptLinkTemperature'
  | 'promptLinkMaxTokens';

export function AddWizard({
  cwd,
  loadCandidates,
  loadModels,
  existingGlobalAgentSummary,
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
  const [selectedLinkType, setSelectedLinkType] = useState<
    LinkType | undefined
  >(undefined);
  const [globalAgent, setGlobalAgent] = useState<AgentSettings | undefined>(
    undefined,
  );
  const [globalAgentRunPolicy, setGlobalAgentRunPolicy] =
    useState<AgentRunPolicy>('trigger-only');
  const [globalAgentModelDraft, setGlobalAgentModelDraft] = useState('');
  const [globalModelOptions, setGlobalModelOptions] = useState<
    AgentModelOption[]
  >([]);
  const [globalModelError, setGlobalModelError] = useState<string | null>(null);
  const [globalLocalCwd, setGlobalLocalCwd] = useState('.');
  const [globalCloudReposDraft, setGlobalCloudReposDraft] = useState('');
  const [entryAgent, setEntryAgent] = useState<AgentSettings | undefined>(
    undefined,
  );
  const [entryAgentRunPolicy, setEntryAgentRunPolicy] =
    useState<AgentRunPolicy>('trigger-only');
  const [entryAgentModelDraft, setEntryAgentModelDraft] = useState('');
  const [entryModelOptions, setEntryModelOptions] = useState<
    AgentModelOption[]
  >([]);
  const [entryModelError, setEntryModelError] = useState<string | null>(null);
  const [entryLocalCwd, setEntryLocalCwd] = useState('.');
  const [entryCloudReposDraft, setEntryCloudReposDraft] = useState('');
  const [globalPrompt, setGlobalPrompt] = useState<PromptConfig | undefined>(
    undefined,
  );
  const [entryPrompt, setEntryPrompt] = useState<PromptConfig | undefined>(
    undefined,
  );
  const [globalSystemPromptDraft, setGlobalSystemPromptDraft] = useState('');
  const [globalTemperatureDraft, setGlobalTemperatureDraft] = useState('');
  const [globalMaxTokensDraft, setGlobalMaxTokensDraft] = useState('');
  const [entrySystemPromptDraft, setEntrySystemPromptDraft] = useState('');
  const [entryTemperatureDraft, setEntryTemperatureDraft] = useState('');
  const [entryMaxTokensDraft, setEntryMaxTokensDraft] = useState('');
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

  const parseRepos = (draft: string): string[] =>
    draft
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const buildAgentSettings = (
    runtime: AgentRuntime,
    runPolicy: AgentRunPolicy = 'trigger-only',
    values: { localCwd?: string; cloudRepos?: string[] },
  ): AgentSettings => ({
    runPolicy,
    provider: 'cursor',
    runtime,
    ...(runtime === 'local'
      ? { local: { cwd: values.localCwd ?? '.' } }
      : { cloud: { repos: values.cloudRepos ?? [] } }),
  });

  const withModel = (
    agent: AgentSettings | undefined,
    model: string,
    modelParams?: AgentModelParameter[],
  ): AgentSettings | undefined => {
    if (agent === undefined) {
      return undefined;
    }
    const trimmed = model.trim();
    if (!trimmed) {
      return agent;
    }
    const base: AgentSettings = { ...agent, model: trimmed };
    if (modelParams?.length) {
      return { ...base, modelParams };
    }
    const { modelParams: _drop, ...withoutParams } = base;
    void _drop;
    return withoutParams;
  };

  const parseOptionalNumber = (draft: string): number | undefined => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return undefined;
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num)) {
      return undefined;
    }
    return num;
  };

  const isInvalidOptionalNumberDraft = (draft: string): boolean => {
    const trimmed = draft.trim();
    return trimmed.length > 0 && parseOptionalNumber(trimmed) === undefined;
  };

  const isInvalidOptionalIntegerDraft = (draft: string): boolean => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return false;
    }
    const num = Number(trimmed);
    return !Number.isFinite(num) || !Number.isInteger(num);
  };

  const parseOptionalInteger = (draft: string): number | undefined => {
    const n = parseOptionalNumber(draft);
    if (n === undefined) {
      return undefined;
    }
    return Math.trunc(n);
  };

  const buildPromptConfig = (
    systemPromptDraft: string,
    temperatureDraft: string,
    maxTokensDraft: string,
  ): PromptConfig | undefined => {
    const systemPrompt = systemPromptDraft.trim();
    const temperature = parseOptionalNumber(temperatureDraft);
    const maxTokens = parseOptionalInteger(maxTokensDraft);
    const prompt: PromptConfig = {
      ...(systemPrompt ? { systemPrompt } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { maxTokens } : {}),
    };
    return Object.keys(prompt).length > 0 ? prompt : undefined;
  };

  const beginModelSelection = async (
    scope: 'global' | 'link',
    agent: AgentSettings,
  ) => {
    if (scope === 'global') {
      setGlobalModelError(null);
      setGlobalModelOptions([]);
    } else {
      setEntryModelError(null);
      setEntryModelOptions([]);
    }
    try {
      const models = await loadModels(agent, cwd);
      if (scope === 'global') {
        setGlobalModelOptions(models);
      } else {
        setEntryModelOptions(models);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (scope === 'global') {
        setGlobalModelError(msg);
      } else {
        setEntryModelError(msg);
      }
    }
    setPhase(scope === 'global' ? 'agentGlobalModel' : 'agentLinkModel');
  };

  const runCommit = async () => {
    const sev = severityRef.current ?? severity;
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
      ...(selectedLinkType !== undefined ? { linkType: selectedLinkType } : {}),
      ...(entryAgent !== undefined ? { agent: entryAgent } : {}),
      ...(entryPrompt !== undefined ? { prompt: entryPrompt } : {}),
    };
    const code = await onCommit({
      entry,
      ...(globalAgent !== undefined ? { configAgent: globalAgent } : {}),
      ...(globalPrompt !== undefined ? { configPrompt: globalPrompt } : {}),
    });
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
              setSelectedLinkType(auto);
              setPhase('agentGlobalPrompt');
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
              setSelectedLinkType(undefined);
            } else {
              setSelectedLinkType(v);
            }
            setPhase('agentGlobalPrompt');
          }}
        />
      </Box>
    );
  }

  if (phase === 'agentGlobalPrompt') {
    return (
      <Box flexDirection="column">
        <Text bold>Global agent defaults (optional)</Text>
        <Text dimColor>
          Set global config.agent defaults now? (provider cursor + explicit
          runPolicy)
        </Text>
        {existingGlobalAgentSummary ? (
          <Text dimColor>
            Existing global agent: {existingGlobalAgentSummary}
          </Text>
        ) : null}
        <SelectableList
          items={[
            { label: 'Yes — configure global agent defaults', value: 'yes' },
            { label: 'No — skip global defaults', value: 'no' },
          ]}
          onSelect={(v) => {
            if (v === 'yes') {
              setGlobalAgentRunPolicy('trigger-only');
              setPhase('agentGlobalPolicy');
            } else {
              setGlobalAgent(undefined);
              setPhase('agentLinkPrompt');
            }
          }}
        />
      </Box>
    );
  }

  if (phase === 'agentGlobalPolicy') {
    return (
      <Box flexDirection="column">
        <Text bold>Global run policy</Text>
        <Text dimColor>
          Choose how often global agents run when a link is staged.
        </Text>
        <SelectableList<AgentRunPolicy>
          items={[
            {
              label:
                'trigger-only (default) - Run agent only when trigger path is staged.',
              value: 'trigger-only',
            },
            {
              label:
                'trigger-or-affects - Run agent when trigger or affected path is staged.',
              value: 'trigger-or-affects',
            },
          ]}
          onSelect={(v) => {
            setGlobalAgentRunPolicy(v);
            setPhase('agentGlobalRuntime');
          }}
        />
      </Box>
    );
  }

  if (phase === 'agentGlobalRuntime') {
    return (
      <Box flexDirection="column">
        <Text bold>Global runtime</Text>
        <SelectableList<AgentRuntime>
          items={[
            { label: 'local — run against local cwd', value: 'local' },
            { label: 'cloud — run against cloud repos[]', value: 'cloud' },
          ]}
          onSelect={(v) => {
            if (v === 'local') {
              setPhase('agentGlobalLocalCwd');
            } else {
              setPhase('agentGlobalCloudRepos');
            }
          }}
        />
      </Box>
    );
  }

  if (phase === 'agentGlobalLocalCwd') {
    return (
      <Box flexDirection="column">
        <Text bold>Global local.cwd</Text>
        <Text dimColor>
          Path used by Cursor local runtime. Example: "." or an absolute path.
        </Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={globalLocalCwd}
            onChange={setGlobalLocalCwd}
            onSubmit={(v: string) => {
              const cwd = v.trim() || '.';
              setGlobalLocalCwd(cwd);
              const nextGlobalAgent = buildAgentSettings(
                'local',
                globalAgentRunPolicy,
                {
                  localCwd: cwd,
                },
              );
              setGlobalAgent(nextGlobalAgent);
              void beginModelSelection('global', nextGlobalAgent);
            }}
            placeholder="local cwd (for example .)"
            focus
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'agentGlobalCloudRepos') {
    return (
      <Box flexDirection="column">
        <Text bold>Global cloud.repos</Text>
        <Text dimColor>
          Comma-separated repo slugs (for example: org/repo, org/another-repo)
        </Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={globalCloudReposDraft}
            onChange={setGlobalCloudReposDraft}
            onSubmit={(v: string) => {
              const repos = parseRepos(v);
              if (repos.length === 0) {
                return;
              }
              setGlobalCloudReposDraft(v);
              const nextGlobalAgent = buildAgentSettings(
                'cloud',
                globalAgentRunPolicy,
                {
                  cloudRepos: repos,
                },
              );
              setGlobalAgent(nextGlobalAgent);
              void beginModelSelection('global', nextGlobalAgent);
            }}
            placeholder="org/repo, org/another-repo"
            focus
          />
        </Box>
        <Text dimColor>Enter at least one repo slug.</Text>
      </Box>
    );
  }

  if (phase === 'agentGlobalModel') {
    return (
      <ModelPickerPhase
        title="Global model"
        subtitle="Select model for global config.agent"
        error={globalModelError}
        options={globalModelOptions}
        onManual={() => setPhase('agentGlobalModelManual')}
        onSelectModel={(key) => {
          const picked = parseModelOptionKey(key);
          setGlobalAgent(withModel(globalAgent, picked.id, picked.params));
          setPhase('agentLinkPrompt');
        }}
      />
    );
  }

  if (phase === 'agentGlobalModelManual') {
    return (
      <Box flexDirection="column">
        <Text bold>Global model (manual)</Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={globalAgentModelDraft}
            onChange={setGlobalAgentModelDraft}
            onSubmit={(v: string) => {
              const model = v.trim();
              if (!model) {
                return;
              }
              setGlobalAgentModelDraft(model);
              setGlobalAgent(withModel(globalAgent, model));
              setPhase('agentLinkPrompt');
            }}
            placeholder="for example composer-2.5"
            focus
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'agentLinkPrompt') {
    return (
      <Box flexDirection="column">
        <Text bold>Per-link agent override (optional)</Text>
        <Text dimColor>
          Add `entry.agent` for this link? Choose skip to inherit global agent.
        </Text>
        <SelectableList
          items={[
            {
              label: 'Use global only (no per-link override)',
              value: 'skip',
            },
            { label: 'Add per-link agent override', value: 'yes' },
          ]}
          onSelect={(v) => {
            if (v === 'yes') {
              setEntryAgentRunPolicy('trigger-only');
              setPhase('agentLinkPolicy');
            } else {
              setEntryAgent(undefined);
              setPhase('promptGlobalPrompt');
            }
          }}
        />
      </Box>
    );
  }

  if (phase === 'agentLinkPolicy') {
    return (
      <Box flexDirection="column">
        <Text bold>Per-link run policy</Text>
        <Text dimColor>Choose how often this link's agent override runs.</Text>
        <SelectableList<AgentRunPolicy>
          items={[
            {
              label:
                'trigger-only (default) - Run agent only when trigger path is staged.',
              value: 'trigger-only',
            },
            {
              label:
                'trigger-or-affects - Run agent when trigger or affected path is staged.',
              value: 'trigger-or-affects',
            },
          ]}
          onSelect={(v) => {
            setEntryAgentRunPolicy(v);
            setPhase('agentLinkRuntime');
          }}
        />
      </Box>
    );
  }

  if (phase === 'agentLinkRuntime') {
    return (
      <Box flexDirection="column">
        <Text bold>Per-link runtime</Text>
        <SelectableList<AgentRuntime>
          items={[
            { label: 'local — override with local.cwd', value: 'local' },
            { label: 'cloud — override with cloud.repos[]', value: 'cloud' },
          ]}
          onSelect={(v) => {
            if (v === 'local') {
              setPhase('agentLinkLocalCwd');
            } else {
              setPhase('agentLinkCloudRepos');
            }
          }}
        />
      </Box>
    );
  }

  if (phase === 'agentLinkLocalCwd') {
    return (
      <Box flexDirection="column">
        <Text bold>Per-link local.cwd</Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={entryLocalCwd}
            onChange={setEntryLocalCwd}
            onSubmit={(v: string) => {
              const cwd = v.trim() || '.';
              setEntryLocalCwd(cwd);
              const nextEntryAgent = buildAgentSettings(
                'local',
                entryAgentRunPolicy,
                {
                  localCwd: cwd,
                },
              );
              setEntryAgent(nextEntryAgent);
              void beginModelSelection('link', nextEntryAgent);
            }}
            placeholder="local cwd (for example .)"
            focus
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'agentLinkCloudRepos') {
    return (
      <Box flexDirection="column">
        <Text bold>Per-link cloud.repos</Text>
        <Text dimColor>Comma-separated repo slugs</Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={entryCloudReposDraft}
            onChange={setEntryCloudReposDraft}
            onSubmit={(v: string) => {
              const repos = parseRepos(v);
              if (repos.length === 0) {
                return;
              }
              setEntryCloudReposDraft(v);
              const nextEntryAgent = buildAgentSettings(
                'cloud',
                entryAgentRunPolicy,
                {
                  cloudRepos: repos,
                },
              );
              setEntryAgent(nextEntryAgent);
              void beginModelSelection('link', nextEntryAgent);
            }}
            placeholder="org/repo, org/another-repo"
            focus
          />
        </Box>
        <Text dimColor>Enter at least one repo slug.</Text>
      </Box>
    );
  }

  if (phase === 'agentLinkModel') {
    return (
      <ModelPickerPhase
        title="Per-link model override"
        subtitle="Select model for entry.agent override"
        error={entryModelError}
        options={entryModelOptions}
        onManual={() => setPhase('agentLinkModelManual')}
        onSelectModel={(key) => {
          const picked = parseModelOptionKey(key);
          setEntryAgent(withModel(entryAgent, picked.id, picked.params));
          setPhase('promptGlobalPrompt');
        }}
      />
    );
  }

  if (phase === 'agentLinkModelManual') {
    return (
      <Box flexDirection="column">
        <Text bold>Per-link model (manual)</Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={entryAgentModelDraft}
            onChange={setEntryAgentModelDraft}
            onSubmit={(v: string) => {
              const model = v.trim();
              if (!model) {
                return;
              }
              setEntryAgentModelDraft(model);
              setEntryAgent(withModel(entryAgent, model));
              setPhase('promptGlobalPrompt');
            }}
            placeholder="for example composer-2.5"
            focus
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'promptGlobalPrompt') {
    return (
      <Box flexDirection="column">
        <Text bold>Global prompt config (optional)</Text>
        <SelectableList
          items={[
            { label: 'Set global prompt', value: 'yes' },
            { label: 'Skip global prompt', value: 'no' },
          ]}
          onSelect={(v) => {
            if (v === 'yes') {
              setPhase('promptGlobalSystem');
            } else {
              setGlobalPrompt(undefined);
              setPhase('promptLinkPrompt');
            }
          }}
        />
      </Box>
    );
  }

  if (phase === 'promptGlobalSystem') {
    return (
      <Box flexDirection="column">
        <Text bold>Global prompt.systemPrompt (optional)</Text>
        <Text dimColor>Leave empty to skip.</Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={globalSystemPromptDraft}
            onChange={setGlobalSystemPromptDraft}
            onSubmit={(v: string) => {
              setGlobalSystemPromptDraft(v);
              setPhase('promptGlobalTemperature');
            }}
            placeholder="system prompt"
            focus
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'promptGlobalTemperature') {
    const invalid = isInvalidOptionalNumberDraft(globalTemperatureDraft);
    return (
      <Box flexDirection="column">
        <Text bold>Global prompt.temperature (optional number)</Text>
        <Text dimColor>Leave empty to skip.</Text>
        {invalid ? (
          <Text color="red">Enter a valid number or leave empty.</Text>
        ) : null}
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={globalTemperatureDraft}
            onChange={setGlobalTemperatureDraft}
            onSubmit={(v: string) => {
              setGlobalTemperatureDraft(v);
              if (isInvalidOptionalNumberDraft(v)) {
                return;
              }
              setPhase('promptGlobalMaxTokens');
            }}
            placeholder="for example 0.2"
            focus
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'promptGlobalMaxTokens') {
    const invalid = isInvalidOptionalIntegerDraft(globalMaxTokensDraft);
    return (
      <Box flexDirection="column">
        <Text bold>Global prompt.maxTokens (optional integer)</Text>
        <Text dimColor>Leave empty to skip.</Text>
        {invalid ? (
          <Text color="red">Enter a valid integer or leave empty.</Text>
        ) : null}
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={globalMaxTokensDraft}
            onChange={setGlobalMaxTokensDraft}
            onSubmit={(v: string) => {
              setGlobalMaxTokensDraft(v);
              if (isInvalidOptionalIntegerDraft(v)) {
                return;
              }
              setGlobalPrompt(
                buildPromptConfig(
                  globalSystemPromptDraft,
                  globalTemperatureDraft,
                  v,
                ),
              );
              setPhase('promptLinkPrompt');
            }}
            placeholder="for example 1200"
            focus
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'promptLinkPrompt') {
    return (
      <Box flexDirection="column">
        <Text bold>Per-link prompt override (optional)</Text>
        <SelectableList
          items={[
            { label: 'Set per-link prompt override', value: 'yes' },
            { label: 'Skip per-link prompt override', value: 'no' },
          ]}
          onSelect={(v) => {
            if (v === 'yes') {
              setPhase('promptLinkSystem');
            } else {
              setEntryPrompt(undefined);
              void runCommit();
            }
          }}
        />
      </Box>
    );
  }

  if (phase === 'promptLinkSystem') {
    return (
      <Box flexDirection="column">
        <Text bold>Per-link prompt.systemPrompt (optional)</Text>
        <Text dimColor>Leave empty to skip.</Text>
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={entrySystemPromptDraft}
            onChange={setEntrySystemPromptDraft}
            onSubmit={(v: string) => {
              setEntrySystemPromptDraft(v);
              setPhase('promptLinkTemperature');
            }}
            placeholder="system prompt override"
            focus
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'promptLinkTemperature') {
    const invalid = isInvalidOptionalNumberDraft(entryTemperatureDraft);
    return (
      <Box flexDirection="column">
        <Text bold>Per-link prompt.temperature (optional number)</Text>
        <Text dimColor>Leave empty to skip.</Text>
        {invalid ? (
          <Text color="red">Enter a valid number or leave empty.</Text>
        ) : null}
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={entryTemperatureDraft}
            onChange={setEntryTemperatureDraft}
            onSubmit={(v: string) => {
              setEntryTemperatureDraft(v);
              if (isInvalidOptionalNumberDraft(v)) {
                return;
              }
              setPhase('promptLinkMaxTokens');
            }}
            placeholder="for example 0.2"
            focus
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'promptLinkMaxTokens') {
    const invalid = isInvalidOptionalIntegerDraft(entryMaxTokensDraft);
    return (
      <Box flexDirection="column">
        <Text bold>Per-link prompt.maxTokens (optional integer)</Text>
        <Text dimColor>Leave empty to skip.</Text>
        {invalid ? (
          <Text color="red">Enter a valid integer or leave empty.</Text>
        ) : null}
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={entryMaxTokensDraft}
            onChange={setEntryMaxTokensDraft}
            onSubmit={(v: string) => {
              setEntryMaxTokensDraft(v);
              if (isInvalidOptionalIntegerDraft(v)) {
                return;
              }
              setEntryPrompt(
                buildPromptConfig(
                  entrySystemPromptDraft,
                  entryTemperatureDraft,
                  v,
                ),
              );
              void runCommit();
            }}
            placeholder="for example 1200"
            focus
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Text color="red">Unknown phase</Text>
    </Box>
  );
}
