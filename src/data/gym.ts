import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import { repeatDates, type RepeatFrequency } from '../lib/booking'
import { DEFAULT_WEEKLY_GOAL, MAX_WEEKLY_GOAL, MIN_WEEKLY_GOAL } from '../lib/streak'
import type { Booking, Member, Session } from './types'

const members = collection(db, 'members')
const sessions = collection(db, 'sessions')
const bookings = collection(db, 'bookings')

/** Seeded once into an empty database — edit the roster in the app's admin panel. */
const STARTER_ROSTER = ['Elias', 'Adrian', 'Jacob', 'Marius']

export function watchMembers(onChange: (list: Member[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    query(members, orderBy('name')),
    (snap) => {
      onChange(
        snap.docs.map((d) => ({
          id: d.id,
          name: String(d.data().name ?? ''),
          createdAt: Number(d.data().createdAt ?? 0),
          // Members created before goals existed simply inherit the default.
          weeklyGoal: Number(d.data().weeklyGoal ?? DEFAULT_WEEKLY_GOAL),
        })),
      )
    },
    onError,
  )
}

function toSession(d: QueryDocumentSnapshot<DocumentData>): Session {
  const data = d.data()
  return {
    id: d.id,
    memberId: String(data.memberId ?? ''),
    memberName: String(data.memberName ?? ''),
    startAt: Number(data.startAt ?? 0),
    endAt: Number(data.endAt ?? 0),
    active: Boolean(data.active),
    guests: Number(data.guests ?? 0),
  }
}

export function watchActiveSessions(
  onChange: (list: Session[]) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    query(sessions, where('active', '==', true)),
    (snap) => {
      const list = snap.docs.map(toSession)
      list.sort((a, b) => a.endAt - b.endAt)
      onChange(list)
    },
    onError,
  )
}

/**
 * Finished sessions are kept, so the streaks can be counted from the same rows
 * the live view uses — checking in *is* the log entry.
 */
export function watchSessionsSince(
  since: number,
  onChange: (list: Session[]) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    query(sessions, where('startAt', '>=', since)),
    (snap) => onChange(snap.docs.map(toSession)),
    onError,
  )
}

function toBooking(d: QueryDocumentSnapshot<DocumentData>): Booking {
  const data = d.data()
  return {
    id: d.id,
    memberId: String(data.memberId ?? ''),
    memberName: String(data.memberName ?? ''),
    startAt: Number(data.startAt ?? 0),
    endAt: Number(data.endAt ?? 0),
    createdAt: Number(data.createdAt ?? 0),
  }
}

/**
 * Everything from `since` and onwards, the future included — the calendar needs
 * both the times already blocked out today and the ones still to come.
 */
export function watchBookingsSince(
  since: number,
  onChange: (list: Booking[]) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    query(bookings, where('startAt', '>=', since)),
    (snap) => {
      const list = snap.docs.map(toBooking)
      list.sort((a, b) => a.startAt - b.startAt)
      onChange(list)
    },
    onError,
  )
}

/**
 * A single booking, or — with `repeat` set — the same slot laid down again on
 * a schedule. Every occurrence is its own independent document; there is no
 * series to speak of, so deleting one never touches the others.
 */
export async function addBooking(
  member: Member,
  startAt: number,
  endAt: number,
  repeat: RepeatFrequency | null = null,
) {
  if (endAt <= startAt) return
  const occurrences = repeat ? repeatDates(startAt, endAt, repeat) : [{ startAt, endAt }]
  const createdAt = Date.now()
  const batch = writeBatch(db)
  for (const o of occurrences) {
    batch.set(doc(bookings), {
      memberId: member.id,
      memberName: member.name,
      startAt: o.startAt,
      endAt: o.endAt,
      createdAt,
    })
  }
  await batch.commit()
}

export async function removeBooking(id: string) {
  await deleteDoc(doc(bookings, id))
}

/** Keeps the calendar free of times claimed by someone who is no longer on the roster. */
async function deleteMemberBookings(memberId: string) {
  const snap = await getDocs(query(bookings, where('memberId', '==', memberId)))
  if (snap.empty) return
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db)
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

/**
 * Document IDs are derived from the name so that a member can only ever exist
 * once, even if two phones seed or add at the same moment.
 */
function idFor(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function seedIfEmpty() {
  const snap = await getDocs(query(members, orderBy('name')))
  if (!snap.empty) return
  const batch = writeBatch(db)
  STARTER_ROSTER.forEach((name, i) => {
    batch.set(doc(members, idFor(name)), {
      name,
      createdAt: Date.now() + i,
      weeklyGoal: DEFAULT_WEEKLY_GOAL,
    })
  })
  await batch.commit()
}

export async function addMember(name: string) {
  const clean = name.trim()
  const id = idFor(clean)
  if (!clean || !id) return
  await setDoc(doc(members, id), {
    name: clean,
    createdAt: Date.now(),
    weeklyGoal: DEFAULT_WEEKLY_GOAL,
  })
}

export async function removeMember(id: string) {
  await deleteDoc(doc(members, id))
  // Their sessions stay — the log is history — but their bookings are a claim
  // on time nobody is going to use.
  await deleteMemberBookings(id)
}

/** No accounts means no ownership: any phone can retune anyone's goal. */
export async function setMemberGoal(id: string, goal: number) {
  const clamped = Math.min(MAX_WEEKLY_GOAL, Math.max(MIN_WEEKLY_GOAL, Math.round(goal)))
  await updateDoc(doc(members, id), { weeklyGoal: clamped })
}

export async function startSession(
  member: Member,
  endAt: number,
  guests = 0,
): Promise<string> {
  const ref = await addDoc(sessions, {
    memberId: member.id,
    memberName: member.name,
    startAt: Date.now(),
    endAt,
    active: true,
    guests,
  })
  return ref.id
}

export async function extendSession(sessionId: string, endAt: number) {
  await updateDoc(doc(sessions, sessionId), { endAt })
}

export async function setSessionGuests(sessionId: string, guests: number) {
  await updateDoc(doc(sessions, sessionId), { guests: Math.max(0, Math.round(guests)) })
}

export async function stopSession(sessionId: string) {
  await updateDoc(doc(sessions, sessionId), { active: false, endAt: Date.now() })
}

/** Retires a session that ran past its end time, keeping the planned endAt intact. */
export async function expireSession(sessionId: string) {
  await updateDoc(doc(sessions, sessionId), { active: false })
}

/** Drops the most recent session for a member, active or finished. */
export async function deleteLatestSession(memberId: string) {
  const snap = await getDocs(query(sessions, where('memberId', '==', memberId)))
  if (snap.empty) return
  const latest = snap.docs.reduce((best, d) =>
    Number(d.data().startAt ?? 0) > Number(best.data().startAt ?? 0) ? d : best,
  )
  await deleteDoc(latest.ref)
}

/** Wipes a member's training log so their streak starts over. */
export async function deleteMemberSessions(memberId: string) {
  const snap = await getDocs(query(sessions, where('memberId', '==', memberId)))
  if (snap.empty) return
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db)
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

/** Escape hatch for when someone leaves without checking out. */
export async function stopAllSessions() {
  const snap = await getDocs(query(sessions, where('active', '==', true)))
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.update(d.ref, { active: false, endAt: Date.now() }))
  await batch.commit()
}
