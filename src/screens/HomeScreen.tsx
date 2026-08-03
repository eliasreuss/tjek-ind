import { motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { ArrowRight, Gear } from '../components/Icons'
import { useGym } from '../hooks/gymContext'
import { durationParts, formatClock, MINUTE } from '../lib/time'
import type { Session } from '../data/types'

type Props = {
  onStart: () => void
  onOpenSession: () => void
  onOpenAdmin: () => void
}

// Lives in public/, so it needs Vite's base path prepended to survive the
// /<repo>/ subdirectory on GitHub Pages.
const illustration = `${import.meta.env.BASE_URL}illustration.png`

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

function PersonCard({ session, now, isMe }: { session: Session; now: number; isMe: boolean }) {
  const left = Math.max(0, session.endAt - now)
  const total = Math.max(1, session.endAt - session.startAt)
  const done = Math.min(100, Math.max(0, (1 - left / total) * 100))
  const parts = durationParts(Math.ceil(left / MINUTE))
  // Beyond three guests the row of identical circles stops being readable, so
  // the tail collapses into a count.
  const shownGuests = session.guests > 3 ? 2 : session.guests
  const restGuests = session.guests - shownGuests

  return (
    <article className={`person${isMe ? ' is-me' : ''}`}>
      <div className="person-top">
        <span className="person-stack">
          <Avatar name={session.memberName} size={44} />
          {Array.from({ length: shownGuests }, (_, i) => (
            <span key={i} className="guest-av" aria-hidden="true">
              G
            </span>
          ))}
          {restGuests > 0 && (
            <span className="guest-av" aria-hidden="true">
              +{restGuests}
            </span>
          )}
        </span>
        <span className={`person-badge${parts.length > 1 ? ' is-split' : ''}`}>
          {parts.map((p) => (
            <span key={p.unit}>
              {p.value}
              <em>{p.unit}</em>
            </span>
          ))}
        </span>
      </div>
      <h2 className="person-name">{session.memberName}</h2>
      <p className="person-meta">
        Slutter {formatClock(session.endAt)}
        {session.guests > 0 && ` · ${session.guests} ${session.guests === 1 ? 'gæst' : 'gæster'}`}
      </p>
      <div className="person-bar">
        <i style={{ width: `${done}%` }} />
      </div>
    </article>
  )
}

export function HomeScreen({ onStart, onOpenSession, onOpenAdmin }: Props) {
  const { busy, active, freeAt, now, mySession, peopleTraining, ready } = useGym()
  const soloWithoutGuests = active.length === 1 && active[0].guests === 0

  return (
    <div className="screen">
      <main className="home-body">
        {!ready ? (
          <h1 className="headline is-muted">Henter…</h1>
        ) : busy ? (
          <>
            <motion.div variants={rise} initial="hidden" animate="show" custom={0}>
              <h1 className="headline">Ledigt kl. {formatClock(freeAt ?? now)}</h1>
              <p className="lede">
                {soloWithoutGuests
                  ? `${active[0].memberName} træner lige nu`
                  : `${peopleTraining} træner lige nu`}
              </p>
            </motion.div>

            <div className="stack">
              {active.map((s, i) => (
                <motion.div
                  key={s.id}
                  variants={rise}
                  initial="hidden"
                  animate="show"
                  custom={i + 1}
                >
                  <PersonCard session={s} now={now} isMe={mySession?.id === s.id} />
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <>
            <motion.div variants={rise} initial="hidden" animate="show" custom={0}>
              <h1 className="headline">Centret er frit</h1>
              <p className="lede">Ingen har tjekket ind</p>
            </motion.div>

            <motion.div
              className="idle"
              variants={rise}
              initial="hidden"
              animate="show"
              custom={1}
            >
              <img className="idle-art" src={illustration} alt="" aria-hidden="true" />
            </motion.div>
          </>
        )}
      </main>

      <footer className="dock">
        <button className="icon-btn" onClick={onOpenAdmin} aria-label="Administration">
          <Gear size={26} />
        </button>
        {mySession ? (
          <button className="cta" onClick={onOpenSession}>
            <span className="cta-label">Afslut træning</span>
            <span className="cta-tail">{formatClock(mySession.endAt)}</span>
            <span className="cta-orb">
              <ArrowRight size={24} />
            </span>
          </button>
        ) : (
          <button className="cta" onClick={onStart}>
            <span className="cta-label">Start træning</span>
            <span className="cta-orb">
              <ArrowRight size={24} />
            </span>
          </button>
        )}
      </footer>
    </div>
  )
}
