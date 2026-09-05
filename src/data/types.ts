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
