type ExpressionMapLike = Record<string, unknown> | null | undefined;

export type AvatarExpressionAliases = {
  mouthAa: string | null;
  mouthIh: string | null;
  mouthOu: string | null;
  mouthEe: string | null;
  mouthOh: string | null;
  jaw: string | null;
  blink: string | null;
  blinkLeft: string | null;
  blinkRight: string | null;
  happy: string | null;
  relaxed: string | null;
  surprised: string | null;
  lookLeft: string | null;
  lookRight: string | null;
  lookUp: string | null;
  lookDown: string | null;
};

const EXPRESSION_ALIAS_GROUPS: Record<keyof AvatarExpressionAliases, string[]> = {
  mouthAa: ['aa', 'Aa', 'A', 'a'],
  mouthIh: ['ih', 'Ih', 'I', 'i'],
  mouthOu: ['ou', 'Ou', 'U', 'u'],
  mouthEe: ['ee', 'Ee', 'E', 'e'],
  mouthOh: ['oh', 'Oh', 'O', 'o'],
  jaw: ['jaw', 'Jaw', 'open', 'Open'],
  blink: ['blink', 'Blink'],
  blinkLeft: ['blinkLeft', 'BlinkLeft', 'blink_left', 'blinkleft'],
  blinkRight: ['blinkRight', 'BlinkRight', 'blink_right', 'blinkright'],
  happy: ['happy', 'Happy', 'smile', 'Smile'],
  relaxed: ['relaxed', 'Relaxed'],
  surprised: ['surprised', 'Surprised', 'surprise', 'Surprise'],
  lookLeft: ['lookLeft', 'LookLeft', 'look_left', 'lookleft'],
  lookRight: ['lookRight', 'LookRight', 'look_right', 'lookright'],
  lookUp: ['lookUp', 'LookUp', 'look_up', 'lookup'],
  lookDown: ['lookDown', 'LookDown', 'look_down', 'lookdown'],
};

function normalizeExpressionKey(key: string): string {
  return key.replace(/[\s_-]/g, '').toLowerCase();
}

function findAliasKey(expressionMap: ExpressionMapLike, aliases: string[]): string | null {
  if (!expressionMap) return null;

  const keys = Object.keys(expressionMap);
  if (keys.length === 0) return null;

  const normalizedMap = new Map<string, string>();
  for (const key of keys) {
    normalizedMap.set(normalizeExpressionKey(key), key);
  }

  for (const alias of aliases) {
    const directHit = expressionMap[alias];
    if (directHit) {
      return alias;
    }

    const normalizedHit = normalizedMap.get(normalizeExpressionKey(alias));
    if (normalizedHit) {
      return normalizedHit;
    }
  }

  return null;
}

export function resolveExpressionAliases(expressionMap: ExpressionMapLike): AvatarExpressionAliases {
  return {
    mouthAa: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.mouthAa),
    mouthIh: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.mouthIh),
    mouthOu: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.mouthOu),
    mouthEe: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.mouthEe),
    mouthOh: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.mouthOh),
    jaw: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.jaw),
    blink: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.blink),
    blinkLeft: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.blinkLeft),
    blinkRight: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.blinkRight),
    happy: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.happy),
    relaxed: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.relaxed),
    surprised: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.surprised),
    lookLeft: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.lookLeft),
    lookRight: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.lookRight),
    lookUp: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.lookUp),
    lookDown: findAliasKey(expressionMap, EXPRESSION_ALIAS_GROUPS.lookDown),
  };
}

export function listResolvedExpressionKeys(aliases: AvatarExpressionAliases): string[] {
  return Object.values(aliases).filter((value): value is string => Boolean(value));
}

export function getExpressionCapabilities(aliases: AvatarExpressionAliases) {
  return {
    hasMouth:
      Boolean(aliases.mouthAa) ||
      Boolean(aliases.mouthIh) ||
      Boolean(aliases.mouthOu) ||
      Boolean(aliases.mouthEe) ||
      Boolean(aliases.mouthOh),
    hasJaw: Boolean(aliases.jaw),
    hasBlink: Boolean(aliases.blink) || Boolean(aliases.blinkLeft) || Boolean(aliases.blinkRight),
    hasAffect:
      Boolean(aliases.happy) || Boolean(aliases.relaxed) || Boolean(aliases.surprised),
    hasGaze:
      Boolean(aliases.lookLeft) ||
      Boolean(aliases.lookRight) ||
      Boolean(aliases.lookUp) ||
      Boolean(aliases.lookDown),
  };
}
