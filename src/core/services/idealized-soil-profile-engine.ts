import type { BoreholeRecord, LaboratoryRecord } from '../models/field-data'
import { type IdealizedSoilProfile, type IdealizedSoilLayer } from '../models/idealized-soil-profile'

export interface IdealizedProfileInput {
  boreholes: BoreholeRecord[]
  laboratories: LaboratoryRecord[]
  targetLayerCount: number
  previous?: IdealizedSoilProfile
}

/**
 * Legacy draft generator.
 * It deliberately does not infer c′/φ′, Cu, Es, M, Cc, Cr, e0 or N60.
 * The production workflow is manual in IdealizedSoilProfileScreen.
 */
export function generateIdealizedSoilProfile(input: IdealizedProfileInput): IdealizedSoilProfile {
  if(!input.boreholes.length)throw new Error('İdealize profil için en az bir sondaj gerekir.')
  const maxDepth=Math.max(...input.boreholes.map(b=>b.totalDepth).filter(Number.isFinite),1)
  const target=Math.max(1,Math.min(20,Math.round(input.targetLayerCount)))
  const cuts=new Set<number>([0,maxDepth])
  input.boreholes.forEach(b=>b.lithology.forEach(l=>{if(Number.isFinite(l.from)&&l.from>0&&l.from<maxDepth)cuts.add(l.from);if(Number.isFinite(l.to)&&l.to>0&&l.to<maxDepth)cuts.add(l.to)}))
  const ordered=[...cuts].sort((a,b)=>a-b)
  let selected=ordered
  if(ordered.length>target+1){const step=maxDepth/target;selected=[0,...Array.from({length:target-1},(_,i)=>i+1).map(i=>{const wanted=step*i;return ordered.reduce((best,x)=>Math.abs(x-wanted)<Math.abs(best-wanted)?x:best,ordered[0])}),maxDepth].sort((a,b)=>a-b).filter((x,i,a)=>i===0||x!==a[i-1])}
  const layers:IdealizedSoilLayer[]=selected.slice(0,-1).map((top,i)=>{
    const bottom=selected[i+1]
    const sourceBorehole=input.boreholes.find(b=>b.lithology.some(l=>l.from<bottom&&l.to>top))
    const sourceLithology=sourceBorehole?.lithology.find(l=>l.from<bottom&&l.to>top)
    const linkedLabs=input.laboratories.filter(l=>l.depth>=top&&l.depth<bottom)
    const firstLab=linkedLabs.find(l=>Number.isFinite(l.unitWeight))
    const parameterSources:IdealizedSoilLayer['parameterSources']={}
    if(sourceLithology?.unitWeight!=null)parameterSources.gamma={type:'LİTOLOJİ',boreholeIds:sourceBorehole?[sourceBorehole.id]:[]}
    if(sourceLithology?.saturatedUnitWeight!=null)parameterSources.gammaSat={type:'LİTOLOJİ',boreholeIds:sourceBorehole?[sourceBorehole.id]:[]}
    if(firstLab?.unitWeight!=null&&!parameterSources.gamma)parameterSources.gamma={type:'LABORATUVAR',sampleIds:[firstLab.id]}
    return{
      id:crypto.randomUUID(),order:i+1,topDepth:top,bottomDepth:bottom,thickness:bottom-top,
      soilName:sourceLithology?.description??'Zemin seçilmedi',soilCode:sourceLithology?.code??'',
      boreholeIds:sourceBorehole?[sourceBorehole.id]:[],sptRecordIds:[],laboratoryRecordIds:linkedLabs.map(l=>l.id),
      gamma:sourceLithology?.unitWeight??firstLab?.unitWeight,gammaSat:sourceLithology?.saturatedUnitWeight,
      parameterSources,userOverride:false
    }
  })
  return{
    id:input.previous?.id??crypto.randomUUID(),version:2,status:'TASLAK',targetLayerCount:layers.length,
    generatedAt:new Date().toISOString(),sourceBoreholeIds:[...new Set(input.boreholes.map(b=>b.id))],sourceLaboratoryIds:[...new Set(input.laboratories.map(l=>l.id))],
    layers,parameterUnitSystem:'kN-m',
    methodology:'LEGACY DRAFT: yalnız geometri/litoloji taslağı üretir. c′/φ′, Cu, Es, M, Cc, Cr, e0 ve N60 otomatik türetilmez. Üretim hesabı manuel Idealize Zemin Profili akışından yapılmalıdır.',
    notes:'Bu servis uyumluluk amacıyla korunur; yeni kod tarafından hesap motoru olarak kullanılmamalıdır.'
  }
}
