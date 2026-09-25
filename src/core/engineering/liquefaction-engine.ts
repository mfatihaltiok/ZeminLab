import { liquefactionProfile, type LiquefactionProfileInput, type LiquefactionProfileResult } from './liquefaction/liquefaction-profile'
import { tbdy2018Liquefaction, type TBDYLiquefactionInput, type TBDYLiquefactionResult } from './liquefaction/tbdy2018-liquefaction'
export type CanonicalLiquefactionInput=LiquefactionProfileInput
export type CanonicalLiquefactionResult=LiquefactionProfileResult
/** Compatibility facade; all profile calculations use the canonical TBDY profile engine. */
export function calculateLiquefaction(input:CanonicalLiquefactionInput):CanonicalLiquefactionResult{return liquefactionProfile(input)}
/** Legacy single-point adapter. Use only for compatibility; profile calculations remain canonical. */
export function calculateTBDYLiquefaction(input:TBDYLiquefactionInput):TBDYLiquefactionResult{return tbdy2018Liquefaction(input)}
export type { TBDYLiquefactionInput, TBDYLiquefactionResult }
