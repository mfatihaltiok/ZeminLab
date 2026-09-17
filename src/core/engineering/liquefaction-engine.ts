import { liquefactionProfile, type LiquefactionProfileInput, type LiquefactionProfileResult } from './liquefaction/liquefaction-profile'

export type CanonicalLiquefactionInput = LiquefactionProfileInput
export type CanonicalLiquefactionResult = LiquefactionProfileResult

/** Tek kanonik sıvılaşma motoru. Ekran, rapor ve ileride API katmanı bunu kullanmalıdır. */
export function calculateLiquefaction(input:CanonicalLiquefactionInput):CanonicalLiquefactionResult{return liquefactionProfile(input)}
