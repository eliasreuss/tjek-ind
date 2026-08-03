import { colorForName, initialsOf } from '../lib/name'

type Props = {
  name: string
  size?: number
}

export function Avatar({ name, size = 44 }: Props) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: colorForName(name),
      }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  )
}
