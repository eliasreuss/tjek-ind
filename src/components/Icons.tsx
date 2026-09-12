type IconProps = { size?: number }

const DEFAULT_SIZE = 22

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const ArrowRight = ({ size = DEFAULT_SIZE }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

export const ChevronLeft = ({ size = DEFAULT_SIZE }: IconProps) => (
  <svg {...base(size)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

export const ChevronRight = ({ size = DEFAULT_SIZE }: IconProps) => (
  <svg {...base(size)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
)

export const ChevronDown = ({ size = DEFAULT_SIZE }: IconProps) => (
  <svg {...base(size)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const Gear = ({ size = DEFAULT_SIZE }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03z" />
  </svg>
)

export const Plus = ({ size = DEFAULT_SIZE }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const Minus = ({ size = DEFAULT_SIZE }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 12h14" />
  </svg>
)

export const Close = ({ size = DEFAULT_SIZE }: IconProps) => (
  <svg {...base(size)}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

export const Flame = ({ size = DEFAULT_SIZE, filled = false }: IconProps & { filled?: boolean }) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
)

export const Users = ({ size = DEFAULT_SIZE }: IconProps) => (
  <svg {...base(size)}>
    <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
    <circle cx="10" cy="8" r="3.2" />
    <path d="M17 4.3a3.2 3.2 0 0 1 0 6.2M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" />
  </svg>
)

export const Trash = ({ size = DEFAULT_SIZE }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
  </svg>
)
