import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { GuestStepper } from '../components/GuestStepper'
import { ChevronLeft } from '../components/Icons'
import { TimeDial } from '../components/TimeDial'
import { useGym } from '../hooks/gymContext'
import { thud } from '../lib/haptics'
import { formatClock, formatDuration, formatRemaining, MINUTE } from '../lib/time'
import type { Session } from '../data/types'

const MIN = 5
const MAX = 180
const STEP = 5

type Props = {
  session: Session
  onBack: () => void
  onStopped: () => void
}

export function ActiveScreen({ session, onBack, onStopped }: Props) {
  const { now, extend, stop, setGuests } = useGym()
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef<number>(0)

  const left = Math.max(0, session.endAt - now)
  const minutesLeft = Math.max(MIN, Math.round(left / MINUTE / STEP) * STEP)

  useEffect(() => () => window.clearTimeout(confirmTimer.current), [])

  const onStopPress = () => {
    if (!confirming) {
      setConfirming(true)
      confirmTimer.current = window.setTimeout(() => setConfirming(false), 3000)
      return
    }
    window.clearTimeout(confirmTimer.current)
    thud()
    stop(session.id)
    onStopped()
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbage">
          <ChevronLeft />
        </button>
        <span className="who is-static">
          <Avatar name={session.memberName} size={30} />
          {session.memberName}
        </span>
      </header>

      <main className="dial-body">
        <motion.div
          className="readout"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="readout-big is-clock">{formatRemaining(left)}</span>
          <span className="readout-sub">Slutter {formatClock(session.endAt)}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <TimeDial
            minutes={minutesLeft}
            min={MIN}
            max={MAX}
            step={STEP}
            tone="lime"
            onChange={(m) => extend(session.id, Date.now() + m * MINUTE)}
            label="Tid tilbage"
          >
            <button
              className={`core core-ink${confirming ? ' is-confirming' : ''}`}
              onClick={onStopPress}
            >
              {confirming ? 'Sikker?' : 'Stop'}
            </button>
          </TimeDial>
        </motion.div>

        <div className="chips">
          {[15, 30].map((add) => (
            <button
              key={add}
              className="chip"
              onClick={() => extend(session.id, session.endAt + add * MINUTE)}
            >
              +{formatDuration(add)}
            </button>
          ))}
        </div>

        <GuestStepper value={session.guests} onChange={(n) => setGuests(session.id, n)} />
      </main>
    </div>
  )
}
