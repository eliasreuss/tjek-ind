export function tick() {
  navigator.vibrate?.(6)
}

export function thud() {
  navigator.vibrate?.([12, 30, 18])
}
