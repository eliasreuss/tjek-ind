import { useEffect, useMemo, useRef, useState } from 'react'
import type { Booking, Session } from '../data/types'
import {
  buildCalendarItems,
  BOOKING_STEP,
  CALENDAR_DAYS,
  DAY_FIRST_HOUR,
  DAY_LAST_HOUR,
  placeItems,
  type CalendarItem,
} from '../lib/booking'
import { thud } from '../lib/haptics'
import { colorForName } from '../lib/name'
import {
  addDays,
  formatClock,
  formatDayLabel,
  formatRange,
  HOUR,
  isSameDay,
  MINUTE,
  startOfDay,
} from '../lib/time'

/** Anything outside the gym's day is pinned to the nearest edge of the grid. */
const FIRST_HOUR = DAY_FIRST_HOUR
const ROWS = DAY_LAST_HOUR - DAY_FIRST_HOUR
/** Pixels per hour, and the height of the sticky day heads. */
const ROW_H = 58
const HEAD_H = 44
const MIN_BLOCK_H = 26
const HOURS = Array.from({ length: ROWS }, (_, i) => FIRST_HOUR + i)
/** How long a still finger has to hold before a drag starts, versus a scroll. */
const HOLD_MS = 260
/** How far a finger may drift during the hold before it's read as a scroll. */
const HOLD_SLOP = 10
/** What a press without any dragging blocks out, before you adjust it. */
const DEFAULT_LENGTH = 60 * MINUTE
const STEP_MS = BOOKING_STEP * MINUTE

/**
 * How long the grid takes to slide one day across. In the same breath as the
 * rest of the app's motion — long enough to follow, short enough not to wait.
 */
const DAY_SLIDE_MS = 180
/** Sideways travel that counts as a deliberate swipe rather than a wobble. */
const SWIPE_SLOP = 24
/** Quiet time that ends a swipe, so one flick of the trackpad is one day. */
const SWIPE_END_MS = 140

type Props = {
  bookings: Booking[]
  sessions: Session[]
  now: number
  onCreateRange: (startAt: number, endAt: number) => void
  onPickItem: (item: CalendarItem) => void
}

const TAGS: Record<CalendarItem['state'], string> = {
  planned: 'Booket',
  waiting: 'Ikke tjekket ind',
  active: 'Tjekket ind',
  attended: 'Tjekket ind',
  missed: 'Kom ikke',
}

/** A column split between two people has no room for the full wording. */
const SHORT_TAGS: Record<CalendarItem['state'], string> = {
  planned: 'Booket',
  waiting: 'Ikke her',
  active: 'Er her',
  attended: 'Var her',
  missed: 'Kom ikke',
}

/** Where a moment sits in the grid, in pixels from the top of a day column. */
function offsetOf(dayStart: number, at: number): number {
  return ((at - dayStart) / HOUR - FIRST_HOUR) * ROW_H
}

function Block({
  item,
  dayStart,
  lane,
  lanes,
  onPick,
}: {
  item: CalendarItem
  dayStart: number
  lane: number
  lanes: number
  onPick: () => void
}) {
  const gridBottom = ROWS * ROW_H
  const top = Math.min(gridBottom - MIN_BLOCK_H, Math.max(0, offsetOf(dayStart, item.startAt)))
  const bottom = Math.max(top + MIN_BLOCK_H, Math.min(gridBottom, offsetOf(dayStart, item.endAt)))
  const width = 100 / lanes

  return (
    <button
      className={`cal-block is-${item.state}`}
      style={{
        top,
        height: bottom - top,
        left: `${lane * width}%`,
        width: `calc(${width}% - 4px)`,
        // The person's own colour, as on their avatar, so a block is recognisable
        // before you have read the name.
        ['--tint' as string]: colorForName(item.memberName),
      }}
      onClick={onPick}
      aria-label={`${item.memberName} ${formatRange(item.startAt, item.endAt)}, ${TAGS[item.state]}`}
    >
      <span className="cal-block-time">{formatRange(item.startAt, item.endAt)}</span>
      <span className="cal-block-name">
        {item.memberName}
        {item.guests > 0 && <em> +{item.guests}</em>}
      </span>
      <span className="cal-block-tag">
        <i />
        {lanes > 1 ? SHORT_TAGS[item.state] : TAGS[item.state]}
      </span>
    </button>
  )
}

