import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';

import { ConfigNotFoundError } from './errors';
import { normalizeError } from './handleError';

describe('normalizeError', () => {
  it('maps FilelinksError subclass to structured output', () => {
    const err = new ConfigNotFoundError('missing');
    const r = normalizeError(err);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('CONFIG_NOT_FOUND');
    expect(r.message).toContain('missing');
    expect(r.details).toBeUndefined();
  });

  it('maps ParseError to CONFIG_VALIDATION', () => {
    let caught: unknown;
    try {
      Schema.decodeUnknownSync(Schema.String)(null);
    } catch (e) {
      caught = e;
    }
    const r = normalizeError(caught);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('CONFIG_VALIDATION');
    expect(r.message).toBeTruthy();
  });

  it('maps generic Error to UNKNOWN_ERROR', () => {
    const r = normalizeError(new Error('oops'));
    expect(r.ok).toBe(false);
    expect(r.code).toBe('UNKNOWN_ERROR');
    expect(r.message).toBe('oops');
  });

  it('maps string to UNKNOWN', () => {
    const r = normalizeError('plain');
    expect(r.code).toBe('UNKNOWN');
    expect(r.message).toBe('plain');
  });

  it('maps non-object primitive to UNKNOWN', () => {
    const r = normalizeError(42);
    expect(r.code).toBe('UNKNOWN');
    expect(r.message).toBe('42');
  });

  it('never throws', () => {
    expect(() => normalizeError(Symbol('x'))).not.toThrow();
  });
});
