import { motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { ChevronLeft, Flame, Gear } from '../components/Icons'
import { useGym } from '../hooks/gymContext'
import { formatWeeks } from '../lib/streak'
import type { Member } from '../data/types'

type Props = {
  onPick: (member: Member) => void
  onEditGoal: (member: Member) => void
  onBack: () => void
  /** Starting a training can't collide with one already running; just
   * claiming to be someone on this phone has no such conflict. */
  lockBusy?: boolean
}

export function PickMemberScreen({ onPick, onEditGoal, onBack, lockBusy = true }: Props) {
  const { members, active, ready, streaks } = useGym()
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

          {members.map((m, i) => {
            const busy = lockBusy && training.has(m.id)
            const streak = streaks[m.id]

            return (
              <motion.div
                key={m.id}
                className={`pick-card${busy ? ' is-busy' : ''}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Two separate targets: the card picks the person, the cog
                    retunes their goal. Nesting them would break both. */}
                <button className="pick-main" onClick={() => onPick(m)} disabled={busy}>
                  <Avatar name={m.name} size={40} />
                  <span className="pick-name">{m.name}</span>
                </button>

                <div className="pick-foot">
                  <span
                    className={`pick-streak${streak && streak.weeks > 0 ? '' : ' is-empty'}`}
                    aria-label={`${formatWeeks(streak?.weeks ?? 0)} i træk`}
                  >
                    {streak?.weeks ?? 0}
                    <Flame size={17} filled />
                  </span>

                  <button
                    className="pick-gear"
                    onClick={() => onEditGoal(m)}
                    aria-label={`Skift mål for ${m.name}`}
                  >
                    <Gear size={19} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
