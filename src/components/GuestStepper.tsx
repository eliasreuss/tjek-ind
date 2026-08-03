import { Minus, Plus } from './Icons'
import { tick } from '../lib/haptics'

export const MAX_GUESTS = 5

type Props = {
  value: number
  onChange: (guests: number) => void
}

export function GuestStepper({ value, onChange }: Props) {
  const set = (next: number) => {
    if (next === value) return
    tick()
    onChange(next)
  }

  return (
    <div className="guests">
      <span className="guests-label">Gæster</span>
      <button
        className="guests-btn"
        onClick={() => set(Math.max(0, value - 1))}
        disabled={value === 0}
        aria-label="Én gæst mindre"
      >
        <Minus size={18} />
      </button>
      <span className="guests-count" aria-live="polite">
        {value}
      </span>
      <button
        className="guests-btn"
        onClick={() => set(Math.min(MAX_GUESTS, value + 1))}
        disabled={value === MAX_GUESTS}
        aria-label="Én gæst mere"
      >
        <Plus size={18} />
      </button>
    </div>
  )
}
