import { useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { ChevronLeft } from '../components/Icons'
import { TimeDial } from '../components/TimeDial'
import { useGym } from '../hooks/gymContext'
import { thud } from '../lib/haptics'
import { formatClock, formatDuration, MINUTE } from '../lib/time'
import type { Member } from '../data/types'

const MIN = 15
const MAX = 180
const STEP = 5
const PRESETS = [30, 45, 60, 90]

type Props = {
  member: Member
  onBack: () => void
  onStarted: () => void
}

export function DialScreen({ member, onBack, onStarted }: Props) {
  const { start, now, busy, freeAt } = useGym()
  const [minutes, setMinutes] = useState(60)
  const [pending, setPending] = useState(false)
  const endAt = now + minutes * MINUTE

  // Firestore applies the write to its local cache instantly, so the UI can move
  // on without waiting for the server to acknowledge it.
  const begin = () => {
    if (pending) return
    setPending(true)
    thud()
    start(member, Date.now() + minutes * MINUTE)
    onStarted()
  }

  return (
    <div className="screen screen-amber">
      <header className="topbar">
        <button className="icon-btn on-amber" onClick={onBack} aria-label="Tilbage">
          <ChevronLeft />
        </button>
        <button className="who-pill" onClick={onBack}>
          <Avatar name={member.name} color={member.color} size={24} />
          {member.name}
          <em>skift</em>
        </button>
      </header>

      <main className="dial-body">
        <motion.div
          className="dial-readout"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="dial-eyebrow">Jeg er færdig kl.</span>
          <span className="dial-clock">{formatClock(endAt)}</span>
          <span className="dial-length">{formatDuration(minutes)}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <TimeDial
            minutes={minutes}
            min={MIN}
            max={MAX}
            step={STEP}
            accent="var(--sage)"
            onChange={setMinutes}
            label="Træningens længde"
          >
            <button
              className="core-btn core-green"
              onClick={begin}
              disabled={pending}
              aria-label={`Start træning indtil ${formatClock(endAt)}`}
            >
              Start
              <br />
              træning
            </button>
          </TimeDial>
        </motion.div>

        <div className="preset-row">
          {PRESETS.map((p) => (
            <button
              key={p}
              className={`preset${minutes === p ? ' is-active' : ''}`}
              onClick={() => setMinutes(p)}
            >
              {p} min
            </button>
          ))}
        </div>

        {busy && freeAt && (
          <p className="dial-note">
            Der er andre i centret indtil <strong>{formatClock(freeAt)}</strong>
          </p>
        )}
      </main>
    </div>
  )
}
