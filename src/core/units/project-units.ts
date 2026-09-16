import { convert } from './unit-conversion'
import type { UnitSystem } from '../models/project'

export function forceToBase(value: number, system: UnitSystem) { if (system === 'kgf-cm') return convert(value, 'kgf', 'kN'); if (system === 'lb-ft') return convert(value, 'lbf', 'kN'); return convert(value, 'tf', 'kN') }
export function forceFromBase(value: number, system: UnitSystem) { if (system === 'kgf-cm') return convert(value, 'kN', 'kgf'); if (system === 'lb-ft') return convert(value, 'kN', 'lbf'); return convert(value, 'kN', 'tf') }
export function stressToBase(value: number, system: UnitSystem) { if (system === 'kgf-cm') return convert(value, 'kgfcm2', 'kPa'); if (system === 'lb-ft') return convert(value, 'kPa', 'kPa'); return convert(value, 'tfm2', 'kPa') }
export function stressFromBase(value: number, system: UnitSystem) { if (system === 'kgf-cm') return convert(value, 'kPa', 'kgfcm2'); if (system === 'lb-ft') return value; return convert(value, 'kPa', 'tfm2') }
export function unitWeightToBase(value: number, system: UnitSystem) { if (system === 'kgf-cm') return convert(value, 'kgfm3', 'kNm3'); if (system === 'lb-ft') return value * 0.157087; return convert(value, 'tfm3', 'kNm3') }
export function unitWeightFromBase(value: number, system: UnitSystem) { if (system === 'kgf-cm') return convert(value, 'kNm3', 'kgfm3'); if (system === 'lb-ft') return value / 0.157087; return convert(value, 'kNm3', 'tfm3') }
export function momentToBase(value: number, system: UnitSystem) { return forceToBase(value, system) }
export function momentFromBase(value: number, system: UnitSystem) { return forceFromBase(value, system) }
export const PROJECT_UNIT_LABELS = { force: 'tonf', stress: 'tonf/m²', unitWeight: 'tonf/m³', moment: 'tonf·m' }
