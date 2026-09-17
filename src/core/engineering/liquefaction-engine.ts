import { liquefactionProfile, type LiquefactionProfileInput, type LiquefactionProfileResult } from './liquefaction/liquefaction-profile'
import { tbdy2018Liquefaction, type TBDYLiquefactionInput, type TBDYLiquefactionResult } from './liquefaction/tbdy2018-liquefaction'

export type CanonicalLiquefactionInput = LiquefactionProfileInput
export type CanonicalLiquefactionResult = LiquefactionProfileResult

export { tbdy2018Liquefaction }
export type { TBDYLiquefactionInput, TBDYLiquefactionResult }

/** Tek kanonik profil motoru. */
export function calculateLiquefaction(input:CanonicalLiquefactionInput):CanonicalLiquefactionResult{return liquefactionProfile(input)}

/** TBDY 2018 Ek 16B tek nokta hesabı. */
export function calculateTBDYLiquefaction(input:TBDYLiquefactionInput):TBDYLiquefactionResult{return tbdy2018Liquefaction(input)}
