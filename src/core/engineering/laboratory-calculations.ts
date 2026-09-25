import type { LaboratoryRecord } from '../models/field-data'

/**
 * Laboratory calculation layer.
 *
 * This module intentionally contains only deterministic transformations that
 * do not depend on an empirical correlation. Correlation-based calculations
 * (Cc, Em, c, phi, strength, etc.) will be added here after their source
 * documents are supplied and verified.
 */
export type LaboratoryDerivedValues = {
  plasticityIndex?: number
  dryUnitWeight?: number
  porosityFromVoidRatio?: number
}

export function calculatePlasticityIndex(liquidLimit?: number, plasticLimit?: number): number | undefined {
  if (liquidLimit === undefined || plasticLimit === undefined) return undefined
  if (!Number.isFinite(liquidLimit) || !Number.isFinite(plasticLimit) || liquidLimit < 0 || plasticLimit < 0 || plasticLimit > liquidLimit) return undefined
  return liquidLimit - plasticLimit
}

export function deriveLaboratoryValues(record: LaboratoryRecord): LaboratoryDerivedValues {
  const plasticityIndex = calculatePlasticityIndex(record.liquidLimit, record.plasticLimit)
  const dryUnitWeight =
    record.unitWeight != null && Number.isFinite(record.unitWeight) && record.waterContent != null && Number.isFinite(record.waterContent)
      ? record.unitWeight / (1 + record.waterContent / 100)
      : undefined
  const porosityFromVoidRatio =
    record.voidRatio != null && Number.isFinite(record.voidRatio) && record.voidRatio >= 0
      ? record.voidRatio / (1 + record.voidRatio)
      : undefined
  return { plasticityIndex, dryUnitWeight, porosityFromVoidRatio }
}

/**
 * Applies only the calculations currently approved for the laboratory data
 * layer. No empirical correlation is silently applied here.
 */
export function applyLaboratoryDerivedValues(record: LaboratoryRecord): LaboratoryRecord {
  return {
    ...record,
    ...deriveLaboratoryValues(record)
  }
}
