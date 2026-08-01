import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AdminSheet } from './screens/AdminSheet'
import { ActiveScreen } from './screens/ActiveScreen'
import { DialScreen } from './screens/DialScreen'
import { HomeScreen } from './screens/HomeScreen'
import { PickMemberScreen } from './screens/PickMemberScreen'
import { GymProvider } from './hooks/GymProvider'
import { useGym } from './hooks/gymContext'
import type { Member } from './data/types'
import './styles/tokens.css'
import './styles/app.css'

type Route = 'home' | 'pick' | 'dial' | 'active'

const slide = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
}

function Shell() {
  const { me, mySession, error } = useGym()
  const [route, setRoute] = useState<Route>('home')
  const [picked, setPicked] = useState<Member | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(id)
  }, [toast])

  // If the session disappears while it's on screen, fall back to the overview.
  useEffect(() => {
    if (route === 'active' && !mySession) setRoute('home')
  }, [route, mySession])

  const beginFlow = () => {
    if (me && !mySession) {
      setPicked(me)
      setRoute('dial')
    } else {
      setRoute('pick')
    }
  }

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {route === 'home' && (
          <motion.div key="home" className="route" {...slide}>
            <HomeScreen
              onStart={beginFlow}
              onOpenSession={() => setRoute('active')}
              onOpenAdmin={() => setAdminOpen(true)}
            />
          </motion.div>
        )}

        {route === 'pick' && (
          <motion.div key="pick" className="route" {...slide}>
            <PickMemberScreen
              onBack={() => setRoute('home')}
              onPick={(m) => {
                setPicked(m)
                setRoute('dial')
              }}
            />
          </motion.div>
        )}

        {route === 'dial' && picked && (
          <motion.div key="dial" className="route" {...slide}>
            <DialScreen
              member={picked}
              onBack={() => setRoute('pick')}
              onStarted={() => {
                setToast('Træning startet — god fornøjelse')
                setRoute('home')
              }}
            />
          </motion.div>
        )}

        {route === 'active' && mySession && (
          <motion.div key="active" className="route" {...slide}>
            <ActiveScreen
              session={mySession}
              onBack={() => setRoute('home')}
              onStopped={() => {
                setToast('Tak for i dag — centret er ledigt igen')
                setRoute('home')
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AdminSheet open={adminOpen} onClose={() => setAdminOpen(false)} />

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <div className="error-bar">Ingen forbindelse til databasen</div>}
    </div>
  )
}

export default function App() {
  return (
    <GymProvider>
      <Shell />
    </GymProvider>
  )
}
