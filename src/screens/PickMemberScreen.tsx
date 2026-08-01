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
  const { members, me, active, ready } = useGym()
  const trainingIds = new Set(active.map((s) => s.memberId))

  return (
    <div className="screen screen-amber">
      <header className="topbar">
        <button className="icon-btn on-amber" onClick={onBack} aria-label="Tilbage">
          <ChevronLeft />
        </button>
      </header>

      <main className="pick-body">
        <h1 className="pick-title">Hvem er du?</h1>
        <p className="pick-sub">Tryk på dit navn for at komme i gang.</p>

        <div className="pick-card">
          <div className="pick-grid">
            {!ready &&
              members.length === 0 &&
              Array.from({ length: 8 }, (_, i) => <span key={i} className="chip-skeleton" />)}
            {members.map((m, i) => {
              const isTraining = trainingIds.has(m.id)
              return (
                <motion.button
                  key={m.id}
                  className={`member-chip${me?.id === m.id ? ' is-me' : ''}${
                    isTraining ? ' is-training' : ''
                  }`}
                  onClick={() => onPick(m)}
                  disabled={isTraining}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.02 * i,
                    duration: 0.35,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Avatar name={m.name} color={m.color} size={26} />
                  <span className="member-chip-name">{m.name}</span>
                </motion.button>
              )
            })}
          </div>

          {ready && members.length === 0 && (
            <p className="pick-empty">
              Ingen personer endnu. Tilføj dem under administration.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
