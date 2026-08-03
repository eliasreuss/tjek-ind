import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { Plus, Trash } from '../components/Icons'
import { Sheet } from '../components/Sheet'
import { ADMIN_PIN } from '../config'
import { useGym } from '../hooks/gymContext'

type Props = {
  open: boolean
  onClose: () => void
}

export function AdminSheet({ open, onClose }: Props) {
  const { members, active, addMember, removeMember, stopAll, me, setMe } = useGym()
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [name, setName] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setPin('')
      setName('')
      setConfirmId(null)
    }
  }, [open])

  const submitPin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === ADMIN_PIN) {
      setUnlocked(true)
      setPin('')
    } else {
      setShake(true)
      setPin('')
      window.setTimeout(() => setShake(false), 500)
    }
  }

  const submitName = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    setName('')
    await addMember(clean)
  }

  const training = new Set(active.map((s) => s.memberId))

  return (
    <Sheet open={open} title="Personer" onClose={onClose}>
      {!unlocked ? (
        <form className="pin-form" onSubmit={submitPin}>
          <motion.input
            className="pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            aria-label="Adgangskode"
          />
          <button className="cta cta-block" type="submit">
            Lås op
          </button>
        </form>
      ) : (
        <>
          <form className="add-row" onSubmit={submitName}>
            <input
              className="text-input"
              placeholder="Nyt navn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Navn på ny person"
            />
            <button className="add-btn" type="submit" aria-label="Tilføj" disabled={!name.trim()}>
              <Plus />
            </button>
          </form>

          <ul className="admin-list">
            <AnimatePresence initial={false}>
              {members.map((m) => (
                <motion.li
                  key={m.id}
                  className="admin-row"
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Avatar name={m.name} size={38} />
                  <span className="admin-name">
                    {m.name}
                    {training.has(m.id) && <i className="live-dot" />}
                  </span>
                  {confirmId === m.id ? (
                    <span className="confirm">
                      <button className="confirm-yes" onClick={() => removeMember(m.id)}>
                        Slet
                      </button>
                      <button className="confirm-no" onClick={() => setConfirmId(null)}>
                        Fortryd
                      </button>
                    </span>
                  ) : (
                    <button
                      className="icon-btn subtle"
                      onClick={() => setConfirmId(m.id)}
                      aria-label={`Fjern ${m.name}`}
                    >
                      <Trash size={18} />
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {active.length > 0 && (
            <button className="ghost-btn" onClick={() => stopAll()}>
              Afslut alle træninger
            </button>
          )}
          {me && (
            <button className="ghost-btn" onClick={() => setMe(null)}>
              Glem “{me.name}” på denne telefon
            </button>
          )}
        </>
      )}
    </Sheet>
  )
}
