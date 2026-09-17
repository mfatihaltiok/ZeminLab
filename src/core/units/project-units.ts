import type { UnitSystem } from '../models/project'

/** ZeminLab proje birimleri: uzunluk m, kuvvet tonf veya kN. Hesap motorları SI tabanında çalışır ve sonuçları proje birimine döndürür. */
const TONF_TO_KN = 9.80665

export const PROJECT_UNIT_LABELS = {
  ton: { force: 'tonf', stress: 'tonf/m²', unitWeight: 'tonf/m³', modulus: 'tonf/m²', moment: 'tonf·m' },
  kN: { force: 'kN', stress: 'kN/m²', unitWeight: 'kN/m³', modulus: 'kN/m²', moment: 'kN·m' }
} as const

export function forceToBase(value:number, system:UnitSystem){return system==='ton-m'?value*TONF_TO_KN:value}
export function forceFromBase(value:number, system:UnitSystem){return system==='ton-m'?value/TONF_TO_KN:value}
export function stressToBase(value:number, system:UnitSystem){return forceToBase(value,system)}
export function stressFromBase(value:number, system:UnitSystem){return forceFromBase(value,system)}
export function unitWeightToBase(value:number, system:UnitSystem){return forceToBase(value,system)}
export function unitWeightFromBase(value:number, system:UnitSystem){return forceFromBase(value,system)}
export function modulusToBase(value:number, system:UnitSystem){return stressToBase(value,system)}
export function modulusFromBase(value:number, system:UnitSystem){return stressFromBase(value,system)}
export function momentToBase(value:number, system:UnitSystem){return forceToBase(value,system)}
export function momentFromBase(value:number, system:UnitSystem){return forceFromBase(value,system)}
export function projectUnits(system:UnitSystem){return system==='ton-m'?PROJECT_UNIT_LABELS.ton:PROJECT_UNIT_LABELS.kN}
