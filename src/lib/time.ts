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

/** "08:30-09:30" — the label a calendar block wears. */
export function formatRange(startAt: number, endAt: number): string {
  return `${formatClock(startAt)}-${formatClock(endAt)}`
}

export const MINUTE = 60_000
export const HOUR = 3_600_000

/** Midnight in the phone's own timezone. */
export function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Steps whole calendar days, so the clock change in spring can't drift it. */
export function addDays(ms: number, days: number): number {
  const d = new Date(ms)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

/** Keeps the clock time from `at`, but moves it onto the day `dayStart` opens. */
export function withTimeOnDay(at: number, dayStart: number): number {
  const src = new Date(at)
  const dest = new Date(dayStart)
  dest.setHours(src.getHours(), src.getMinutes(), 0, 0)
  return dest.getTime()
}

// Spelled out rather than left to Intl, which gives us "tor." and "10. sep."
const DAY_NAMES = ['Søn', 'Man', 'Tirs', 'Ons', 'Tors', 'Fre', 'Lør']
const MONTH_NAMES = [
  'jan',
  'feb',
  'mar',
  'apr',
  'maj',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
]

/** "Tors - 10 sep" */
export function formatDayLabel(ms: number): string {
  const d = new Date(ms)
  return `${DAY_NAMES[d.getDay()]} - ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

/** "i dag", "i morgen" or "tors 10 sep" — for prose rather than column heads. */
export function formatDayWord(ms: number, now: number): string {
  const days = Math.round((startOfDay(ms) - startOfDay(now)) / 86_400_000)
  if (days === 0) return 'i dag'
  if (days === 1) return 'i morgen'
  const d = new Date(ms)
  return `${DAY_NAMES[d.getDay()].toLowerCase()} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}
