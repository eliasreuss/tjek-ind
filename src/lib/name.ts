export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Avatar colours. Deliberately no lime — that belongs to the interface, and a
 * lime avatar would vanish on the lime card. All are light enough to carry the
 * ink initials.
 */
const AVATAR_COLORS = [
  '#4ecdc4', // teal
  '#7cb8f5', // sky
  '#b49bf0', // lilac
  '#ff9270', // coral
  '#f58bb8', // rose
  '#8fd9a8', // mint
]

/** Stable per-name colour, so a person looks the same on every phone. */
export function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
