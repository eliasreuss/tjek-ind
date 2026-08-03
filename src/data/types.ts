export type Member = {
  id: string
  name: string
  createdAt: number
}

export type Session = {
  id: string
  memberId: string
  memberName: string
  startAt: number
  endAt: number
  active: boolean
}
