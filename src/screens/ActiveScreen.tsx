import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { ChevronLeft, Plus } from '../components/Icons'
import { TimeDial } from '../components/TimeDial'
import { useGym } from '../hooks/gymContext'
import { thud } from '../lib/haptics'
import { formatClock, formatRemaining, MINUTE } from '../lib/time'
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
  const { now, extend, stop, active } = useGym()
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef<number>(0)

  const left = Math.max(0, session.endAt - now)
  const minutesLeft = Math.max(MIN, Math.round(left / MINUTE / STEP) * STEP)
  const others = active.filter((s) => s.id !== session.id)

  useEffect(() => () => window.clearTimeout(confirmTimer.current), [])

  const setRemaining = (minutes: number) => {
    extend(session.id, Date.now() + minutes * MINUTE)
  }

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
    <div className="screen screen-amber">
      <header className="topbar">
        <button className="icon-btn on-amber" onClick={onBack} aria-label="Tilbage">
          <ChevronLeft />
        </button>
        <span className="who-pill is-static">
          <Avatar name={session.memberName} color={session.color} size={24} />
          {session.memberName}
        </span>
      </header>

      <main className="dial-body">
        <motion.div
          className="dial-readout"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="dial-eyebrow">Du træner — tid tilbage</span>
          <span className="dial-clock is-mono">{formatRemaining(left)}</span>
          <span className="dial-length">Slutter kl. {formatClock(session.endAt)}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <TimeDial
            minutes={minutesLeft}
            min={MIN}
            max={MAX}
            step={STEP}
            accent="var(--clay)"
            onChange={setRemaining}
            label="Tid tilbage"
          >
            <button
              className={`core-btn core-orange${confirming ? ' is-confirming' : ''}`}
              onClick={onStopPress}
            >
              {confirming ? (
                <>
                  Tryk
                  <br />
                  igen
                </>
              ) : (
                <>
                  Stop
                  <br />
                  træning
                </>
              )}
            </button>
          </TimeDial>
        </motion.div>

        <div className="preset-row">
          {[15, 30].map((add) => (
            <button
              key={add}
              className="preset"
              onClick={() => extend(session.id, session.endAt + add * MINUTE)}
            >
              <Plus size={15} />
              {add} min
            </button>
          ))}
        </div>

        {others.length > 0 && (
          <p className="dial-note">
            {others.map((s) => s.memberName).join(', ')} træner også
          </p>
        )}
      </main>
    </div>
  )
}
