/**
 * Compatibility entry point.
 * The canonical implementation lives in ./liquefaction/liquefaction-profile.
 * Legacy callers without an approved SPT stress snapshot or project-scope data
 * receive a non-evaluable result rather than an independent, incomplete CRR calculation.
 */
export { liquefactionProfile } from './liquefaction/liquefaction-profile'
export type {
  LiquefactionProfileInput,
  LiquefactionProfileResult,
  LiquefactionProfileRow,
  LiquefactionSoilLayer,
  LiquefactionSptRecord
} from './liquefaction/liquefaction-profile'
