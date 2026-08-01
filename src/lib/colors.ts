/** Deep enough that white initials stay legible on every one. */
export const MEMBER_COLORS = [
  '#E06A22', // clay
  '#74A047', // sage
  '#3F87C6', // sky
  '#D8446E', // rose
  '#8571E4', // lilac
  '#C68A0F', // amber
  '#2FA294', // teal
  '#A65C3E', // terracotta
] as const

/** Stable colour for a name, so the same person always looks the same. */
export function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return MEMBER_COLORS[hash % MEMBER_COLORS.length]
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