type Drag = { anchor: number; end: number }

type DayColumnProps = {
  dayStart: number
  now: number
  placed: ReturnType<typeof placeItems>
  onCreateRange: (startAt: number, endAt: number) => void
  onPickItem: (item: CalendarItem) => void
}

/**
 * Blocking out time: press and drag down. On a touch screen the press has to
 * hold still for a beat first, so an ordinary swipe still scrolls the grid;
 * with a mouse there is nothing to tell apart, so the drag starts at once.
 *
 * A drag may start on top of somebody else's block and run straight through it
 * — several people train at the same time, and the column simply splits. Only
 * a plain tap on a block means "show me this one".
 *
 * The listeners are native rather than React's because stopping the scroll
 * needs `preventDefault` on a non-passive `touchmove` — flipping `touch-action`
 * mid-gesture is too late, the browser has already latched it.
 */
function DayColumn({ dayStart, now, placed, onCreateRange, onPickItem }: DayColumnProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)

  // Everything the gesture needs to read, kept in a ref so the listeners can be
  // attached once and never torn down mid-drag by the ticking clock.
  const live = useRef({ dayStart, now, onCreateRange })
  live.current = { dayStart, now, onCreateRange }

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return

    let state: {
      anchor: number
      /** Where the drag currently ends, which is what gets booked. */
      end: number
      /** Midnight: nothing runs past the bottom of the day. */
      limit: number
      startX: number
      startY: number
      armed: boolean
      /** A drag that began on a block, which mustn't also open it. */
      onBlock: boolean
      timer: number | null
    } | null = null

    const yToTime = (clientY: number): number => {
      const { dayStart: day } = live.current
      const rect = el.getBoundingClientRect()
      const hours = (clientY - rect.top) / ROW_H + FIRST_HOUR
      const snapped = Math.round((day + hours * HOUR) / STEP_MS) * STEP_MS
      return Math.min(
        Math.max(snapped, day + DAY_FIRST_HOUR * HOUR),
        day + DAY_LAST_HOUR * HOUR,
      )
    }

    /** Where a booking would begin here — null when there's no time left. */
    const startFrom = (clientY: number): { anchor: number; limit: number } | null => {
      const { now: clock, dayStart: day } = live.current
      const anchor = yToTime(clientY)
      const limit = day + DAY_LAST_HOUR * HOUR
      // The quarter under the finger has already been and gone.
      if (anchor + STEP_MS <= clock || limit - anchor < STEP_MS) return null
      return { anchor, limit }
    }

    const arm = () => {
      if (!state) return
      state.armed = true
      thud()
      setDrag({ anchor: state.anchor, end: state.end })
    }

    const extendTo = (clientY: number) => {
      if (!state) return
      state.end = Math.min(Math.max(yToTime(clientY), state.anchor + STEP_MS), state.limit)
      setDrag({ anchor: state.anchor, end: state.end })
    }

    const cancel = () => {
      if (state?.timer) window.clearTimeout(state.timer)
      state = null
      setDrag(null)
    }

    // A gesture that began on a block and turned into a drag has to keep that
    // block from also opening its own sheet.
    let swallowClick = false

    const release = (e: Event) => {
      if (!state) return
      const { armed, anchor, end, timer, onBlock } = state
      if (timer) window.clearTimeout(timer)
      state = null
      setDrag(null)
      if (!armed) return
      if (onBlock) {
        // A touch's click can be cancelled outright; a mouse's can't, so that
        // one is caught on the way down instead.
        if (e.type === 'touchend') e.preventDefault()
        else swallowClick = true
      }
      live.current.onCreateRange(anchor, end)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return cancel()
      const t = e.touches[0]
      const room = startFrom(t.clientY)
      if (!room) return
      state = {
        ...room,
        end: Math.min(room.anchor + DEFAULT_LENGTH, room.limit),
        startX: t.clientX,
        startY: t.clientY,
        armed: false,
        onBlock: !!(e.target as HTMLElement).closest('.cal-block'),
        timer: window.setTimeout(arm, HOLD_MS),
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!state) return
      const t = e.touches[0]
      if (state.armed) {
        // The one line that keeps the grid from scrolling out from under the
        // finger while it's dragging a block out.
        e.preventDefault()
        extendTo(t.clientY)
        return
      }
      if (
        Math.abs(t.clientX - state.startX) > HOLD_SLOP ||
        Math.abs(t.clientY - state.startY) > HOLD_SLOP
      ) {
        // Moving this early means they meant to scroll.
        cancel()
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const room = startFrom(e.clientY)
      if (!room) return
      const onBlock = !!(e.target as HTMLElement).closest('.cal-block')
      state = {
        ...room,
        end: Math.min(room.anchor + DEFAULT_LENGTH, room.limit),
        startX: e.clientX,
        startY: e.clientY,
        // A mouse press on empty grid can't be mistaken for anything else, so
        // it draws straight away; on a block it waits to see a drag, since a
        // click there means "open it".
        armed: !onBlock,
        onBlock,
        timer: null,
      }
      if (!onBlock) setDrag({ anchor: state.anchor, end: state.end })
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!state) return
      if (!state.armed && Math.abs(e.clientY - state.startY) > 4) state.armed = true
      if (state.armed) extendTo(e.clientY)
    }

    const onMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      release(e)
    }

    // Capture phase, so it beats the block's own click handler to it.
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return
      swallowClick = false
      e.stopPropagation()
      e.preventDefault()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', release, { passive: false })
    el.addEventListener('touchcancel', cancel)
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('click', onClick, true)

    return () => {
      if (state?.timer) window.clearTimeout(state.timer)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', release)
      el.removeEventListener('touchcancel', cancel)
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('click', onClick, true)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const dragTop = drag ? Math.max(0, offsetOf(dayStart, drag.anchor)) : 0
  const dragBottom = drag ? Math.min(ROWS * ROW_H, offsetOf(dayStart, drag.end)) : 0
  const pastHeight = Math.max(0, Math.min(ROWS * ROW_H, offsetOf(dayStart, now)))

  return (
    <div className={`cal-col-body${drag ? ' is-dragging' : ''}`} ref={bodyRef}>
      {pastHeight > 0 && <div className="cal-past" style={{ height: pastHeight }} aria-hidden="true" />}

      {HOURS.map((h, i) => (
        <div className="cal-hour-line" key={h} style={{ top: i * ROW_H }} aria-hidden="true" />
      ))}

      {placed.map((item) => (
        <Block
          key={item.key}
          item={item}
          dayStart={dayStart}
          lane={item.lane}
          lanes={item.lanes}
          onPick={() => onPickItem(item)}
        />
      ))}

      {drag && (
        <div
          className="cal-draft"
          style={{ top: dragTop, height: Math.max(MIN_BLOCK_H, dragBottom - dragTop) }}
        >
          {formatRange(drag.anchor, drag.end)}
        </div>
      )}
    </div>
  )
}

