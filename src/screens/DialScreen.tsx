import { useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { GuestStepper } from '../components/GuestStepper'
import { ChevronLeft } from '../components/Icons'
import { TimeDial } from '../components/TimeDial'
import { useGym } from '../hooks/gymContext'
import { thud } from '../lib/haptics'
import { durationParts, formatClock, formatDuration, MINUTE } from '../lib/time'
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
  const { start, now } = useGym()
  const [minutes, setMinutes] = useState(60)
  const [guests, setGuests] = useState(0)
  const [pending, setPending] = useState(false)

  // Firestore applies the write to its local cache instantly, so the UI can move
  // on without waiting for the server to acknowledge it.
  const begin = () => {
    if (pending) return
    setPending(true)
    thud()
    start(member, Date.now() + minutes * MINUTE, guests)
    onStarted()
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbage">
          <ChevronLeft />
        </button>
        <button className="who" onClick={onBack}>
          <Avatar name={member.name} size={30} />
          {member.name}
        </button>
      </header>

      <main className="dial-body">
        <motion.div
          className="readout"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="readout-big">
            {durationParts(minutes).map((p) => (
              <span key={p.unit} className="readout-part">
                {p.value}
                <em>{p.unit}</em>
              </span>
            ))}
          </span>
          <span className="readout-sub">Færdig {formatClock(now + minutes * MINUTE)}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <TimeDial
            minutes={minutes}
            min={MIN}
            max={MAX}
            step={STEP}
            tone="dark"
            onChange={setMinutes}
            label="Træningens længde"
          >
            <button className="core core-lime" onClick={begin} disabled={pending}>
              Start
            </button>
          </TimeDial>
        </motion.div>

        <div className="chips">
          {PRESETS.map((p) => (
            <button
              key={p}
              className={`chip${minutes === p ? ' is-on' : ''}`}
              onClick={() => setMinutes(p)}
            >
              {formatDuration(p)}
            </button>
          ))}
        </div>

        <GuestStepper value={guests} onChange={setGuests} />
      </main>
    </div>
  )
}
