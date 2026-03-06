import {
  getExpressionCapabilities,
  listResolvedExpressionKeys,
  resolveExpressionAliases,
} from './expressionAliases';

describe('avatar expression alias resolution', () => {
  it('resolves mixed-case VRM expression names', () => {
    const aliases = resolveExpressionAliases({
      Aa: {},
      Blink: {},
      Jaw: {},
      LookLeft: {},
      relaxed: {},
      Surprise: {},
    });

    expect(aliases.mouthAa).toBe('Aa');
    expect(aliases.blink).toBe('Blink');
    expect(aliases.jaw).toBe('Jaw');
    expect(aliases.lookLeft).toBe('LookLeft');
    expect(aliases.relaxed).toBe('relaxed');
    expect(aliases.surprised).toBe('Surprise');
    expect(listResolvedExpressionKeys(aliases)).toEqual(
      expect.arrayContaining(['Aa', 'Blink', 'Jaw', 'LookLeft', 'relaxed', 'Surprise'])
    );
  });

  it('reports graceful fallback capabilities when mouth expressions are missing', () => {
    const aliases = resolveExpressionAliases({
      Blink: {},
      Open: {},
    });
    const capabilities = getExpressionCapabilities(aliases);

    expect(capabilities.hasMouth).toBe(false);
    expect(capabilities.hasJaw).toBe(true);
    expect(capabilities.hasBlink).toBe(true);
  });
});
