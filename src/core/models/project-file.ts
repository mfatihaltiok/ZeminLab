import type { BoreholeRecord, LaboratoryRecord } from './field-data'
import type { IdealizedSoilProfile } from './idealized-soil-profile'
import { normalizeProjectInfo, type ProjectInfo, type UnitSystem } from './project'

export const PROJECT_SCHEMA_VERSION = 2 as const
export type ProjectDocument = { projectInfo: ProjectInfo; boreholes: BoreholeRecord[]; labs: LaboratoryRecord[]; idealizedSoilProfile?: IdealizedSoilProfile }

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null

const number = (value: unknown, label: string, min = -Infinity): number | undefined => {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) throw new Error(label + ' geçersiz.')
  return value
}

const text = (value: unknown, label: string, required = true): string | undefined => {
  if (value === undefined && !required) return undefined
  if (typeof value !== 'string' || (required && value.length === 0)) throw new Error(label + ' geçersiz.')
  return value
}

function validateBoreholes(boreholes: BoreholeRecord[], unitSystem: UnitSystem): Set<string> {
  const ids = new Set<string>()
  const sptIds = new Set<string>()
  for (const b of boreholes) {
    if (ids.has(b.id)) throw new Error('Tekrarlanan sondaj kimliği bulundu.')
    ids.add(b.id)
    text(b.id, 'Sondaj ID'); text(b.name, 'Sondaj adı')
    number(b.firstSptDepth, 'İlk SPT derinliği', 0); number(b.totalDepth, 'Sondaj toplam derinliği', 0)
    if (b.groundwaterDepth !== undefined) number(b.groundwaterDepth, 'Sondaj YASS', 0)
    b.unitSystem = b.unitSystem === 'kN-m' || b.unitSystem === 'ton-m' ? b.unitSystem : unitSystem
    if (!Array.isArray(b.lithology) || !Array.isArray(b.spt)) throw new Error(b.name + ': litoloji/SPT listesi bozuk.')
    for (const s of b.spt) {
      if (sptIds.has(s.id)) throw new Error('Tekrarlanan SPT kimliği bulundu.')
      sptIds.add(s.id); text(s.id, 'SPT ID'); number(s.depth, 'SPT derinliği', 0)
      if (s.depthTo !== undefined) number(s.depthTo, 'SPT bitiş derinliği', s.depth)
      if (s.testType !== 'SPT' && s.testType !== 'UD') throw new Error(b.name + ': geçersiz deney tipi.')
      if (s.source !== 'manual' && s.source !== 'imported') throw new Error(b.name + ': geçersiz SPT veri kaynağı.')
      for (const [k, v] of Object.entries({ n1: s.n1, n2: s.n2, n3: s.n3 })) if (v !== undefined) number(v, 'SPT ' + k, 0)
      if (s.correction) {
        const cc = s.correction
        for (const [k,v] of Object.entries(cc)) if (typeof v === 'number') number(v,'SPT '+k)
        if (cc.energyRatio !== undefined && cc.energyRatio > 100) throw new Error('SPT enerji oranı %100''den büyük olamaz.')
        if (cc.applyOverburdenCorrection !== undefined && typeof cc.applyOverburdenCorrection !== 'boolean') throw new Error('SPT CN ayarı bozuk.')
        if (cc.applyDilatancyCorrection !== undefined && typeof cc.applyDilatancyCorrection !== 'boolean') throw new Error('SPT dilatansi ayarı bozuk.')
      }
    }
    for (const l of b.lithology) {
      text(l.id, 'Litoloji ID'); number(l.from, 'Litoloji üst derinliği', 0); number(l.to, 'Litoloji alt derinliği', 0)
      if (l.to <= l.from) throw new Error(b.name + ': litoloji alt derinliği üst derinlikten büyük olmalıdır.')
    }
  }
  return ids
}

