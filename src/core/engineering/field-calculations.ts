import type { BoreholeRecord, LaboratoryRecord, SptCorrectionConfig, SptRecord } from '../models/field-data'

export type PlasticityClass = 'CIL' | 'CIM' | 'CIH' | 'SiL' | 'SiM' | 'SiH'

export interface SoilClassificationResult {
  code: PlasticityClass
  description: string
  plasticityGroup: 'Düşük' | 'Orta' | 'Yüksek'
  isClay: boolean
  aLinePi: number
}

export function classifyFineSoil(liquidLimit?: number, plasticityIndex?: number): SoilClassificationResult | null {
  if (!Number.isFinite(liquidLimit) || !Number.isFinite(plasticityIndex) || liquidLimit! <= 0) return null
  const ll = liquidLimit!
  const pi = plasticityIndex!
  const aLinePi = 0.73 * (ll - 20)
  const isClay = pi >= aLinePi && pi >= 4
  const group = ll < 35 ? 'Düşük' : ll <= 50 ? 'Orta' : 'Yüksek'
  const code = `${isClay ? 'CI' : 'Si'}${group === 'Düşük' ? 'L' : group === 'Orta' ? 'M' : 'H'}` as PlasticityClass
  return { code, description: `${group} Plastisiteli ${isClay ? 'Kil' : 'Silt'} (${code})`, plasticityGroup: group, isClay, aLinePi }
}

export function laboratoryPlasticityIndex(record: LaboratoryRecord): number | undefined {
  if (Number.isFinite(record.plasticityIndex)) return record.plasticityIndex
  if (Number.isFinite(record.liquidLimit) && Number.isFinite(record.plasticLimit)) {
    return record.liquidLimit! - record.plasticLimit!
  }
  return undefined
}

export function fieldN(record: SptRecord): number | undefined {
  if (Number.isFinite(record.nSpt)) return record.nSpt
  if (Number.isFinite(record.n2) && Number.isFinite(record.n3)) return record.n2! + record.n3!
  return undefined
}

export interface SptDerivedValues {
  nField?: number
  energyCorrection: number
  boreholeCorrection: number
  samplerCorrection: number
  rodCorrection: number
  n60?: number
  verticalStress?: number
  effectiveStress?: number
  overburdenCorrection: number
  n1_60?: number
  dilatancyApplied: boolean
  n60DilatancyCorrected?: number
}

const DEFAULT_SPT_CONFIG: SptCorrectionConfig = {
  energyRatio: 60,
  boreholeCorrection: 1,
  samplerCorrection: 1,
  rodLengthCorrection: 1,
  applyOverburdenCorrection: true,
  applyDilatancyCorrection: true
}

function layerAtDepth(borehole: BoreholeRecord, depth: number) {
  return borehole.lithology.find((layer) => depth >= layer.from && depth < layer.to) ??
    borehole.lithology.find((layer) => depth >= layer.from && depth <= layer.to)
}

export function deriveSptValues(borehole: BoreholeRecord, record: SptRecord, config: Partial<SptCorrectionConfig> = {}): SptDerivedValues {
  const cfg = { ...DEFAULT_SPT_CONFIG, ...config, ...record.correction }
  const nField = fieldN(record)
  const energyCorrection = cfg.energyRatio / 60
  const n60 = nField === undefined ? undefined : nField * energyCorrection * cfg.boreholeCorrection * cfg.samplerCorrection * cfg.rodLengthCorrection
  const layer = layerAtDepth(borehole, record.depth)
  const gamma = layer?.unitWeight ?? 18
  const gammaSat = layer?.saturatedUnitWeight ?? gamma
  const gwt = borehole.groundwaterDepth
  const z = Math.max(0, record.depth)
  const above = gwt === undefined ? z : Math.min(z, Math.max(0, gwt))
  const below = z - above
  const verticalStress = above * gamma + below * gammaSat
  const porePressure = gwt !== undefined && z > gwt ? 9.81 * (z - gwt) : 0
  const effectiveStress = Math.max(0.1, verticalStress - porePressure)
  const overburdenCorrection = cfg.applyOverburdenCorrection ? Math.min(2, Math.sqrt(100 / effectiveStress)) : 1
  const n1_60 = n60 === undefined ? undefined : n60 * overburdenCorrection
  const isCohesionless = ['Sa', 'Gr', 'siSa', 'grSa', 'clSa', 'siGr', 'saGr', 'clGr'].includes(record.soilCode ?? layer?.code ?? '')
  const dilatancyApplied = cfg.applyDilatancyCorrection && isCohesionless && n60 !== undefined && n60 > 15 && gwt !== undefined && z >= gwt
  const n60DilatancyCorrected = dilatancyApplied && n60 !== undefined ? 15 + 0.5 * (n60 - 15) : n60
  return { nField, energyCorrection, boreholeCorrection: cfg.boreholeCorrection, samplerCorrection: cfg.samplerCorrection, rodCorrection: cfg.rodLengthCorrection, n60, verticalStress, effectiveStress, overburdenCorrection, n1_60, dilatancyApplied, n60DilatancyCorrected }
}

export function classifyLaboratoryRecord(record: LaboratoryRecord): SoilClassificationResult | null {
  return classifyFineSoil(record.liquidLimit, laboratoryPlasticityIndex(record))
}
