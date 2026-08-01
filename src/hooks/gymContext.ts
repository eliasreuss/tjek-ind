import { createContext, useContext } from 'react'
import type { Member, Session } from '../data/types'

export type GymValue = {
  now: number
  ready: boolean
  error: string | null
  members: Member[]
  /** Sessions that are running right now, soonest to finish first. */
  active: Session[]
  busy: boolean
  /** When the gym frees up, i.e. the latest end time of any running session. */
  freeAt: number | null
  me: Member | null
  mySession: Session | null
  setMe: (memberId: string | null) => void
  start: (member: Member, endAt: number) => Promise<void>
  extend: (sessionId: string, endAt: number) => Promise<void>
  stop: (sessionId: string) => Promise<void>
  stopAll: () => Promise<void>
  addMember: (name: string) => Promise<void>
  removeMember: (id: string) => Promise<void>
}

export const GymContext = createContext<GymValue | null>(null)

export function useGym(): GymValue {
  const ctx = useContext(GymContext)
  if (!ctx) throw new Error('useGym must be used inside <GymProvider>')
  return ctx
}
