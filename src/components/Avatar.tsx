import { initialsOf } from '../lib/colors'

type Props = {
  name: string
  color: string
  size?: number
  ring?: boolean
}

export function Avatar({ name, color, size = 32, ring = false }: Props) {
  return (
    <span
      className={`avatar${ring ? ' has-ring' : ''}`}
      style={{
        background: color,
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  )
}
