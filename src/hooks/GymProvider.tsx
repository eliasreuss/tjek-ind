import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as gym from '../data/gym'
import type { Member, Session } from '../data/types'
import { GymContext, type GymValue } from './gymContext'
import { useNow } from './useNow'

const ME_KEY = 'tjekind.me'

export function GymProvider({ children }: { children: ReactNode }) {
  const now = useNow(1000)
  const [members, setMembers] = useState<Member[]>([])
  const [rawSessions, setRawSessions] = useState<Session[]>([])
  const [loaded, setLoaded] = useState({ members: false, sessions: false })
  const [gaveUp, setGaveUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meId, setMeId] = useState<string | null>(() => localStorage.getItem(ME_KEY))
  const expiring = useRef(new Set<string>())

  useEffect(() => {
    const fail = (e: Error) => setError(e.message)
    const stopMembers = gym.watchMembers((list) => {
      setMembers(list)
      setLoaded((s) => (s.members ? s : { ...s, members: true }))
    }, fail)
    const stopSessions = gym.watchActiveSessions((list) => {
      setRawSessions(list)
      setLoaded((s) => (s.sessions ? s : { ...s, sessions: true }))
    }, fail)
    gym.seedIfEmpty().catch(() => {
      /* another client got there first, or we're offline — harmless */
    })
    // Never leave the screen spinning forever on a bad connection.
    const giveUp = window.setTimeout(() => setGaveUp(true), 8000)
    return () => {
      window.clearTimeout(giveUp)
      stopMembers()
      stopSessions()
    }
  }, [])

  // A session is over once its clock runs out, whether or not anyone pressed stop.
  const active = useMemo(() => rawSessions.filter((s) => s.endAt > now), [rawSessions, now])

  useEffect(() => {
    for (const s of rawSessions) {
      if (s.endAt > now || expiring.current.has(s.id)) continue
      expiring.current.add(s.id)
      gym.expireSession(s.id).catch(() => expiring.current.delete(s.id))
    }
  }, [rawSessions, now])

  const setMe = useCallback((memberId: string | null) => {
    setMeId(memberId)
    if (memberId) localStorage.setItem(ME_KEY, memberId)
    else localStorage.removeItem(ME_KEY)
  }, [])

  const me = useMemo(() => members.find((m) => m.id === meId) ?? null, [members, meId])
  const mySession = useMemo(
    () => (meId ? (active.find((s) => s.memberId === meId) ?? null) : null),
    [active, meId],
  )

  // Writes land in the local cache immediately; only a rejected write is worth
  // surfacing, since being offline just queues it.
  const report = useCallback(
    <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) =>
      (...args: A) =>
        fn(...args).then(
          () => undefined,
          (e: Error) => {
            setError(e.message)
          },
        ),
    [],
  )

  const value: GymValue = {
    now,
    ready: (loaded.members && loaded.sessions) || gaveUp,
    error: error ?? (gaveUp && !loaded.members ? 'offline' : null),
    members,
    active,
    busy: active.length > 0,
    peopleTraining: active.reduce((n, s) => n + 1 + s.guests, 0),
    freeAt: active.length > 0 ? Math.max(...active.map((s) => s.endAt)) : null,
    me,
    mySession,
    setMe,
    start: (member, endAt, guests) => {
      setMe(member.id)
      return report(gym.startSession)(member, endAt, guests)
    },
    extend: report(gym.extendSession),
    setGuests: report(gym.setSessionGuests),
    stop: report(gym.stopSession),
    stopAll: report(gym.stopAllSessions),
    addMember: report(gym.addMember),
    removeMember: report(gym.removeMember),
  }

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>
}
