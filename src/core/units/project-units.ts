import type { UnitSystem } from '../models/project'

const TONF_TO_KN=9.80665

export const PROJECT_UNIT_LABELS={
  ton:{force:'tonf',stress:'tonf/m²',unitWeight:'tonf/m³',modulus:'tonf/m²',moment:'tonf·m'},
  kN:{force:'kN',stress:'kN/m²',unitWeight:'kN/m³',modulus:'kN/m²',moment:'kN·m'},
  // Flat aliases are retained for old report components; new code should use projectUnits().
  force:'tonf',stress:'tonf/m²',unitWeight:'tonf/m³',modulus:'tonf/m²',moment:'tonf·m'
} as const

export const BASE_UNIT_LABELS={force:'kN',stress:'kN/m²',unitWeight:'kN/m³',modulus:'kN/m²',moment:'kN·m'} as const

export function forceToBase(value:number,system:UnitSystem){return system==='ton-m'?value*TONF_TO_KN:value}
export function forceFromBase(value:number,system:UnitSystem){return system==='ton-m'?value/TONF_TO_KN:value}
export const stressToBase=(value:number,system:UnitSystem)=>forceToBase(value,system)
export const stressFromBase=(value:number,system:UnitSystem)=>forceFromBase(value,system)
export const unitWeightToBase=(value:number,system:UnitSystem)=>forceToBase(value,system)
export const unitWeightFromBase=(value:number,system:UnitSystem)=>forceFromBase(value,system)
export const modulusToBase=(value:number,system:UnitSystem)=>stressToBase(value,system)
export const modulusFromBase=(value:number,system:UnitSystem)=>stressFromBase(value,system)
export const momentToBase=(value:number,system:UnitSystem)=>forceToBase(value,system)
export const momentFromBase=(value:number,system:UnitSystem)=>forceFromBase(value,system)
export function projectUnits(system:UnitSystem){return system==='ton-m'?PROJECT_UNIT_LABELS.ton:PROJECT_UNIT_LABELS.kN}
export function isBaseUnitSystem(system:UnitSystem){return system==='kN-m'}
export function requireFinite(value:number,name:string){if(!Number.isFinite(value))throw new Error(`${name} geçerli bir sayı olmalıdır.`);return value}

export type LaboratoryEngineeringField='unitWeight'|'cohesion'|'uuC'|'elasticModulus'
export function laboratoryValueToBase(field:LaboratoryEngineeringField,value:number|undefined,system:UnitSystem){if(value===undefined||!Number.isFinite(value))return undefined;return field==='unitWeight'||field==='cohesion'||field==='uuC'||field==='elasticModulus'?forceToBase(value,system):value}
export function laboratoryValueFromBase(field:LaboratoryEngineeringField,value:number|undefined,system:UnitSystem){if(value===undefined||!Number.isFinite(value))return undefined;return field==='unitWeight'||field==='cohesion'||field==='uuC'||field==='elasticModulus'?forceFromBase(value,system):value}
