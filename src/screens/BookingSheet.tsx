import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Users } from '../components/Icons'
import { Sheet } from '../components/Sheet'
import { useGym } from '../hooks/gymContext'
import type { CalendarItem } from '../lib/booking'
import { thud } from '../lib/haptics'
import { formatClock, formatDayWord, formatRange, MINUTE } from '../lib/time'

type Props = {
  /** The block that was tapped in the calendar, or null when the sheet is shut. */
  item: CalendarItem | null
  onClose: () => void
  onCheckedIn: (message: string) => void
}

/** How early you may check in on a time that hasn't started yet. */
const EARLY_CHECK_IN = 30 * MINUTE

/**
 * Spells out the one thing a calendar block cannot: whether the person behind
 * the booking actually turned up.
 */
function statusFor(item: CalendarItem): { title: string; note: string } {
  const who = item.memberName
  switch (item.state) {
    case 'planned':
      return {
        title: 'Booket',
        note: `Tiden er holdt fri. ${who} tjekker først ind, når træningen begynder.`,
      }
    case 'waiting':
      return {
        title: 'Ikke tjekket ind',
        note: `Tiden er booket nu, men ${who} har ikke tjekket ind — centret kan altså godt stå tomt.`,
      }
    case 'active':
      return {
        title: 'Tjekket ind',
        note: item.session
          ? `${who} tjekkede ind kl. ${formatClock(item.session.startAt)} og træner indtil ${formatClock(item.session.endAt)}.`
          : `${who} træner lige nu.`,
      }
    case 'attended':
      return {
        title: 'Tjekket ind',
        note: item.session
          ? `${who} trænede ${formatRange(item.session.startAt, item.session.endAt)}.`
          : `${who} trænede.`,
      }
    case 'missed':
      return { title: 'Kom ikke', note: 'Tiden var booket, men ingen tjekkede ind.' }
  }
}

export function BookingSheet({ item, onClose, onCheckedIn }: Props) {
  const { members, active, now, start, unbook } = useGym()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setConfirming(false)
  }, [item])

  const member = item ? (members.find((m) => m.id === item.memberId) ?? null) : null
  const booking = item?.booking ?? null
  const status = item ? statusFor(item) : null
  const canCheckIn =
    !!item &&
    !!member &&
    !!booking &&
    booking.endAt > now &&
    booking.startAt - now <= EARLY_CHECK_IN &&
    !active.some((s) => s.memberId === item.memberId)

  const remove = () => {
    if (!booking) return
    thud()
    void unbook(booking.id)
    onClose()
  }

  const checkIn = () => {
    if (!member || !booking) return
    thud()
    // The booking already says when they mean to be done, so the session
    // inherits it — a quarter of an hour at the very least.
    void start(member, Math.max(booking.endAt, now + 15 * MINUTE))
    onCheckedIn(`${member.name} er tjekket ind`)
    onClose()
  }

  return (
    <Sheet open={!!item} title={booking ? 'Booket tid' : 'Træning'} onClose={onClose}>
      {item && status && (
        <>
          <div className="goal-who">
            <Avatar name={item.memberName} size={44} />
            <span className="goal-who-name">{item.memberName}</span>
          </div>

          {/* Guests have no profile of their own, so the only place they show
              up is on the training they were brought along to. */}
          {item.guests > 0 && (
            <p className="book-guests">
              <Users size={17} />
              {item.guests === 1 ? '1 gæst med' : `${item.guests} gæster med`}
              <em>{item.guests + 1} i centret</em>
            </p>
          )}

          <div className={`book-status is-${item.state}`}>
            <span className="book-status-top">
              <i />
              {status.title}
            </span>
            <strong>{formatRange(item.startAt, item.endAt)}</strong>
            <span className="book-status-day">{formatDayWord(item.startAt, now)}</span>
          </div>

          <p className="sheet-note">{status.note}</p>

          {canCheckIn && (
            <button className="cta cta-block" onClick={checkIn}>
              Tjek ind nu
            </button>
          )}

          {booking && booking.endAt > now && (
            <button className="ghost-btn" onClick={() => (confirming ? remove() : setConfirming(true))}>
              {confirming ? 'Sikker? Sletter bookingen' : 'Slet booking'}
            </button>
          )}

          {!member && <p className="sheet-note">{item.memberName} står ikke længere på holdet.</p>}
        </>
      )}
    </Sheet>
  )
}
