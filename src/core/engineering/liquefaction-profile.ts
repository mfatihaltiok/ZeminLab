import { liquefactionProfile as canonical, type LiquefactionProfileInput, type LiquefactionProfileResult, type LiquefactionSoilLayer, type LiquefactionSptRecord } from './liquefaction/liquefaction-profile'
export type { LiquefactionProfileInput, LiquefactionProfileResult, LiquefactionSoilLayer, LiquefactionSptRecord }
/** Compatibility facade. New code must import from ./liquefaction/liquefaction-profile. */
export function liquefactionProfile(input:LiquefactionProfileInput):LiquefactionProfileResult{return canonical(input)}
