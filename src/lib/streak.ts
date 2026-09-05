import type { Session } from '../data/types'

export const DEFAULT_WEEKLY_GOAL = 1
export const MIN_WEEKLY_GOAL = 1
export const MAX_WEEKLY_GOAL = 7

/**
 * How far back the history listener reaches, and therefore the longest streak
 * we can prove. Sessions are never deleted, so this is purely a read budget.
 */
export const HISTORY_WEEKS = 52

/** Monday 00:00 in the phone's own timezone — the Danish week. */
export function startOfWeek(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  // getDay() puts Sunday at 0, so the Monday-based index is (day + 6) % 7.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

/** Steps whole weeks on the calendar, so the clock change in spring can't drift it. */
export function shiftWeeks(mondayMs: number, weeks: number): number {
  const d = new Date(mondayMs)
  d.setDate(d.getDate() + weeks * 7)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Local calendar day, so two sessions the same evening count as one day. */
function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export type Streak = {
  /** Consecutive weeks that met the goal. */
  weeks: number
  /** Days trained so far in the running week. */
  thisWeek: number
  goal: number
  /** The streak is alive but this week is still short of the goal. */
  atRisk: boolean
}

/**
 * Counts back from this week for as long as every week met the goal. A day
 * counts once no matter how many times you checked in, and the running week
 * only adds to the total once it has actually hit the goal — otherwise the
 * streak would appear to reset every Monday morning.
 */
export function computeStreak(sessions: Session[], goal: number, now: number): Streak {
  const target = Math.min(MAX_WEEKLY_GOAL, Math.max(MIN_WEEKLY_GOAL, Math.round(goal)))

  const daysByWeek = new Map<number, Set<string>>()
  for (const s of sessions) {
    const week = startOfWeek(s.startAt)
    const days = daysByWeek.get(week)
    if (days) days.add(dayKey(s.startAt))
    else daysByWeek.set(week, new Set([dayKey(s.startAt)]))
  }

  const met = (week: number) => (daysByWeek.get(week)?.size ?? 0) >= target

  const thisWeekStart = startOfWeek(now)
  const thisWeek = daysByWeek.get(thisWeekStart)?.size ?? 0

  let weeks = met(thisWeekStart) ? 1 : 0
  const oldest = shiftWeeks(thisWeekStart, -HISTORY_WEEKS)
  for (let week = shiftWeeks(thisWeekStart, -1); week >= oldest && met(week); ) {
    weeks += 1
    week = shiftWeeks(week, -1)
  }

  return { weeks, thisWeek, goal: target, atRisk: weeks > 0 && thisWeek < target }
}

/** "1 uge" / "4 uger" */
export function formatWeeks(weeks: number): string {
  return `${weeks} ${weeks === 1 ? 'uge' : 'uger'}`
}
