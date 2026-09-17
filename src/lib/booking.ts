import type { Booking, Session } from '../data/types'
import { addDays, MINUTE } from './time'

/**
 * The gym's day: the hours the calendar draws, and therefore the only hours a
 * booking is allowed to fall inside.
 */
export const DAY_FIRST_HOUR = 6
export const DAY_LAST_HOUR = 24

/** How many days ahead the calendar draws — a booking can't be placed past it. */
export const CALENDAR_DAYS = 7

/** Bookings are set in quarters of an hour — finer than that is false precision. */
export const BOOKING_STEP = 15

export type RepeatFrequency = 'daily' | 'weekly'

/**
 * How many times a repeating booking is laid down. Far enough to feel
 * automatic without silently filling a year of everyone else's calendar with
 * one person's standing slot.
 */
export const REPEAT_OCCURRENCES = 12

const REPEAT_STEP_DAYS: Record<RepeatFrequency, number> = {
  daily: 1,
  weekly: 7,
}

/** Every occurrence of a repeating booking, the first one included. */
export function repeatDates(
  startAt: number,
  endAt: number,
  freq: RepeatFrequency,
): { startAt: number; endAt: number }[] {
  const step = REPEAT_STEP_DAYS[freq]
  return Array.from({ length: REPEAT_OCCURRENCES }, (_, i) => ({
    startAt: addDays(startAt, i * step),
    endAt: addDays(endAt, i * step),
  }))
}

/**
 * What marks two bookings as occurrences of the same repeat. Bookings written
 * before `seriesId` existed fall back to the moment they were laid down, which
 * every occurrence of one batch shares.
 */
function seriesKey(booking: Booking): string {
  return booking.seriesId ?? `${booking.memberId}:${booking.createdAt}`
}

/**
 * The occurrences of `booking`'s repeat that are still ahead of us, the one
 * passed in included. A one-off booking is a series of exactly itself, so
 * callers can tell a real repeat by the length.
 */
export function futureSeries(bookings: Booking[], booking: Booking, now: number): Booking[] {
  const key = seriesKey(booking)
  return bookings
    .filter((b) => b.endAt > now && seriesKey(b) === key)
    .sort((a, b) => a.startAt - b.startAt)
}

/** A repeat collapsed into one entry, so a standing slot reads as one thing. */
export type BookingSeries = {
  key: string
  memberId: string
  memberName: string
  /** The soonest occurrence still to come, and the one furthest out. */
  next: Booking
  last: Booking
  /** Every occurrence in the set — one on a booking that doesn't repeat. */
  ids: string[]
}

/**
 * Every booking still ahead of us, grouped into the repeat it belongs to and
 * ordered by how soon it is. The calendar only draws a week, so this is the
 * only place the far end of a repeat can be seen — or called off.
 */
