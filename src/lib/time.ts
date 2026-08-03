/** "16:25" — colon-separated, not the dot that da-DK would give us. */
export function formatClock(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export type DurationPart = { value: number; unit: 't' | 'm' }

/**
 * Splits a duration so the UI can set the numbers and their units in different
 * sizes: 90 → [1t, 30m], 45 → [45m], 120 → [2t].
 */
export function durationParts(minutes: number): DurationPart[] {
  const m = Math.max(0, Math.round(minutes))
  const hours = Math.floor(m / 60)
  const rest = m % 60
  const parts: DurationPart[] = []
  if (hours > 0) parts.push({ value: hours, unit: 't' })
  if (rest > 0 || hours === 0) parts.push({ value: rest, unit: 'm' })
  return parts
}

/** "1t 30m", "45m", "2t" */
export function formatDuration(minutes: number): string {
  return durationParts(minutes)
    .map((p) => `${p.value}${p.unit}`)
    .join(' ')
}

/** "45 min", "1:05" — compact form for countdowns. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export const MINUTE = 60_000