function validateLabs(labs: LaboratoryRecord[], boreholeIds: Set<string>, unitSystem: UnitSystem): Set<string> {
  const ids = new Set<string>()
  for (const l of labs) {
    if (ids.has(l.id)) throw new Error('Tekrarlanan laboratuvar kimliği bulundu.')
    ids.add(l.id); text(l.id, 'Laboratuvar ID'); text(l.boreholeId, 'Laboratuvar sondaj ID')
    if (!boreholeIds.has(l.boreholeId)) throw new Error('Laboratuvar ' + l.id + ' mevcut olmayan sondaja bağlı.')
    number(l.depth, 'Laboratuvar derinliği', 0)
    if (l.depthTo !== undefined) number(l.depthTo, 'Laboratuvar bitiş derinliği', l.depth)
    if (l.sampleType !== 'UD' && l.sampleType !== 'SPT' && l.sampleType !== 'Other') throw new Error('Laboratuvar ' + l.id + ': geçersiz numune tipi.')
    if (l.source !== 'manual' && l.source !== 'imported') throw new Error('Laboratuvar ' + l.id + ': geçersiz veri kaynağı.')
    l.unitSystem = l.unitSystem === 'kN-m' || l.unitSystem === 'ton-m' ? l.unitSystem : unitSystem
    const numericFields = ['waterContent','sieve10Passing','sieve200Passing','liquidLimit','plasticLimit','plasticityIndex','pointLoadIs50','unitWeight','uniaxialRockStrength','uuC','uuPhi','consolidationCc','consolidationCs','elasticModulus','poissonRatio','hydrometer075','hydrometer002','directShearC','directShearPhi','density','porosity','voidRatio','c','phi','finesContent'] as const
    for (const key of numericFields) if (l[key] !== undefined) number(l[key], 'Laboratuvar ' + l.id + ' ' + key)
      }
  return ids
}

function validateProfile(profile: IdealizedSoilProfile | undefined, boreholeIds: Set<string>, labIds: Set<string>, sptIds: Set<string>): void {
  if (!profile) return
  if (!Array.isArray(profile.layers)) throw new Error('İdealize profil katman listesi bozuk.')
  const ids = new Set<string>(); let previousBottom = 0
  for (const l of profile.layers) {
    if (ids.has(l.id)) throw new Error('Tekrarlanan idealize profil katman ID bulundu.')
    ids.add(l.id); text(l.id, 'Profil katman ID'); number(l.topDepth, 'Profil üst derinliği', 0); number(l.bottomDepth, 'Profil alt derinliği', 0)
    if (l.bottomDepth <= l.topDepth) throw new Error('İdealize profil katman kalınlığı sıfır veya negatif olamaz.')
    if (l.topDepth < previousBottom - 1e-9) throw new Error('İdealize profil katmanları sıralı ve çakışmasız olmalıdır.')
    previousBottom = l.bottomDepth
    if (!Array.isArray(l.boreholeIds) || !Array.isArray(l.sptRecordIds) || !Array.isArray(l.laboratoryRecordIds)) throw new Error('İdealize profil kaynak bağlantıları bozuk.')
    for (const id of l.boreholeIds) if (!boreholeIds.has(id)) throw new Error('Profil katmanı ' + l.id + ': bilinmeyen sondaj bağlantısı.')
    for (const id of l.sptRecordIds) if (!sptIds.has(id)) throw new Error('Profil katmanı ' + l.id + ': bilinmeyen SPT bağlantısı.')
    for (const id of l.laboratoryRecordIds) if (!labIds.has(id)) throw new Error('Profil katmanı ' + l.id + ': bilinmeyen laboratuvar bağlantısı.')
  }
}

export function migrateProjectData(value: unknown, version: number): ProjectDocument {
  if (!Number.isInteger(version) || version < 1) throw new Error('Geçersiz FALUZMN proje şema sürümü.')
  if (version > PROJECT_SCHEMA_VERSION) throw new Error('Bu proje dosyası daha yeni bir FALUZMN sürümüne ait (v' + version + ').')
  const root = object(value)
  if (!root) throw new Error('Geçersiz FALUZMN proje verisi.')
  const rawProject = object(root.projectInfo)
  if (!rawProject) throw new Error('FALUZMN proje bilgileri eksik.')
  const projectInfo = normalizeProjectInfo(rawProject as Partial<ProjectInfo>)
  if (!Array.isArray(root.boreholes) || !Array.isArray(root.labs)) throw new Error('FALUZMN saha verileri eksik veya bozuk.')
  const boreholes = structuredClone(root.boreholes) as BoreholeRecord[]
  const labs = structuredClone(root.labs) as LaboratoryRecord[]
  const boreholeIds = validateBoreholes(boreholes, projectInfo.unitSystem)
  const labIds = validateLabs(labs, boreholeIds, projectInfo.unitSystem)
  const sptIds = new Set(boreholes.flatMap(x => x.spt.map(s => s.id)))
  const profile = root.idealizedSoilProfile && typeof root.idealizedSoilProfile === 'object' ? structuredClone(root.idealizedSoilProfile) as IdealizedSoilProfile : undefined
  validateProfile(profile, boreholeIds, labIds, sptIds)
  return { projectInfo, boreholes, labs, idealizedSoilProfile: profile }
}
