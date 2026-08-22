import { buildColorRamp, isValidHexColor } from './branding.model.js';

describe('isValidHexColor', () => {
  it('accepts a well-formed 6-digit hex color', () => {
    expect(isValidHexColor('#006D77')).toBe(true);
    expect(isValidHexColor('#abcdef')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isValidHexColor('teal')).toBe(false);
    expect(isValidHexColor('#006D7')).toBe(false); // too short
    expect(isValidHexColor('006D77')).toBe(false); // no #
    expect(isValidHexColor('')).toBe(false);
  });
});

describe('buildColorRamp', () => {
  it('places the base color at the 600 step unchanged', () => {
    const ramp = buildColorRamp('#006d77');
    expect(ramp[600]).toBe('#006d77');
  });

  it('produces progressively lighter tints below 600 and darker shades above it', () => {
    const ramp = buildColorRamp('#006d77');
    // Lightness (crudely: sum of RGB channels) should increase as the step decreases below 600,
    // and decrease as the step increases above 600.
    const brightness = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);

    expect(brightness(ramp[50])).toBeGreaterThan(brightness(ramp[300]));
    expect(brightness(ramp[300])).toBeGreaterThan(brightness(ramp[600]));
    expect(brightness(ramp[600])).toBeGreaterThan(brightness(ramp[800]));
    expect(brightness(ramp[800])).toBeGreaterThan(brightness(ramp[950]));
  });

  it('returns a value for every step PrimeNG expects', () => {
    const ramp = buildColorRamp('#123abc');
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const) {
      expect(ramp[step]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
