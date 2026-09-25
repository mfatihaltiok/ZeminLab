import { bearingCapacity } from '../engineering/calculation-engine'
import type { BearingCapacityInput, BearingCapacityResult } from '../models/bearing-capacity'

/**
 * Compatibility facade for the former simple bearing-capacity screen.
 * The engineering calculation itself is centralized in calculation-engine.ts.
 * This legacy API intentionally remains limited to centered vertical loading.
 */
export function calculateBearingCapacity(input:BearingCapacityInput):BearingCapacityResult{
  const result=bearingCapacity({
    B:input.footingWidth,
    L:input.footingWidth,
    Df:input.footingDepth,
    gamma:input.unitWeight,
    c:input.cohesion,
    phi:input.frictionAngle,
    FS:input.safetyFactor,
    method:'Terzaghi'
  }).value
  return {
    Nq:result.Nq,
    Nc:result.Nc,
    Ngamma:result.Ngamma,
    surcharge:input.unitWeight*input.footingDepth,
    ultimateBearingCapacity:result.ultimate,
    netUltimateBearingCapacity:result.netUltimate,
    allowableGrossBearingCapacity:result.allowableGross,
    allowableNetBearingCapacity:result.allowableNet
  }
}
