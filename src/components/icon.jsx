/**
 * Thin wrapper around Google Material Symbols Outlined.
 * The font is loaded globally in layout.js <head>.
 * Icon names are the Material Symbols identifiers (snake_case), e.g. "directions_walk".
 * aria-hidden prevents screen readers from announcing the raw icon name as text.
 */
export function Icon({ name, size = 24, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
