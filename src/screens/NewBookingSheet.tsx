import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { ArrowRight, ChevronDown } from '../components/Icons'
import { Sheet } from '../components/Sheet'
import { useGym } from '../hooks/gymContext'
import {
  BOOKING_STEP,
  CALENDAR_DAYS,
  ceilToStep,
  DAY_FIRST_HOUR,
  DAY_LAST_HOUR,
  holdersOf,
  repeatDates,
  type RepeatFrequency,
} from '../lib/booking'
import { thud, tick } from '../lib/haptics'
import {
  addDays,
  formatClock,
  formatDayLabel,
  formatDayWord,
  formatDuration,
  formatRange,
  HOUR,
  MINUTE,
  startOfDay,
  withTimeOnDay,
} from '../lib/time'

type Props = {
  /** The range dragged out on the calendar; null keeps the sheet shut. */
  range: { startAt: number; endAt: number } | null
  onClose: () => void
  onBooked: (message: string) => void
}

const STEP_MS = BOOKING_STEP * MINUTE

const REPEAT_OPTIONS: { value: RepeatFrequency | 'none'; label: string }[] = [
  { value: 'none', label: 'Aldrig' },
  { value: 'daily', label: 'Hver dag' },
  { value: 'weekly', label: 'Hver uge' },
]

/** Every quarter-hour from `from` up to but not including `to`. */
function slots(from: number, to: number): number[] {
  const out: number[] = []
  for (let t = from; t < to; t += STEP_MS) out.push(t)
  return out
}

