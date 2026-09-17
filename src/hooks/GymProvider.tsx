import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as gym from '../data/gym'
import type { Booking, Member, Session } from '../data/types'
import {
  computeStreak,
  HISTORY_WEEKS,
  shiftWeeks,
  startOfWeek,
  type Streak,
} from '../lib/streak'
import { addDays, startOfDay } from '../lib/time'
import { GymContext, type GymValue } from './gymContext'
import { useNow } from './useNow'

const ME_KEY = 'tjekind.me'

export function GymProvider({ children }: { children: ReactNode }) {
  const now = useNow(1000)
  const [members, setMembers] = useState<Member[]>([])
  const [rawSessions, setRawSessions] = useState<Session[]>([])
  const [history, setHistory] = useState<Session[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
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

  // Streaks lean on finished sessions, which the live listener filters out. They
  // are never needed to render the front page, so this one doesn't gate `ready`.
  useEffect(() => {
    const since = shiftWeeks(startOfWeek(Date.now()), -HISTORY_WEEKS)
    return gym.watchSessionsSince(since, setHistory, (e) => setError(e.message))
  }, [])

  // Yesterday is included so a booking that ran past midnight still has a row
  // to sit in; the calendar itself decides which days to draw.
  useEffect(() => {
    const since = addDays(startOfDay(Date.now()), -1)
    return gym.watchBookingsSince(since, setBookings, (e) => setError(e.message))
  }, [])

  // A session is over once its clock runs out, whether or not anyone pressed stop.
  const active = useMemo(() => rawSessions.filter((s) => s.endAt > now), [rawSessions, now])

  // The live listener is the fresher of the two, so it wins on conflict; the
  // history listener adds everything that has already finished.
  const sessions = useMemo(() => {
    const byId = new Map(history.map((s) => [s.id, s]))
    for (const s of rawSessions) byId.set(s.id, s)
    return [...byId.values()]
  }, [history, rawSessions])

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

  // Pinned to the start of the week rather than `now`, so the ticking clock
  // doesn't re-tally everyone's history once a second.
  const weekStart = startOfWeek(now)
  const { streaks, sessionCounts } = useMemo(() => {
    const byMember = new Map<string, Session[]>()
    for (const s of history) {
      const list = byMember.get(s.memberId)
      if (list) list.push(s)
      else byMember.set(s.memberId, [s])
    }
    const out: Record<string, Streak> = {}
    const counts: Record<string, number> = {}
    for (const m of members) {
      const list = byMember.get(m.id) ?? []
      out[m.id] = computeStreak(list, m.weeklyGoal, weekStart)
      counts[m.id] = list.length
    }
    return { streaks: out, sessionCounts: counts }
  }, [history, members, weekStart])

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
    sessions,
    bookings,
    busy: active.length > 0,
    peopleTraining: active.reduce((n, s) => n + 1 + s.guests, 0),
    freeAt: active.length > 0 ? Math.max(...active.map((s) => s.endAt)) : null,
    me,
    mySession,
    streaks,
    sessionCounts,
    setMe,
    start: (member, endAt, guests) => {
      setMe(member.id)
      return report(gym.startSession)(member, endAt, guests)
    },
    extend: report(gym.extendSession),
    setGuests: report(gym.setSessionGuests),
    stop: report(gym.stopSession),
    stopAll: report(gym.stopAllSessions),
    book: report(gym.addBooking),
    unbook: report(gym.removeBooking),
    unbookMany: report(gym.removeBookings),
    addMember: report(gym.addMember),
    removeMember: report(gym.removeMember),
    setGoal: report(gym.setMemberGoal),
    undoLast: report(gym.deleteLatestSession),
    resetHistory: report(gym.deleteMemberSessions),
  }

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>
}
