export type Member = {
  id: string
  name: string
  createdAt: number
  /** Training days per week that keep this person's streak alive. */
  weeklyGoal: number
}

export type Session = {
  id: string
  memberId: string
  memberName: string
  startAt: number
  endAt: number
  active: boolean
  /** People brought along who have no profile of their own. */
  guests: number
}

/**
 * A time someone has claimed in advance. Deliberately not a session: booking is
 * a promise, checking in is the deed, and the front page is only honest if it
 * can tell the two apart.
 */
export type Booking = {
  id: string
  memberId: string
  memberName: string
  startAt: number
  endAt: number
  createdAt: number
  /**
   * Ties the occurrences of one repeating booking together. Null on a one-off,
   * and on anything booked before repeats were linked at all.
   */
  seriesId: string | null
}
