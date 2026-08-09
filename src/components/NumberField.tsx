import { useEffect, useRef, useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  /** amount the − / + buttons move by; also the input's step */
  step?: number
  decimal?: boolean
  /** show − / + buttons either side of the input */
  steppers?: boolean
}

/**
 * A number input you can actually edit on a phone.
 *
 * The naive version — value={n}, onChange={Math.max(1, +e.target.value || 1)} —
 * clamps on every keystroke, so the field can never be empty or hold a partial
 * value, deleting a digit snaps it back and moves the caret, and small numbers
 * become unreachable. Here the text is local while focused and only parsed and
 * clamped on blur, so backspacing to empty and typing "1" does what you expect.
 */
export default function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  decimal = false,
  steppers = false,
}: Props) {
  const [text, setText] = useState(String(value))
  const focused = useRef(false)

  // follow external changes (a stepper press, moving to the next exercise) but
  // never yank the text out from under someone mid-edit
  useEffect(() => {
    if (!focused.current) setText(String(value))
  }, [value])

  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  function commit(raw: string) {
    const n = decimal ? parseFloat(raw) : parseInt(raw, 10)
    const next = Number.isFinite(n) ? clamp(n) : value
    setText(String(next))
    if (next !== value) onChange(next)
  }

  function bump(delta: number) {
    const next = clamp(Math.round((value + delta) * 100) / 100)
    setText(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <label className="num-field">
      <span className="num-field-label">{label}</span>
      <span className="num-field-controls">
        {steppers && (
          <button
            type="button"
            className="stepper"
            aria-label={`Decrease ${label}`}
            onClick={() => bump(-step)}
            disabled={value <= min}
          >
            −
          </button>
        )}
        <input
          className="input input-num"
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={text}
          aria-label={label}
          onFocus={(e) => {
            focused.current = true
            e.target.select()
          }}
          onChange={(e) => {
            const raw = e.target.value
            // allow empty and a lone "." while typing; reject letters outright
            if (raw === '' || new RegExp(`^\\d*${decimal ? '\\.?\\d*' : ''}$`).test(raw)) {
              setText(raw)
              const n = decimal ? parseFloat(raw) : parseInt(raw, 10)
              if (Number.isFinite(n) && n >= min && n <= max) onChange(n)
            }
          }}
          onBlur={(e) => {
            focused.current = false
            commit(e.target.value)
          }}
        />
        {steppers && (
          <button
            type="button"
            className="stepper"
            aria-label={`Increase ${label}`}
            onClick={() => bump(step)}
            disabled={value >= max}
          >
            +
          </button>
        )}
      </span>
    </label>
  )
}
