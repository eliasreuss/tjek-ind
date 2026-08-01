export type Member = {
  id: string
  name: string
  color: string
  createdAt: number
}

export type Session = {
  id: string
  memberId: string
  memberName: string
  color: string
  startAt: number
  endAt: number
  active: boolean
}
