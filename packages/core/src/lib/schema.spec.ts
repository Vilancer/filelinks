import { defineLinks } from './schema';

describe('defineLinks', () => {
  it('normalizes omitted config to empty object', () => {
    const { config } = defineLinks([], undefined);
    expect(config).toEqual({});
    expect(Object.keys(config)).toHaveLength(0);
  });

  it('preserves explicit empty config object', () => {
    const { config } = defineLinks([], {});
    expect(config).toEqual({});
    expect(Object.keys(config)).toHaveLength(0);
  });
});
