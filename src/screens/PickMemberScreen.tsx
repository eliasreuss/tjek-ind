import { motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { ChevronLeft } from '../components/Icons'
import { useGym } from '../hooks/gymContext'
import type { Member } from '../data/types'

type Props = {
  onPick: (member: Member) => void
  onBack: () => void
}

export function PickMemberScreen({ onPick, onBack }: Props) {
  const { members, active, ready } = useGym()
  const training = new Set(active.map((s) => s.memberId))

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbage">
          <ChevronLeft />
        </button>
      </header>

      <main className="pick-body">
        <h1 className="headline">Hvem er du?</h1>

        <div className="pick-grid">
          {!ready &&
            members.length === 0 &&
            Array.from({ length: 4 }, (_, i) => <span key={i} className="pick-skeleton" />)}

          {members.map((m, i) => (
            <motion.button
              key={m.id}
              className={`pick-card${training.has(m.id) ? ' is-busy' : ''}`}
              onClick={() => onPick(m)}
              disabled={training.has(m.id)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.97 }}
            >
              <Avatar name={m.name} size={52} />
              <span className="pick-name">{m.name}</span>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  )
}
