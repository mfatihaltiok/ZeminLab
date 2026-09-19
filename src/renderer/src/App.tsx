import { useEffect, useState, type ReactNode } from 'react'
import './assets/main.css'
import './assets/workspace-polish.css'
import './assets/field-workspace.css'
import './assets/idealized-profile.css'
import { WorkspaceShell, type ScreenId } from './workspace/WorkspaceShell'
import { Dashboard, Foundation, Liquefaction } from './screens/EngineeringScreens'
import { JetGroutEngineeringScreen } from './screens/JetGroutEngineeringScreen'
import { IdealizedSettlementScreen } from './screens/IdealizedSettlementScreen'
import FieldInvestigation from './screens/FieldInvestigation'
import BoreholeLogScreen from './screens/BoreholeLogScreen'
import EngineeringReportScreen from './screens/EngineeringReportScreen'
import { ProjectInfoScreenV2 } from './screens/ProjectInfoScreenV2'
import { IdealizedSoilProfileScreen } from './screens/IdealizedSoilProfileScreen'
import { BearingCapacityScreen } from './screens/BearingCapacityScreen'
import { Foundation3DView } from './components/Engineering3DView'
import { defaultProjectInfo } from '../../core/models/project'
import { updateProjectInfo, useProjectInfo, migrateProjectData } from '../../core/state/project-store'
import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../../core/models/field-data'
import type { IdealizedSoilProfile } from '../../core/models/idealized-soil-profile'
import { createEmptyBorehole } from '../../core/models/field-data-factory'

function FieldCommandBar({boreholes,labs,selectedBoreholeId,onSelectedBoreholeChange,onBoreholesChange,onLabsChange,onSaveBoreholeCache,onSaveLabCache,statusText}:{boreholes:BoreholeRecord[];labs:LaboratoryRecord[];selectedBoreholeId:string;onSelectedBoreholeChange:(id:string)=>void;onBoreholesChange:(r:BoreholeRecord[])=>void;onLabsChange:(r:LaboratoryRecord[])=>void;onSaveBoreholeCache:()=>void;onSaveLabCache:()=>void;statusText:string}){
 const create=()=>{const b=createEmptyBorehole(boreholes.length+1);onBoreholesChange([...boreholes,b]);onSelectedBoreholeChange(b.id)};
 const remove=()=>{const t=boreholes.find(b=>b.id===selectedBoreholeId);if(!t)return;if(!window.confirm(t.name+' sondajını ve bu sondaja bağlı laboratuvar kayıtlarını silmek istiyor musunuz?'))return;const next=boreholes.filter(b=>b.id!==t.id);onBoreholesChange(next);onLabsChange(labs.filter(l=>l.boreholeId!==t.id));onSelectedBoreholeChange(next[0]?.id??'')};
 return <div className="field-command-bar"><div className="command-group"><span className="command-caption">SONDAJ YÖNETİMİ</span><button className="command-button primary" onClick={create}>＋ Yeni Sondaj</button><button className="command-button" onClick={onSaveBoreholeCache} disabled={!boreholes.length}>Sondajı Kaydet</button><button className="command-button danger" onClick={remove} disabled={!selectedBoreholeId}>Sil</button></div><div className="command-group"><span className="command-caption">LABORATUVAR ÖNBELLEĞİ</span><button className="command-button" onClick={onSaveLabCache} disabled={!labs.length}>Laboratuvarı Kaydet</button><span className="command-hint">{statusText}</span></div></div>}

