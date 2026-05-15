export const TIER_NAMES: Record<number, string> = {
  1: "TIER I — RECRUTA",
  2: "TIER II — VETERANO",
  3: "TIER III — EXPERIENTE",
  4: "TIER IV — LENDA",
};

export function tierFromReputation(rep: number): number {
  if (rep >= 4000) return 4;
  return Math.min(4, Math.max(1, Math.floor(rep / 1000) + 1));
}

export function nextTierThreshold(rep: number): number {
  const tier = tierFromReputation(rep);
  if (tier >= 4) return 4000;
  return tier * 1000;
}

export function progressToNextTier(rep: number): number {
  const tier = tierFromReputation(rep);
  if (tier >= 4) return 100;
  const base = (tier - 1) * 1000;
  const next = tier * 1000;
  return Math.min(100, Math.max(0, ((rep - base) / (next - base)) * 100));
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  low: "BAIXA",
  medium: "MÉDIA",
  high: "ALTA",
  extreme: "EXTREMA",
};

export const DIFFICULTY_COLOR: Record<string, string> = {
  low: "text-pda-dim",
  medium: "text-primary",
  high: "text-pda-warn",
  extreme: "text-destructive",
};
