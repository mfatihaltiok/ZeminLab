import { normalizeProjectInfo, type ProjectInfo, type SptCorrectionParameters } from '../models/project'
import { useSyncExternalStore } from 'react'
import type { BoreholeRecord, LaboratoryRecord } from '../models/field-data'
import type { IdealizedSoilProfile } from '../models/idealized-soil-profile'

export const PROJECT_SCHEMA_VERSION = 1
export type ProjectDocument = { projectInfo:ProjectInfo; boreholes:BoreholeRecord[]; labs:LaboratoryRecord[]; idealizedSoilProfile?:IdealizedSoilProfile }
export type ProjectEnvelope = { format:'FALUZMN'; version:number; savedAt:string; data:unknown }
export function migrateProjectData(value:unknown,version:number):ProjectDocument {
  if(!value || typeof value!=='object') throw new Error('Geçersiz FALUZMN proje verisi.')
  const d=value as Partial<ProjectDocument>
  if(!d.projectInfo || !Array.isArray(d.boreholes) || !Array.isArray(d.labs)) throw new Error('FALUZMN proje verisi eksik veya bozuk.')
  if(version>PROJECT_SCHEMA_VERSION) throw new Error(`Bu proje dosyası daha yeni bir FALUZMN sürümüne ait (v${version}).`)
  const rawProject=d.projectInfo as ProjectInfo & {sptCorrections?:Partial<SptCorrectionParameters>}
  const legacy=d.boreholes.flatMap(b=>b.spt).map(row=>row.correction).find(Boolean)
  const migratedSpt:Partial<SptCorrectionParameters>|undefined=rawProject.sptCorrections??(legacy?{
    ce:Number.isFinite(legacy.energyRatio)?legacy.energyRatio!/60:undefined,
    cb:Number.isFinite(legacy.boreholeCorrection)?legacy.boreholeCorrection:undefined,
    cs:Number.isFinite(legacy.samplerCorrection)?legacy.samplerCorrection:undefined,
    cr:Number.isFinite(legacy.rodLengthCorrection)?legacy.rodLengthCorrection:undefined
  }:undefined)
  const projectInfo=normalizeProjectInfo({...rawProject,...(migratedSpt?{sptCorrections:migratedSpt}:{} )})
  return {projectInfo,boreholes:d.boreholes,labs:d.labs,idealizedSoilProfile:d.idealizedSoilProfile}
}

type Listener=()=>void
let projectInfo:ProjectInfo=normalizeProjectInfo({})
const listeners=new Set<Listener>()
function subscribe(listener:Listener){listeners.add(listener);return()=>listeners.delete(listener)}
function getSnapshot(){return projectInfo}
export function updateProjectInfo(next:ProjectInfo){projectInfo=normalizeProjectInfo(next);listeners.forEach(l=>l())}
export function useProjectInfo(){return useSyncExternalStore(subscribe,getSnapshot,getSnapshot)}
