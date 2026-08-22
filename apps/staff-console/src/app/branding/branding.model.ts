/** Mirrors `PublicBranding` / the admin read shape from the backend
 *  (`new/code/apps/api/src/platform-branding`). All-null fields mean "use the default Vaidya
 *  brand" — there is no separate "is this tenant branded" flag, the nulls carry that meaning. */
export interface TenantBranding {
  displayName: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
}

export const DEFAULT_BRANDING: TenantBranding = {
  displayName: null,
  primaryColor: null,
  logoUrl: null,
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** The 11-step tint/shade indices PrimeNG's Aura preset expects (`--p-primary-{n}`), matching
 *  `VaidyaTealPreset`'s own `semantic.primary` shape in app.config.ts. */
export const COLOR_RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// Mix ratios toward white (tints, below the 600 "main" step) and toward black (shades, above it) —
// approximates VaidyaTealPreset's own hand-tuned ramp closely enough to look intentional for an
// arbitrary tenant-chosen color, without needing a real color-science library for one CSS effect.
const TINT_RATIOS: Record<number, number> = { 50: 0.95, 100: 0.88, 200: 0.74, 300: 0.58, 400: 0.38, 500: 0.18 };
const SHADE_RATIOS: Record<number, number> = { 700: 0.18, 800: 0.32, 900: 0.46, 950: 0.58 };

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function mix(hex: string, target: 'white' | 'black', ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const t = target === 'white' ? 255 : 0;
  const mixed = [r, g, b].map((c) => clamp255(c + (t - c) * ratio));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Generates the full 50-950 tint/shade ramp PrimeNG's token system expects from one base hex
 *  (treated as the "600" — main action color — step, matching VaidyaTealPreset's own convention). */
export function buildColorRamp(baseHex: string): Record<(typeof COLOR_RAMP_STEPS)[number], string> {
  const ramp = {} as Record<(typeof COLOR_RAMP_STEPS)[number], string>;
  for (const step of COLOR_RAMP_STEPS) {
    if (step === 600) {
      ramp[step] = baseHex;
    } else if (step in TINT_RATIOS) {
      ramp[step] = mix(baseHex, 'white', TINT_RATIOS[step]);
    } else {
      ramp[step] = mix(baseHex, 'black', SHADE_RATIOS[step]);
    }
  }
  return ramp;
}
