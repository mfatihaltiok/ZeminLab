import { normalizeProjectInfo, type ProjectInfo } from '../models/project'
import { useSyncExternalStore } from 'react'
import type { BoreholeRecord, LaboratoryRecord } from '../models/field-data'
import type { IdealizedSoilProfile } from '../models/idealized-soil-profile'
import { PROJECT_SCHEMA_VERSION, migrateProjectData } from '../models/project-file'
export { PROJECT_SCHEMA_VERSION, migrateProjectData }
export type ProjectDocument={projectInfo:ProjectInfo;boreholes:BoreholeRecord[];labs:LaboratoryRecord[];idealizedSoilProfile?:IdealizedSoilProfile}
export type ProjectEnvelope={format:'FALUZMN';version:number;savedAt:string;data:unknown}
type Listener=()=>void
let projectInfo:ProjectInfo=normalizeProjectInfo({})
const listeners=new Set<Listener>()
function subscribe(listener:Listener){listeners.add(listener);return()=>listeners.delete(listener)}
function getSnapshot(){return projectInfo}
export function updateProjectInfo(next:ProjectInfo){projectInfo=normalizeProjectInfo(next);listeners.forEach(l=>l())}
export function useProjectInfo(){return useSyncExternalStore(subscribe,getSnapshot,getSnapshot)}
