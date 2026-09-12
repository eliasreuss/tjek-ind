import { motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { ArrowRight, Gear } from '../components/Icons'
import { WeekCalendar } from '../components/WeekCalendar'
import type { Booking, Session } from '../data/types'
import { useGym } from '../hooks/gymContext'
import { liveBookings, nextBooking, type CalendarItem } from '../lib/booking'
import { formatClock, formatDayWord } from '../lib/time'

type Props = {
  onStart: () => void
  onOpenSession: () => void
  onOpenAdmin: () => void
  onOpenPicker: () => void
  onCreateRange: (startAt: number, endAt: number) => void
  onOpenItem: (item: CalendarItem) => void
}

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

/** "Jonathan Nielsen" → "Jonathan", so the headline stays one line. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function listNames(bookings: Booking[]): string {
  const names = bookings.map((b) => firstName(b.memberName))
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`
}

type Status = {
  headline: string
  lede: string
  /** The nag: booked time with nobody checked in, said in its own words. */
  warn: string | null
}

/**
 * The front page has to answer two questions at once now: is the gym taken, and
 * is anyone actually in it? A booked hour with nobody checked in is the case
 * that used to be invisible, so it gets said out loud.
 */
function statusOf(
  active: Session[],
  bookings: Booking[],
  peopleTraining: number,
  freeAt: number | null,
  now: number,
): Status {
  const live = liveBookings(bookings, now)
  const absent = live.filter((b) => !active.some((s) => s.memberId === b.memberId))

  const nag =
    absent.length > 0 ? `${listNames(absent)} har booket uden at tjekke ind` : null

  if (active.length > 0) {
    const solo = active.length === 1 && active[0].guests === 0
    return {
      headline: solo
        ? `${firstName(active[0].memberName)} træner indtil ${formatClock(active[0].endAt)}`
        : `Ledigt kl. ${formatClock(freeAt ?? now)}`,
      lede: solo
        ? `Tjekket ind kl. ${formatClock(active[0].startAt)}`
        : `${peopleTraining} træner lige nu`,
      warn: nag,
    }
  }

  if (absent.length > 0) {
    const until = Math.max(...absent.map((b) => b.endAt))
    return {
      headline:
        absent.length === 1
          ? `${firstName(absent[0].memberName)} har booket til ${formatClock(until)}`
          : `Booket til ${formatClock(until)}`,
      lede: '',
      warn: 'Ingen har tjekket ind — centret står måske tomt',
    }
  }

  const next = nextBooking(bookings, now)
  return {
    headline: 'Centret er frit',
    lede: next
      ? `Næste: ${firstName(next.memberName)} ${formatDayWord(next.startAt, now)} kl. ${formatClock(next.startAt)}`
      : 'Ingen har tjekket ind',
    warn: null,
  }
}

export function HomeScreen({
  onStart,
  onOpenSession,
  onOpenAdmin,
  onOpenPicker,
  onCreateRange,
  onOpenItem,
}: Props) {
  const { active, bookings, freeAt, me, mySession, now, peopleTraining, ready, sessions } = useGym()
  const status = statusOf(active, bookings, peopleTraining, freeAt, now)

  return (
    <div className="screen is-fixed">
      <header className="topbar home-bar">
        {/* The same pill as on the træning screens, so it reads as "this is
            you" in both places — here it opens the switcher. */}
        <button
          className={`who${me ? '' : ' is-empty'}`}
          onClick={onOpenPicker}
          aria-label={me ? `Skift bruger fra ${me.name}` : 'Vælg hvem du er'}
        >
          {me ? (
            <>
              <Avatar name={me.name} size={30} />
              {me.name}
            </>
          ) : (
            'Hvem er du?'
          )}
        </button>
        <button className="icon-btn" onClick={onOpenAdmin} aria-label="Administration">
          <Gear size={22} />
        </button>
      </header>

      <main className="home-body">
        <motion.div variants={rise} initial="hidden" animate="show" custom={0}>
          {!ready ? (
            <h1 className="headline is-muted">Henter…</h1>
          ) : (
            <>
              <h1 className="headline">{status.headline}</h1>
              {status.lede && <p className="lede">{status.lede}</p>}
              {status.warn && <p className="lede is-warn">{status.warn}</p>}
            </>
          )}
        </motion.div>

        <motion.div
          className="cal-wrap"
          variants={rise}
          initial="hidden"
          animate="show"
          custom={1}
        >
          <WeekCalendar
            bookings={bookings}
            sessions={sessions}
            now={now}
            onCreateRange={onCreateRange}
            onPickItem={onOpenItem}
          />
          <p className="cal-hint">Hold og træk for at booke</p>
        </motion.div>
      </main>

      <footer className="dock">
        {mySession ? (
          <button className="cta" onClick={onOpenSession}>
            <span className="cta-label">Afslut træning</span>
            <span className="cta-orb">
              <ArrowRight size={24} />
            </span>
          </button>
        ) : (
          <button className="cta" onClick={onStart}>
            <span className="cta-label">Start træning</span>
            <span className="cta-orb">
              <ArrowRight size={24} />
            </span>
          </button>
        )}
      </footer>
    </div>
  )
}
