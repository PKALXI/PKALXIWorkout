import { useEffect, useState } from 'react'
import type { WeightUnit } from './types'

const KEY = 'pkalxi.unit'

export function getUnit(): WeightUnit {
  return localStorage.getItem(KEY) === 'lb' ? 'lb' : 'kg'
}

/** Weight unit is a display-only preference, so it lives in localStorage, not Firestore. */
export function useUnit(): [WeightUnit, (u: WeightUnit) => void] {
  const [unit, setUnitState] = useState<WeightUnit>(getUnit)

  useEffect(() => {
    const sync = () => setUnitState(getUnit())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  return [
    unit,
    (u) => {
      localStorage.setItem(KEY, u)
      setUnitState(u)
    },
  ]
}

export const fmtWeight = (w: number, unit: WeightUnit) =>
  `${Number.isInteger(w) ? w : w.toFixed(1)}${unit}`

export const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export const fmtDateFull = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export function daysAgo(d: Date) {
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (diff <= 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 7) return `${diff}d ago`
  if (diff < 60) return `${Math.floor(diff / 7)}w ago`
  return `${Math.floor(diff / 30)}mo ago`
}
