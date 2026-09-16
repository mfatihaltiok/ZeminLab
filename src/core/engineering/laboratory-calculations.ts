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
}

export function calculatePlasticityIndex(liquidLimit?: number, plasticLimit?: number): number | undefined {
  if (liquidLimit === undefined || plasticLimit === undefined) return undefined
  if (!Number.isFinite(liquidLimit) || !Number.isFinite(plasticLimit)) return undefined
  return liquidLimit - plasticLimit
}

export function deriveLaboratoryValues(record: LaboratoryRecord): LaboratoryDerivedValues {
  return {
    plasticityIndex: calculatePlasticityIndex(record.liquidLimit, record.plasticLimit)
  }
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