function App(){
 const [statusText,setStatusText]=useState('Hazır');
 const [screen,setScreen]=useState<ScreenId>('dashboard');const project=useProjectInfo();const [boreholes,setBoreholes]=useState<BoreholeRecord[]>([]);const [labs,setLabs]=useState<LaboratoryRecord[]>([]);const [selectedBoreholeId,setSelectedBoreholeId]=useState('');const [idealizedSoilProfile,setIdealizedSoilProfile]=useState<IdealizedSoilProfile>();const [projectPath,setProjectPath]=useState<string>();
 useEffect(()=>{void window.api.fieldCache.load().then(cached=>{if(!cached)return;const data=cached.data as {boreholes?:unknown;labs?:unknown};if(Array.isArray(data.boreholes))setBoreholes(data.boreholes as BoreholeRecord[]);if(Array.isArray(data.labs))setLabs(data.labs as LaboratoryRecord[]);if(Array.isArray(data.boreholes)&&data.boreholes.length)setSelectedBoreholeId((data.boreholes as BoreholeRecord[])[0]?.id??'');setStatusText(cached.savedAt?'Önbellek yüklendi · '+new Date(cached.savedAt).toLocaleString('tr-TR'):'Önbellek yüklendi')}).catch(()=>undefined)},[])
 const cacheFields=async(kind:'borehole'|'laboratory')=>{try{const saved=await window.api.fieldCache.save({boreholes,labs});setStatusText((kind==='borehole'?'Sondaj':'Laboratuvar')+' önbelleğe alındı · '+new Date(saved.savedAt).toLocaleTimeString('tr-TR'))}catch(e){setStatusText('Önbellek kaydı başarısız: '+(e instanceof Error?e.message:String(e)))}}
 const saveProject=async()=>{try{const path=await window.api.project.save({projectInfo:project,boreholes,labs,idealizedSoilProfile},projectPath);if(path){setProjectPath(path);setStatusText(`Kaydedildi · ${path}`)}else setStatusText('Kaydet iptal edildi')}catch(e){const message=e instanceof Error?e.message:String(e);setStatusText(`Kaydetme başarısız: ${message}`);console.error('FALUZMN proje kaydı başarısız:',e)}}
 const saveProjectAs=async()=>{try{const path=await window.api.project.saveAs({projectInfo:project,boreholes,labs,idealizedSoilProfile},projectPath);if(path){setProjectPath(path);setStatusText(`Farklı kaydedildi · ${path}`)}else setStatusText('Farklı Kaydet iptal edildi')}catch(e){const message=e instanceof Error?e.message:String(e);setStatusText(`Farklı kaydetme başarısız: ${message}`)}}
 const openProject=async()=>{try{const r=await window.api.project.open();if(!r){setStatusText('Açma iptal edildi');return;}const data=migrateProjectData(r.data,r.version);updateProjectInfo(data.projectInfo);setBoreholes(data.boreholes);setLabs(data.labs);setSelectedBoreholeId(data.boreholes[0]?.id??'');setIdealizedSoilProfile(data.idealizedSoilProfile);setProjectPath(r.filePath);setStatusText(`Açıldı · ${r.filePath}`);setScreen('dashboard')}catch(e){const message=e instanceof Error?e.message:String(e);setStatusText(`Açma başarısız: ${message}`);console.error('FALUZMN proje açma başarısız:',e)}}
 const newProject=()=>{updateProjectInfo({...defaultProjectInfo,id:crypto.randomUUID(),date:new Date().toISOString().slice(0,10)});setProjectPath(undefined);setBoreholes([]);setLabs([]);setSelectedBoreholeId('');setIdealizedSoilProfile(undefined);setStatusText('Yeni proje oluşturuldu');setScreen('dashboard')}
 const field=<><FieldCommandBar boreholes={boreholes} labs={labs} selectedBoreholeId={selectedBoreholeId} onSelectedBoreholeChange={setSelectedBoreholeId} onBoreholesChange={setBoreholes} onLabsChange={setLabs} onSaveBoreholeCache={()=>void cacheFields('borehole')} onSaveLabCache={()=>void cacheFields('laboratory')} statusText={statusText}/><FieldInvestigation boreholes={boreholes} labs={labs} selectedBoreholeId={selectedBoreholeId} onSelectedBoreholeChange={setSelectedBoreholeId} onBoreholesChange={setBoreholes} onLabsChange={setLabs}/></>
 const foundation=<><Foundation/><Foundation3DView boreholes={boreholes}/></>
 const content:Record<ScreenId,ReactNode>={dashboard:<Dashboard onNavigate={setScreen}/>,'project-info':<ProjectInfoScreenV2/>,field:field,'borehole-log':<BoreholeLogScreen boreholes={boreholes} labs={labs} onBoreholesChange={setBoreholes}/>,profile:<IdealizedSoilProfileScreen boreholes={boreholes} labs={labs} profile={idealizedSoilProfile} onChange={setIdealizedSoilProfile}/>, 'bearing-capacity':<BearingCapacityScreen profile={idealizedSoilProfile}/>,settlement:<IdealizedSettlementScreen profile={idealizedSoilProfile} boreholes={boreholes}/>,liquefaction:<Liquefaction boreholes={boreholes} labs={labs}/>,foundation:foundation,'jet-grout':<JetGroutEngineeringScreen/>,report:<EngineeringReportScreen boreholes={boreholes} labs={labs}/>}
 return <WorkspaceShell screen={screen} onScreenChange={setScreen} onNewProject={newProject} onOpenProject={openProject} onSaveProject={saveProject} onSaveAsProject={saveProjectAs} statusText={statusText}>{content[screen]}</WorkspaceShell>
}
export default App
