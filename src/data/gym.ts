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
} from 'firebase/firestore'
import { db } from '../firebase'
import { colorForName } from '../lib/colors'
import type { Member, Session } from './types'

const members = collection(db, 'members')
const sessions = collection(db, 'sessions')

/** Seeded once into an empty database — edit the roster in the app's admin panel. */
const STARTER_ROSTER = ['Elias', 'Adrian', 'Jacob', 'Marius']

export function watchMembers(onChange: (list: Member[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    query(members, orderBy('name')),
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const name = String(d.data().name ?? '')
          // Colour is derived from the name, never stored, so it can never drift.
          return { id: d.id, name, color: colorForName(name), createdAt: Number(d.data().createdAt ?? 0) }
        }),
      )
    },
    onError,
  )
}

export function watchActiveSessions(
  onChange: (list: Session[]) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    query(sessions, where('active', '==', true)),
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data()
        const memberName = String(data.memberName ?? '')
        return {
          id: d.id,
          memberId: String(data.memberId ?? ''),
          memberName,
          color: colorForName(memberName),
          startAt: Number(data.startAt ?? 0),
          endAt: Number(data.endAt ?? 0),
          active: Boolean(data.active),
        }
      })
      list.sort((a, b) => a.endAt - b.endAt)
      onChange(list)
    },
    onError,
  )
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
    batch.set(doc(members, idFor(name)), { name, createdAt: Date.now() + i })
  })
  await batch.commit()
}

export async function addMember(name: string) {
  const clean = name.trim()
  const id = idFor(clean)
  if (!clean || !id) return
  await setDoc(doc(members, id), { name: clean, createdAt: Date.now() })
}

export async function removeMember(id: string) {
  await deleteDoc(doc(members, id))
}

export async function startSession(member: Member, endAt: number): Promise<string> {
  const ref = await addDoc(sessions, {
    memberId: member.id,
    memberName: member.name,
    startAt: Date.now(),
    endAt,
    active: true,
  })
  return ref.id
}

export async function extendSession(sessionId: string, endAt: number) {
  await updateDoc(doc(sessions, sessionId), { endAt })
}

export async function stopSession(sessionId: string) {
  await updateDoc(doc(sessions, sessionId), { active: false, endAt: Date.now() })
}

/** Retires a session that ran past its end time, keeping the planned endAt intact. */
export async function expireSession(sessionId: string) {
  await updateDoc(doc(sessions, sessionId), { active: false })
}

/** Escape hatch for when someone leaves without checking out. */
export async function stopAllSessions() {
  const snap = await getDocs(query(sessions, where('active', '==', true)))
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.update(d.ref, { active: false, endAt: Date.now() }))
  await batch.commit()
}
