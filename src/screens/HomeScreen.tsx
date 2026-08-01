import { motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { ArrowUp, Bolt, Clock, Gear } from '../components/Icons'
import { GYM_NAME } from '../config'
import { useGym } from '../hooks/gymContext'
import { formatClock, formatDuration, MINUTE } from '../lib/time'
import type { Session } from '../data/types'

type Props = {
  onStart: () => void
  onOpenSession: () => void
  onOpenAdmin: () => void
}

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

function SessionRow({ session, now, isMe }: { session: Session; now: number; isMe: boolean }) {
  const total = Math.max(1, session.endAt - session.startAt)
  const left = Math.max(0, session.endAt - now)
  const fraction = 1 - left / total

  return (
    <li className="session-row">
      <Avatar name={session.memberName} color={session.color} size={40} ring />
      <div className="session-row-text">
        <span className="session-row-name">
          {session.memberName}
          {isMe && <em className="tag-you">dig</em>}
        </span>
        <span className="session-row-meta">Slutter {formatClock(session.endAt)}</span>
      </div>
      <div className="session-row-left">
        <svg viewBox="0 0 40 40" className="mini-ring" aria-hidden="true">
          <circle cx="20" cy="20" r="17" className="mini-ring-track" />
          <circle
            cx="20"
            cy="20"
            r="17"
            className="mini-ring-fill"
            stroke={session.color}
            strokeDasharray={`${fraction * 106.8} 106.8`}
            transform="rotate(-90 20 20)"
          />
        </svg>
        <span className="session-row-count">{Math.ceil(left / MINUTE)}<em>min</em></span>
      </div>
    </li>
  )
}

/** A quiet echo of the dial, so the idle screen still feels like the app. */
function IdleMark() {
  return (
    <div className="idle-mark" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <circle className="idle-ring" cx="100" cy="100" r="72" strokeWidth="26" />
        <g className="idle-ticks">
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="100"
              y1="16"
              x2="100"
              y2="40"
              transform={`rotate(${i * 30} 100 100)`}
            />
          ))}
        </g>
        <circle className="idle-core" cx="100" cy="100" r="57" />
      </svg>
      <span className="idle-label">Klar</span>
    </div>
  )
}

export function HomeScreen({ onStart, onOpenSession, onOpenAdmin }: Props) {
  const { busy, active, freeAt, now, mySession, ready, members } = useGym()
  const freeIn = freeAt ? Math.ceil((freeAt - now) / MINUTE) : 0
  const state = !ready ? 'loading' : busy ? 'busy' : 'free'

  return (
    <div className="screen screen-home">
      <header className="topbar">
        <div className="topbar-title">
          <span className="topbar-eyebrow">{GYM_NAME}</span>
          <h2>Tjek ind</h2>
        </div>
        <button className="icon-btn" onClick={onOpenAdmin} aria-label="Administration">
          <Gear />
        </button>
      </header>

      <main className="home-body">
        <motion.section
          className={`status-card is-${state}`}
          variants={rise}
          initial="hidden"
          animate="show"
          custom={0}
        >
          <div className="status-head">
            <span className="status-pill">
              <i className="status-dot" />
              {state === 'busy' ? 'I brug' : state === 'free' ? 'Ledigt' : 'Henter'}
            </span>
            {state === 'busy' && active.length > 1 && (
              <span className="status-count">{active.length} træner</span>
            )}
          </div>

          <h1 className="status-title">
            {state === 'busy'
              ? 'Der bliver trænet'
              : state === 'free'
                ? 'Centret er frit'
                : 'Henter status…'}
          </h1>

          {state === 'busy' && (
            <p className="status-sub">
              <Clock size={16} />
              Ledigt kl. <strong>{formatClock(freeAt ?? now)}</strong>
              <span className="status-sep">·</span>
              om {formatDuration(freeIn)}
            </p>
          )}
          {state === 'free' && (
            <p className="status-sub">
              <Bolt size={16} />
              Ingen har tjekket ind. Værsgo.
            </p>
          )}
          {state === 'loading' && <span className="status-shimmer" />}

          <div className="status-art" aria-hidden="true">
            <span className="status-art-glow" />
          </div>
        </motion.section>

        {state === 'busy' && (
          <motion.section
            className="panel"
            variants={rise}
            initial="hidden"
            animate="show"
            custom={1}
          >
            <h3 className="panel-title">Hvem træner</h3>
            <ul className="session-list">
              {active.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  now={now}
                  isMe={mySession?.id === s.id}
                />
              ))}
            </ul>
          </motion.section>
        )}

        {state === 'free' && (
          <motion.div
            className="idle-stage"
            variants={rise}
            initial="hidden"
            animate="show"
            custom={1}
          >
            <IdleMark />
            <p className="empty-note">
              Vælg dit navn, drej hjulet til hvornår du er færdig — så kan alle andre se det med
              det samme.
            </p>
            {members.length > 0 && (
              <span className="idle-count">{members.length} personer har adgang</span>
            )}
          </motion.div>
        )}
      </main>

      <footer className="home-footer">
        {mySession ? (
          <button className="cta cta-amber" onClick={onOpenSession}>
            <span>Se min træning</span>
            <span className="cta-time">{formatClock(mySession.endAt)}</span>
          </button>
        ) : (
          <button className="cta" onClick={onStart}>
            <span>Start træning</span>
            <ArrowUp />
          </button>
        )}
      </footer>
    </div>
  )
}
