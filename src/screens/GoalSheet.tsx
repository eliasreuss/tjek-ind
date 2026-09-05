import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Flame, Minus, Plus } from '../components/Icons'
import { Sheet } from '../components/Sheet'
import { useGym } from '../hooks/gymContext'
import { tick } from '../lib/haptics'
import { formatWeeks, MAX_WEEKLY_GOAL, MIN_WEEKLY_GOAL } from '../lib/streak'
import type { Member } from '../data/types'

type Props = {
  /** The member whose goal is being retuned, or null when the sheet is closed. */
  member: Member | null
  onClose: () => void
}

export function GoalSheet({ member, onClose }: Props) {
  const { streaks, sessionCounts, setGoal, undoLast, resetHistory } = useGym()
  const streak = member ? streaks[member.id] : undefined
  const logged = member ? (sessionCounts[member.id] ?? 0) : 0
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setConfirmReset(false)
  }, [member])

  const nudge = (goal: number) => {
    if (!member) return
    tick()
    void setGoal(member.id, goal)
  }

  return (
    <Sheet open={!!member} title="Ugentligt mål" onClose={onClose}>
      {member && streak && (
        <>
          <div className="goal-who">
            <Avatar name={member.name} size={44} />
            <span className="goal-who-name">{member.name}</span>
            <span className={`goal-streak${streak.weeks > 0 ? ' is-on' : ''}`}>
              <Flame size={16} filled />
              {streak.weeks}
            </span>
          </div>

          <div className="goal-set">
            <button
              className="goal-btn"
              onClick={() => nudge(streak.goal - 1)}
              disabled={streak.goal <= MIN_WEEKLY_GOAL}
              aria-label="Ét træningspas mindre"
            >
              <Minus size={20} />
            </button>
            <span className="goal-big" aria-live="polite">
              {streak.goal}
              <em>{streak.goal === 1 ? 'dag om ugen' : 'dage om ugen'}</em>
            </span>
            <button
              className="goal-btn"
              onClick={() => nudge(streak.goal + 1)}
              disabled={streak.goal >= MAX_WEEKLY_GOAL}
              aria-label="Ét træningspas mere"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="goal-status">
            {/* One pip per planned day, filled once it's trained. */}
            <span className="pips" aria-hidden="true">
              {Array.from({ length: Math.max(streak.goal, streak.thisWeek) }, (_, i) => (
                <i key={i} className={i < streak.thisWeek ? 'is-done' : ''} />
              ))}
            </span>
            <span className="goal-status-text">
              {streak.thisWeek} af {streak.goal} denne uge
              {streak.weeks > 0 && ` · ${formatWeeks(streak.weeks)} i træk`}
            </span>
          </div>

          <p className="sheet-note">
            Du får streak ved at nå dit ugentlige mål. 1 flamme = 1 uge hvor du ramte
            målet.
          </p>

          <button
            className="ghost-btn"
            disabled={logged === 0}
            onClick={() => void undoLast(member.id)}
          >
            Fortryd sidste træning
          </button>
          <button
            className="ghost-btn"
            disabled={logged === 0}
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true)
                return
              }
              setConfirmReset(false)
              void resetHistory(member.id)
            }}
          >
            {confirmReset ? 'Sikker? Sletter alle træninger' : 'Nulstil alle træninger'}
          </button>
        </>
      )}
    </Sheet>
  )
}
