export type UnitCategory = 'length' | 'area' | 'volume' | 'mass' | 'force' | 'stress' | 'unitWeight'

export type UnitDefinition = { id: string; label: string; category: UnitCategory; toBase: number }

export const UNITS: UnitDefinition[] = [
  { id: 'm', label: 'm', category: 'length', toBase: 1 }, { id: 'cm', label: 'cm', category: 'length', toBase: 0.01 }, { id: 'mm', label: 'mm', category: 'length', toBase: 0.001 }, { id: 'ft', label: 'ft', category: 'length', toBase: 0.3048 }, { id: 'in', label: 'in', category: 'length', toBase: 0.0254 },
  { id: 'm2', label: 'm²', category: 'area', toBase: 1 }, { id: 'cm2', label: 'cm²', category: 'area', toBase: 1e-4 }, { id: 'ft2', label: 'ft²', category: 'area', toBase: 0.09290304 },
  { id: 'm3', label: 'm³', category: 'volume', toBase: 1 }, { id: 'cm3', label: 'cm³', category: 'volume', toBase: 1e-6 }, { id: 'ft3', label: 'ft³', category: 'volume', toBase: 0.028316846592 },
  { id: 'kg', label: 'kg', category: 'mass', toBase: 1 }, { id: 'tonne', label: 'ton', category: 'mass', toBase: 1000 }, { id: 'lb', label: 'lb', category: 'mass', toBase: 0.45359237 },
  { id: 'N', label: 'N', category: 'force', toBase: 1 }, { id: 'kN', label: 'kN', category: 'force', toBase: 1000 }, { id: 'kgf', label: 'kgf', category: 'force', toBase: 9.80665 }, { id: 'tf', label: 'tonf', category: 'force', toBase: 9806.65 }, { id: 'lbf', label: 'lbf', category: 'force', toBase: 4.4482216152605 },
  { id: 'Pa', label: 'Pa', category: 'stress', toBase: 1 }, { id: 'kPa', label: 'kPa', category: 'stress', toBase: 1000 }, { id: 'MPa', label: 'MPa', category: 'stress', toBase: 1e6 }, { id: 'kgfcm2', label: 'kgf/cm²', category: 'stress', toBase: 98066.5 }, { id: 'tfm2', label: 'tonf/m²', category: 'stress', toBase: 9806.65 },
  { id: 'kgfm3', label: 'kgf/m³', category: 'unitWeight', toBase: 9.80665 }, { id: 'tfm3', label: 'tonf/m³', category: 'unitWeight', toBase: 9806.65 }, { id: 'kNm3', label: 'kN/m³', category: 'unitWeight', toBase: 1000 }
]

export function unitsFor(category: UnitCategory) { return UNITS.filter((unit) => unit.category === category) }
export function convert(value: number, from: string, to: string): number {
  const source = UNITS.find((u) => u.id === from); const target = UNITS.find((u) => u.id === to)
  if (!source || !target || source.category !== target.category) throw new Error('Birimler aynı kategoriye ait olmalıdır.')
  return value * source.toBase / target.toBase
}
export function formatUnitValue(value: number, decimals = 3) { return Number.isFinite(value) ? value.toLocaleString('tr-TR', { maximumFractionDigits: decimals }) : '—' }

export const DISPLAY_UNITS = {
  force: 'tf', stress: 'tfm2', unitWeight: 'tfm3', length: 'm', area: 'm2', volume: 'm3', mass: 'tonne'
} as const