export function upcomingSeries(bookings: Booking[], now: number): BookingSeries[] {
  const groups = new Map<string, Booking[]>()
  for (const b of bookings) {
    if (b.endAt <= now) continue
    const key = seriesKey(b)
    const found = groups.get(key)
    if (found) found.push(b)
    else groups.set(key, [b])
  }
  return [...groups]
    .map(([key, list]) => {
      const sorted = list.sort((a, b) => a.startAt - b.startAt)
      return {
        key,
        memberId: sorted[0].memberId,
        memberName: sorted[0].memberName,
        next: sorted[0],
        last: sorted[sorted.length - 1],
        ids: sorted.map((b) => b.id),
      }
    })
    .sort((a, b) => a.next.startAt - b.next.startAt)
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Rounds up to the next quarter, so "now" never lands on an awkward 14:07. */
export function ceilToStep(ms: number): number {
  const step = BOOKING_STEP * MINUTE
  return Math.ceil(ms / step) * step
}

/**
 * How a blocked-out time actually turned out. The whole point of keeping
 * bookings and check-ins apart: a booking on its own proves nothing.
 */
export type BookingState =
  /** Still ahead of us. */
  | 'planned'
  /** Its time is now, and nobody has checked in. */
  | 'waiting'
  /** Checked in and training right now. */
  | 'active'
  /** Over and done, and they did turn up. */
  | 'attended'
  /** Over, and nobody ever checked in. */
  | 'missed'

export type CalendarItem = {
  key: string
  memberId: string
  memberName: string
  startAt: number
  endAt: number
  state: BookingState
  /** Someone who just turned up and checked in has no booking behind them. */
  booking: Booking | null
  session: Session | null
  guests: number
}

/** The check-in that answers for a booking: same person, overlapping time. */
export function sessionForBooking(booking: Booking, sessions: Session[]): Session | null {
  const hits = sessions.filter(
    (s) =>
      s.memberId === booking.memberId &&
      overlaps(booking.startAt, booking.endAt, s.startAt, Math.max(s.endAt, s.startAt + 1)),
  )
  if (hits.length === 0) return null
  // A running session is the one worth reporting, however many finished ones
  // share the window.
  return hits.find((s) => s.active) ?? hits[0]
}

function isRunning(session: Session, now: number): boolean {
  return session.active && session.endAt > now
}

/**
 * One row of truth per person and time slot: every booking, plus the check-ins
 * that nobody booked for.
 */
export function buildCalendarItems(
  bookings: Booking[],
  sessions: Session[],
  now: number,
): CalendarItem[] {
  const items: CalendarItem[] = []
  const claimed = new Set<string>()

  for (const b of bookings) {
    const session = sessionForBooking(b, sessions)
    if (session) claimed.add(session.id)
    items.push({
      key: `b:${b.id}`,
      memberId: b.memberId,
      memberName: b.memberName,
      // A booking keeps its own shape in the grid even if the session it was
      // checked into runs longer, so you can see what was promised.
      startAt: b.startAt,
      endAt: b.endAt,
      state: session
        ? isRunning(session, now)
          ? 'active'
          : 'attended'
        : b.startAt > now
          ? 'planned'
          : b.endAt > now
            ? 'waiting'
            : 'missed',
      booking: b,
      session,
      guests: session?.guests ?? 0,
    })
  }

  for (const s of sessions) {
    if (claimed.has(s.id)) continue
    items.push({
      key: `s:${s.id}`,
      memberId: s.memberId,
      memberName: s.memberName,
      startAt: s.startAt,
      // The real times, even for a one-minute visit: the grid gives short
      // blocks a floor in pixels, so nothing has to be padded here.
      endAt: s.endAt,
      state: isRunning(s, now) ? 'active' : 'attended',
      booking: null,
      session: s,
      guests: s.guests,
    })
  }

  return items.sort((a, b) => a.startAt - b.startAt || a.endAt - b.endAt)
}

export type PlacedItem = CalendarItem & {
  /** Which side-by-side track the block sits in, and how many there are. */
  lane: number
  lanes: number
}

/**
 * Splits the column between times that overlap, the way every calendar does —
 * two people can perfectly well train together, so overlaps are allowed.
 */
export function placeItems(items: CalendarItem[]): PlacedItem[] {
  const sorted = [...items].sort((a, b) => a.startAt - b.startAt || a.endAt - b.endAt)
  const out: PlacedItem[] = []
  let cluster: PlacedItem[] = []
  let laneEnds: number[] = []
  let clusterEnd = -Infinity

  const flush = () => {
    for (const placed of cluster) placed.lanes = laneEnds.length
    out.push(...cluster)
    cluster = []
    laneEnds = []
    clusterEnd = -Infinity
  }

  for (const item of sorted) {
    if (item.startAt >= clusterEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= item.startAt)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.endAt)
    } else {
      laneEnds[lane] = item.endAt
    }
    cluster.push({ ...item, lane, lanes: laneEnds.length })
    clusterEnd = Math.max(clusterEnd, item.endAt)
  }
  flush()

  return out
}

/** Bookings whose time is right now. */
export function liveBookings(bookings: Booking[], now: number): Booking[] {
  return bookings.filter((b) => b.startAt <= now && b.endAt > now)
}

/** The next booking still to come, if there is one. */
export function nextBooking(bookings: Booking[], now: number): Booking | null {
  return bookings.filter((b) => b.startAt > now).sort((a, b) => a.startAt - b.startAt)[0] ?? null
}

/** The time this person has blocked out around now — what they meant to train. */
export function myLiveBooking(
  bookings: Booking[],
  memberId: string | null,
  now: number,
): Booking | null {
  if (!memberId) return null
  return (
    bookings.find(
      (b) => b.memberId === memberId && b.endAt > now && b.startAt <= now + 30 * MINUTE,
    ) ?? null
  )
}

/**
 * Whoever else has already blocked out part of the same window. Several people
 * can train at once, so this is worth saying out loud — but it never stands in
 * the way of the booking.
 */
export function holdersOf(
  bookings: Booking[],
  sessions: Session[],
  startAt: number,
  endAt: number,
  now: number,
): { name: string; startAt: number; endAt: number }[] {
  const held = [
    ...bookings.map((b) => ({ name: b.memberName, startAt: b.startAt, endAt: b.endAt })),
    ...sessions
      .filter((s) => s.endAt > now)
      .map((s) => ({ name: s.memberName, startAt: s.startAt, endAt: s.endAt })),
  ]
  return held
    .filter((h) => overlaps(startAt, endAt, h.startAt, h.endAt))
    .sort((a, b) => a.startAt - b.startAt)
}