export function WeekCalendar({ bookings, sessions, now, onCreateRange, onPickItem }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const today = startOfDay(now)
  const days = useMemo(
    () => Array.from({ length: CALENDAR_DAYS }, (_, i) => addDays(today, i)),
    [today],
  )

  // The session log reaches back a year for the streaks; the grid only ever
  // draws this week, and it rebuilds every time the clock ticks.
  const from = days[0]
  const to = addDays(days[CALENDAR_DAYS - 1], 1)
  const items = useMemo(
    () =>
      buildCalendarItems(
        bookings.filter((b) => b.startAt < to && b.endAt > from),
        sessions.filter((s) => s.startAt < to && s.endAt > from),
        now,
      ),
    [bookings, sessions, now, from, to],
  )

  const perDay = useMemo(
    () =>
      days.map((dayStart) => {
        const dayEnd = addDays(dayStart, 1)
        return placeItems(items.filter((it) => it.startAt < dayEnd && it.endAt > dayStart))
      }),
    [days, items],
  )

  // Open on the current hour rather than at 06:00, the way a calendar app does.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const target = offsetOf(startOfDay(Date.now()), Date.now()) - ROW_H
    el.scrollTop = Math.max(0, Math.min(target, ROWS * ROW_H - el.clientHeight + HEAD_H))
  }, [])

  /**
   * Sideways, the grid is a carousel: one swipe moves one day, and it gets
   * there on our own clock rather than coasting to a stop. The hours below are
   * left to scroll natively — only sideways intent is taken over.
   */
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let frame = 0
    let sliding = false
    let travel = 0
    let settle = 0
    // A swipe holds the wheel until the fingers lift, so a long flick can't
    // run through half the week.
    let held = false

    const slideTo = (left: number) => {
      const from = el.scrollLeft
      const dist = left - from
      if (Math.abs(dist) < 1) return
      // Native snapping would fight a scroll it didn't start.
      el.style.scrollSnapType = 'none'
      sliding = true
      const startedAt = performance.now()
      const step = (t: number) => {
        const p = Math.min(1, (t - startedAt) / DAY_SLIDE_MS)
        el.scrollLeft = from + dist * (1 - (1 - p) ** 3)
        if (p < 1) {
          frame = requestAnimationFrame(step)
          return
        }
        el.style.scrollSnapType = ''
        sliding = false
      }
      frame = requestAnimationFrame(step)
    }

    const onWheel = (e: WheelEvent) => {
      // A mouse wheel has no sideways axis, so shift stands in for one.
      const sideways = e.shiftKey ? e.deltaY : e.deltaX
      const downwards = e.shiftKey ? 0 : e.deltaY
      if (Math.abs(sideways) <= Math.abs(downwards)) return
      e.preventDefault()

      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        held = false
        travel = 0
      }, SWIPE_END_MS)

      if (held || sliding) return
      travel += sideways
      if (Math.abs(travel) < SWIPE_SLOP) return

      const col = el.querySelector('.cal-col')
      const width = col ? col.getBoundingClientRect().width : 0
      if (!width) return

      const day = Math.round(el.scrollLeft / width) + Math.sign(travel)
      held = true
      travel = 0
      slideTo(Math.max(0, Math.min(el.scrollWidth - el.clientWidth, day * width)))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      window.clearTimeout(settle)
      cancelAnimationFrame(frame)
      el.style.scrollSnapType = ''
    }
  }, [])

  const nowOffset = offsetOf(today, now)
  const nowVisible = nowOffset >= 0 && nowOffset <= ROWS * ROW_H

  return (
    <div
      className="cal"
      ref={scroller}
      style={{
        ['--cal-row' as string]: `${ROW_H}px`,
        ['--cal-head' as string]: `${HEAD_H}px`,
        ['--cal-rows' as string]: ROWS,
      }}
    >
      <div className="cal-inner">
        <div className="cal-gutter" aria-hidden="true">
          <span className="cal-gutter-head" />
          {HOURS.map((h) => (
            <span className="cal-hour" key={h}>
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>

        <div className="cal-days">
          {days.map((dayStart, dayIndex) => (
            <div className={`cal-col${isSameDay(dayStart, now) ? ' is-today' : ''}`} key={dayStart}>
              <span className="cal-col-head">{formatDayLabel(dayStart)}</span>
              <DayColumn
                dayStart={dayStart}
                now={now}
                placed={perDay[dayIndex]}
                onCreateRange={onCreateRange}
                onPickItem={onPickItem}
              />
            </div>
          ))}

          {nowVisible && (
            <div
              className="cal-now"
              style={{ top: HEAD_H + nowOffset }}
              aria-label={`Klokken er ${formatClock(now)}`}
            >
              <i />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
