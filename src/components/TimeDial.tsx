import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { tick } from '../lib/haptics'

const SIZE = 300
const CENTER = SIZE / 2
/** The heavy brown wheel. */
const RING_R = 104
const RING_W = 44
/** Thin accent arc riding just outside the wheel. */
const ARC_R = 134
const CIRCUMFERENCE = 2 * Math.PI * ARC_R
const TICK_OUTER = 122
const TICK_INNER = 92
const TICK_COUNT = 12

type Props = {
  minutes: number
  min: number
  max: number
  step: number
  accent: string
  onChange?: (minutes: number) => void
  /** 0–1 fill override; defaults to minutes/max. */
  progress?: number
  interactive?: boolean
  label?: string
  children: ReactNode
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function angleAt(clientX: number, clientY: number, rect: DOMRect): number {
  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)
  return (((Math.atan2(dy, dx) * 180) / Math.PI + 90) + 360) % 360
}

export function TimeDial({
  minutes,
  min,
  max,
  step,
  accent,
  onChange,
  progress,
  interactive = true,
  label,
  children,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; angle: number; raw: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const fraction = clamp(progress ?? minutes / max, 0, 1)
  const knobAngle = fraction * 2 * Math.PI - Math.PI / 2
  const knobX = CENTER + ARC_R * Math.cos(knobAngle)
  const knobY = CENTER + ARC_R * Math.sin(knobAngle)

  const commit = useCallback(
    (raw: number) => {
      const snapped = clamp(Math.round(raw / step) * step, min, max)
      if (snapped !== minutes) {
        tick()
        onChange?.(snapped)
      }
    },
    [max, min, minutes, onChange, step],
  )

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !onChange || drag.current) return
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    // Ignore taps that land in the middle, where the action button lives.
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    if (Math.hypot(dx, dy) < (rect.width / SIZE) * (RING_R - RING_W / 2)) return

    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { pointerId: e.pointerId, angle: angleAt(e.clientX, e.clientY, rect), raw: minutes }
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!state || !rect || state.pointerId !== e.pointerId) return

    const angle = angleAt(e.clientX, e.clientY, rect)
    let delta = angle - state.angle
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360

    state.angle = angle
    // One full revolution sweeps the entire range, EasyPark style.
    state.raw = clamp(state.raw + (delta / 360) * max, min, max)
    commit(state.raw)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return
    drag.current = null
    setDragging(false)
  }

  useEffect(() => {
    if (!dragging) return
    const prevent = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [dragging])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive || !onChange) return
    const nudge = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]
    if (!nudge) return
    e.preventDefault()
    onChange(clamp(minutes + nudge * step, min, max))
  }

  return (
    <div
      ref={wrapRef}
      className={`dial${dragging ? ' is-dragging' : ''}${interactive && onChange ? ' is-interactive' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role={onChange ? 'slider' : undefined}
      tabIndex={onChange ? 0 : undefined}
      aria-label={label}
      aria-valuemin={onChange ? min : undefined}
      aria-valuemax={onChange ? max : undefined}
      aria-valuenow={onChange ? minutes : undefined}
      aria-valuetext={onChange ? `${minutes} minutter` : undefined}
      onKeyDown={onKeyDown}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="dial-svg" aria-hidden="true">
        <circle className="dial-face" cx={CENTER} cy={CENTER} r={RING_R - RING_W / 2 + 2} />
        <circle className="dial-track" cx={CENTER} cy={CENTER} r={RING_R} strokeWidth={RING_W} />
        <g className="dial-ticks">
          {Array.from({ length: TICK_COUNT }, (_, i) => (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER - TICK_OUTER}
              x2={CENTER}
              y2={CENTER - TICK_INNER}
              transform={`rotate(${(360 / TICK_COUNT) * i} ${CENTER} ${CENTER})`}
            />
          ))}
        </g>
        <circle className="dial-arc-track" cx={CENTER} cy={CENTER} r={ARC_R} />
        <circle
          className="dial-fill"
          cx={CENTER}
          cy={CENTER}
          r={ARC_R}
          stroke={accent}
          strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
        {interactive && onChange && (
          <g className="dial-knob" transform={`translate(${knobX} ${knobY})`}>
            <circle r="13" className="dial-knob-halo" />
            <circle r="8" className="dial-knob-dot" fill={accent} />
            <circle r="3.4" className="dial-knob-pip" />
          </g>
        )}
      </svg>
      <div className="dial-core">{children}</div>
    </div>
  )
}
