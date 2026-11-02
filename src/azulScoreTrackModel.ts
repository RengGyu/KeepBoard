export interface NumericTrackRange { min: number; max: number }

/** Unknown or off-track values stay visible in the scalar editor; never clamp them onto a different space. */
export function scoreTrackValue(value: unknown, range: NumericTrackRange): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= range.min && value <= range.max
    ? value
    : null;
}

export function scoreForTrackSlot(value: number, range: NumericTrackRange): number | null {
  return Number.isInteger(value) && value >= range.min && value <= range.max ? value : null;
}