export function NewBookingSheet({ range, onClose, onBooked }: Props) {
  const { members, bookings, sessions, me, book, now } = useGym()
  const [startAt, setStartAt] = useState(0)
  const [endAt, setEndAt] = useState(0)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [repeat, setRepeat] = useState<RepeatFrequency | 'none'>('none')
  const [pending, setPending] = useState(false)

  // The dragged range is only an opening bid. The clock is read here rather
  // than from the ticking `now`, so nothing moves under the user's fingers
  // once the sheet is open.
  useEffect(() => {
    if (!range) return
    setPending(false)
    setPickerOpen(false)
    setRepeat('none')
    setStartAt(range.startAt)
    setEndAt(range.endAt)
    setMemberId(me?.id ?? null)
  }, [range, me?.id])

  const member = members.find((m) => m.id === memberId) ?? null
  const dayStart = startOfDay(startAt)
  const isToday = dayStart === startOfDay(now)
  const dayFloor = dayStart + DAY_FIRST_HOUR * HOUR
  const dayCeil = dayStart + DAY_LAST_HOUR * HOUR
  const lowerBound = isToday ? Math.max(dayFloor, ceilToStep(now)) : dayFloor
  const minDay = startOfDay(now)

  const startOptions = slots(lowerBound, dayCeil).map((t) => ({
    value: t,
    label: formatClock(t),
  }))

  const endOptions = slots(startAt + STEP_MS, dayCeil + STEP_MS).map((t) => ({
    value: t,
    label: formatClock(t),
  }))

  const dayOptions = Array.from({ length: CALENDAR_DAYS }, (_, i) => addDays(minDay, i))

  // Several people can train at once, so an overlap is worth mentioning and
  // nothing more. A repeat is checked the same way, occurrence by occurrence.
  const alsoHere = useMemo(() => {
    if (!range) return []
    const occurrences =
      repeat === 'none' ? [{ startAt, endAt }] : repeatDates(startAt, endAt, repeat)
    const held = occurrences.flatMap((o) => holdersOf(bookings, sessions, o.startAt, o.endAt, now))
    return [...new Set(held.map((h) => h.name))]
  }, [range, repeat, startAt, endAt, bookings, sessions, now])

  const changeStart = (next: number) => {
    tick()
    const duration = endAt - startAt
    setStartAt(next)
    setEndAt(Math.min(next + duration, startOfDay(next) + DAY_LAST_HOUR * HOUR))
  }

  const changeEnd = (next: number) => {
    tick()
    setEndAt(Math.max(next, startAt + STEP_MS))
  }

  const changeDay = (nextDay: number) => {
    if (nextDay === dayStart) return
    tick()
    const duration = endAt - startAt
    const floor =
      nextDay === minDay
        ? Math.max(nextDay + DAY_FIRST_HOUR * HOUR, ceilToStep(now))
        : nextDay + DAY_FIRST_HOUR * HOUR
    const ceil = nextDay + DAY_LAST_HOUR * HOUR
    const nextStart = Math.min(Math.max(withTimeOnDay(startAt, nextDay), floor), ceil - duration)
    setStartAt(nextStart)
    setEndAt(nextStart + duration)
  }

  const submit = () => {
    if (!member || pending) return
    setPending(true)
    thud()
    const freq = repeat === 'none' ? null : repeat
    book(member, startAt, endAt, freq)
    const times = formatRange(startAt, endAt)
    const when = formatDayWord(startAt, now)
    onBooked(
      freq
        ? `${member.name} har booket ${when} ${times}, og gentager sig`
        : `${member.name} har booket ${when} ${times}`,
    )
    onClose()
  }

  return (
    <Sheet open={range !== null} title="Book tid" onClose={onClose}>
      <div className="person-picker">
        <button
          className="person-trigger"
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
        >
          {member ? (
            <>
              <Avatar name={member.name} size={30} />
              {member.name}
            </>
          ) : (
            'Vælg hvem'
          )}
          <ChevronDown size={18} />
        </button>

        {pickerOpen && (
          <>
            <div className="who-scrim" onClick={() => setPickerOpen(false)} />
            <ul className="person-menu">
              {members.map((m) => (
                <li key={m.id}>
                  <button
                    className={`person-menu-item${m.id === memberId ? ' is-on' : ''}`}
                    onClick={() => {
                      setMemberId(m.id)
                      setPickerOpen(false)
                    }}
                  >
                    <Avatar name={m.name} size={26} />
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <p className="field-label">Dag</p>
      <label className="select-field is-wide">
        <select value={dayStart} onChange={(e) => changeDay(Number(e.target.value))}>
          {dayOptions.map((d, i) => (
            <option key={d} value={d}>
              {/* "i dag" and "i morgen" are how anyone says it; further out the
                  date says it better on its own. */}
              {i < 2 ? `${formatDayWord(d, now)} · ${formatDayLabel(d)}` : formatDayLabel(d)}
            </option>
          ))}
        </select>
        <ChevronDown size={18} />
      </label>

      <p className="field-label">Tid</p>
      <div className="time-row">
        <label className="select-field">
          <select
            value={startAt}
            onChange={(e) => changeStart(Number(e.target.value))}
            aria-label="Starttid"
          >
            {startOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={18} />
        </label>

        <ArrowRight size={16} />

        <label className="select-field">
          <select
            value={endAt}
            onChange={(e) => changeEnd(Number(e.target.value))}
            aria-label="Sluttid"
          >
            {endOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={18} />
        </label>
      </div>

      <div className="book-summary">
        <strong>{formatRange(startAt, endAt)}</strong>
        <span>{formatDuration(Math.round((endAt - startAt) / MINUTE))}</span>
      </div>

      <p className="field-label">Gentag</p>
      <div className="chips is-wrap">
        {REPEAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`chip${repeat === opt.value ? ' is-on' : ''}`}
            onClick={() => setRepeat(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {alsoHere.length > 0 && (
        <p className="sheet-note book-also">
          {alsoHere.length === 1
            ? `${alsoHere[0]} har også tiden — I træner sammen.`
            : `${alsoHere.slice(0, -1).join(', ')} og ${alsoHere.at(-1)} har også tiden.`}
        </p>
      )}

      <button className="cta cta-block" onClick={submit} disabled={!member || pending}>
        {member ? `Book til ${member.name}` : 'Vælg hvem det er til'}
      </button>
    </Sheet>
  )
}
