import { normalizeProjectInfo, type ProjectInfo } from '../models/project'
import { useSyncExternalStore } from 'react'
import type { BoreholeRecord, LaboratoryRecord } from '../models/field-data'
import type { IdealizedSoilLayer, IdealizedSoilProfile } from '../models/idealized-soil-profile'
import { forceToBase, stressToBase, unitWeightToBase, modulusToBase, momentToBase } from '../units/project-units'

export const PROJECT_SCHEMA_VERSION = 2
export type ProjectDocument = { projectInfo:ProjectInfo; boreholes:BoreholeRecord[]; labs:LaboratoryRecord[]; idealizedSoilProfile?:IdealizedSoilProfile }
export type ProjectEnvelope = { format:'FALUZMN'; version:number; savedAt:string; data:unknown }

const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
const nonNegative=(x:unknown)=>finite(x)&&x>=0
function convertLabRecord(l:LaboratoryRecord,system:ProjectInfo['unitSystem']):LaboratoryRecord{
  const factor=(fn:(v:number,s:ProjectInfo['unitSystem'])=>number|undefined,k:keyof LaboratoryRecord)=>{const v=l[k];return finite(v)?fn(v,system as never):v as never}
  return {...l,
    unitWeight:factor(unitWeightToBase,'unitWeight'),pointLoadIs50:factor(stressToBase,'pointLoadIs50'),uniaxialRockStrength:factor(stressToBase,'uniaxialRockStrength'),
    uuC:factor(stressToBase,'uuC'),directShearC:factor(stressToBase,'directShearC'),c:factor(stressToBase,'c'),elasticModulus:factor(modulusToBase,'elasticModulus'),
    oedometricModulus:factor(modulusToBase,'oedometricModulus'),engineeringUnitSystem:'kN-m'
  }
}
function convertLayer(l:any,system:ProjectInfo['unitSystem']){
  return {...l,unitWeight:finite(l.unitWeight)?unitWeightToBase(l.unitWeight,system):l.unitWeight,saturatedUnitWeight:finite(l.saturatedUnitWeight)?unitWeightToBase(l.saturatedUnitWeight,system):l.saturatedUnitWeight,
    cohesion:finite(l.cohesion)?stressToBase(l.cohesion,system):l.cohesion,undrainedCohesion:finite(l.undrainedCohesion)?stressToBase(l.undrainedCohesion,system):l.undrainedCohesion,
    elasticModulus:finite(l.elasticModulus)?modulusToBase(l.elasticModulus,system):l.elasticModulus,
    constrainedModulus:undefined,oedometricModulus:undefined,parameterSources:l.parameterSources??{},consolidationState:l.consolidationState??'UNKNOWN'
  }
}
function normalizeBorehole(b:BoreholeRecord):BoreholeRecord{
  const lithology=(Array.isArray(b.lithology)?b.lithology:[]).filter(x=>finite(x.from)&&finite(x.to)&&x.to>x.from).map(x=>({...x,from:Math.max(0,x.from),to:Math.max(0,x.to)}))
  const spt=(Array.isArray(b.spt)?b.spt:[]).filter(x=>finite(x.depth)&&x.depth>=0).map(x=>({...x,depth:Math.max(0,x.depth),depthTo:x.depthTo??x.depth+(x.testType==='UD'?.5:.45),correction:x.correction?{...x.correction,applyOverburdenCorrection:x.correction.applyOverburdenCorrection??true,applyDilatancyCorrection:x.correction.applyDilatancyCorrection??false}:undefined}))
  return {...b,firstSptDepth:finite(b.firstSptDepth)?Math.max(0,b.firstSptDepth):1.5,totalDepth:finite(b.totalDepth)?Math.max(0,b.totalDepth):0,lithology,spt,logObservations:Array.isArray(b.logObservations)?b.logObservations:[]}
}
function normalizeLab(l:LaboratoryRecord):LaboratoryRecord{return {...l,depth:Math.max(0,l.depth),source:l.source==='imported'?'imported':'manual',confirmed:Boolean(l.confirmed)}}
function normalizeProfile(p:IdealizedSoilProfile|undefined,system:ProjectInfo['unitSystem']):IdealizedSoilProfile|undefined{
  if(!p||!Array.isArray(p.layers))return undefined
  return {...p,version:2,parameterUnitSystem:'kN-m',status:p.status==='SABİTLENDİ'?'SABİTLENDİ':'TASLAK',
    layers:p.layers.map((l:any)=>convertLayer(l,system)),notes:[p.notes??'', 'MIGRASYON: Es/M değerleri ve c′/φ′ anlamları eski şemada kesin ayrıştırılamadığı için M alanları temizlendi; LAB kaynağı yeniden doğrulanmalıdır.'].filter(Boolean).join(' ')
  }
}
export function migrateProjectData(value:unknown,version:number):ProjectDocument{
  if(!value||typeof value!=='object')throw new Error('Geçersiz FALUZMN proje verisi.')
  if(version>PROJECT_SCHEMA_VERSION)throw new Error(`Bu proje dosyası daha yeni bir FALUZMN sürümüne ait (v${version}).`)
  const d=value as Partial<ProjectDocument>
  if(!d.projectInfo||!Array.isArray(d.boreholes)||!Array.isArray(d.labs))throw new Error('FALUZMN proje verisi eksik veya bozuk.')
  const projectInfo=normalizeProjectInfo(d.projectInfo)
  const oldSystem=projectInfo.unitSystem
  const labs=d.labs.map(normalizeLab).map(l=>l.engineeringUnitSystem==='kN-m'?l:convertLabRecord(l,oldSystem))
  const boreholes=d.boreholes.map(normalizeBorehole).map(b=>({...b,lithology:b.lithology.map(l=>convertLayer(l,oldSystem))}))
  return {projectInfo,boreholes,labs,idealizedSoilProfile:normalizeProfile(d.idealizedSoilProfile,oldSystem)}
}
type Listener=()=>void
let projectInfo:ProjectInfo=normalizeProjectInfo({})
const listeners=new Set<Listener>()
function subscribe(listener:Listener){listeners.add(listener);return()=>listeners.delete(listener)}
function getSnapshot(){return projectInfo}
export function updateProjectInfo(next:ProjectInfo){projectInfo=normalizeProjectInfo(next);listeners.forEach(l=>l())}
export function useProjectInfo(){return useSyncExternalStore(subscribe,getSnapshot,getSnapshot)}
