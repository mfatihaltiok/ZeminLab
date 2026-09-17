import { useState, type ReactNode } from 'react'
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
import { UnitConverterScreen } from './screens/UnitConverterScreen'
import { OcrSettingsScreen } from './screens/OcrSettingsScreen'
import { EngineeringOcrImport, type LabCandidate, type SptCandidate } from './components/EngineeringOcrImport'
import { Foundation3DView } from './components/Engineering3DView'
import { defaultProjectInfo } from '../../core/models/project'
import { updateProjectInfo, useProjectInfo, migrateProjectData } from '../../core/state/project-store'
import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../../core/models/field-data'
import { ocrProvenance } from '../../core/models/field-data'
import type { IdealizedSoilProfile } from '../../core/models/idealized-soil-profile'
import { createEmptyBorehole } from '../../core/models/field-data-factory'

function FieldCommandBar({boreholes,labs,selectedBoreholeId,onSelectedBoreholeChange,onBoreholesChange,onLabsChange}:{boreholes:BoreholeRecord[];labs:LaboratoryRecord[];selectedBoreholeId:string;onSelectedBoreholeChange:(id:string)=>void;onBoreholesChange:(r:BoreholeRecord[])=>void;onLabsChange:(r:LaboratoryRecord[])=>void}){const create=()=>{const b=createEmptyBorehole(boreholes.length+1);onBoreholesChange([...boreholes,b]);onSelectedBoreholeChange(b.id)};const remove=()=>{const t=boreholes.find(b=>b.id===selectedBoreholeId);if(!t)return;if(!window.confirm(`${t.name} sondajını ve bu sondaja bağlı laboratuvar kayıtlarını silmek istiyor musunuz?`))return;const next=boreholes.filter(b=>b.id!==t.id);onBoreholesChange(next);onLabsChange(labs.filter(l=>l.boreholeId!==t.id));onSelectedBoreholeChange(next[0]?.id??'')};return <div className="field-command-bar"><div className="command-group"><span className="command-caption">SONDAJ YÖNETİMİ</span><button className="command-button primary" onClick={create}>＋ Yeni Sondaj</button><button className="command-button danger" onClick={remove} disabled={!selectedBoreholeId}>Sil</button></div></div>}

function App(){
  const [screen,setScreen]=useState<ScreenId>('dashboard')
  const project=useProjectInfo()
  const [boreholes,setBoreholes]=useState<BoreholeRecord[]>([])
  const [labs,setLabs]=useState<LaboratoryRecord[]>([])
  const [selectedBoreholeId,setSelectedBoreholeId]=useState('')
  const [idealizedSoilProfile,setIdealizedSoilProfile]=useState<IdealizedSoilProfile>()
  const [projectPath,setProjectPath]=useState<string>()
  const selectedBorehole=boreholes.find(b=>b.id===selectedBoreholeId)

  const saveProject=async()=>{try{const path=await window.api.project.save({projectInfo:project,boreholes,labs,idealizedSoilProfile},projectPath);if(path)setProjectPath(path)}catch(e){console.error('ZeminLab proje kaydı başarısız:',e)}}
  const openProject=async()=>{try{const r=await window.api.project.open();if(!r)return;const data=migrateProjectData(r.data,2);updateProjectInfo(data.projectInfo);setBoreholes(data.boreholes);setLabs(data.labs);setSelectedBoreholeId(data.boreholes[0]?.id??'');setIdealizedSoilProfile(data.idealizedSoilProfile);setProjectPath(r.filePath);setScreen('dashboard')}catch(e){console.error('ZeminLab proje açma başarısız:',e)}}
  const newProject=()=>{updateProjectInfo({...defaultProjectInfo,id:crypto.randomUUID(),date:new Date().toISOString().slice(0,10)});setProjectPath(undefined);setBoreholes([]);setLabs([]);setSelectedBoreholeId('');setIdealizedSoilProfile(undefined);setScreen('dashboard')}

  const importSptOcr=(rows:SptCandidate[])=>{
    if(!selectedBorehole)return
    const existingDepths=new Set(selectedBorehole.spt.map(row=>Number(row.depth.toFixed(3))))
    const additions:SptRecord[]=rows.filter(row=>!existingDepths.has(Number(row.depth.toFixed(3)))).map((row,index)=>({id:`SPT-OCR-${crypto.randomUUID()}-${index}`,depth:row.depth,depthTo:row.depth+0.45,testType:'SPT',n1:row.n1,n2:row.n2,n3:row.n3,source:'ocr',confirmed:true,provenance:{...ocrProvenance('PaddleOCR'),approved:true,note:'Kullanıcı OCR önizlemesini onayladı.'}}))
    if(!additions.length)return
    setBoreholes(current=>current.map(b=>b.id===selectedBorehole.id?{...b,spt:[...b.spt,...additions].sort((a,b)=>a.depth-b.depth)}:b))
  }

  const importLabOcr=(targetId:string,rows:LabCandidate[])=>{
    const allowedFields=new Set<keyof LaboratoryRecord>(['waterContent','sieve10Passing','sieve200Passing','liquidLimit','plasticLimit','plasticityIndex','unitWeight','uuC','uuPhi','consolidationCc','consolidationCs','elasticModulus','poissonRatio','directShearC','directShearPhi','density','porosity','voidRatio','c','phi','finesContent'])
    setLabs(current=>current.map(lab=>{
      if(lab.id!==targetId)return lab
      const patch:Partial<LaboratoryRecord>={}
      for(const row of rows){const key=row.field as keyof LaboratoryRecord;if(allowedFields.has(key))(patch as Record<string,number>)[key]=row.value}
      return {...lab,...patch,source:'ocr',confirmed:true,provenance:{...ocrProvenance('PaddleOCR'),approved:true,note:'Kullanıcı OCR önizlemesini onayladı.'}}
    }))
  }

  const field=<>
    <FieldCommandBar boreholes={boreholes} labs={labs} selectedBoreholeId={selectedBoreholeId} onSelectedBoreholeChange={setSelectedBoreholeId} onBoreholesChange={setBoreholes} onLabsChange={setLabs}/>
    <EngineeringOcrImport mode="spt" onSptImport={importSptOcr}/>
    <EngineeringOcrImport mode="laboratory" laboratoryTargets={labs.filter(l=>l.boreholeId===selectedBoreholeId).map(l=>({id:l.id,sampleId:l.sampleId,depth:l.depth}))} onLaboratoryImport={importLabOcr}/>
    <FieldInvestigation boreholes={boreholes} labs={labs} selectedBoreholeId={selectedBoreholeId} onSelectedBoreholeChange={setSelectedBoreholeId} onBoreholesChange={setBoreholes} onLabsChange={setLabs}/>
  </>
  const foundation=<><Foundation/><Foundation3DView boreholes={boreholes}/></>
  const content:Record<ScreenId,ReactNode>={dashboard:<Dashboard onNavigate={setScreen}/>, 'project-info':<ProjectInfoScreenV2/>,field,'borehole-log':<BoreholeLogScreen boreholes={boreholes} labs={labs} onBoreholesChange={setBoreholes}/>,profile:<IdealizedSoilProfileScreen boreholes={boreholes} labs={labs} profile={idealizedSoilProfile} onChange={setIdealizedSoilProfile}/>,'bearing-capacity':<BearingCapacityScreen/>,settlement:<IdealizedSettlementScreen profile={idealizedSoilProfile} boreholes={boreholes}/>,liquefaction:<Liquefaction boreholes={boreholes} labs={labs}/>,foundation,'jet-grout':<JetGroutEngineeringScreen/>,report:<EngineeringReportScreen boreholes={boreholes} labs={labs}/>, 'unit-converter':<UnitConverterScreen/>, 'ocr-settings':<OcrSettingsScreen/>}
  return <WorkspaceShell screen={screen} onScreenChange={setScreen} onNewProject={newProject} onOpenProject={openProject} onSaveProject={saveProject}>{content[screen]}</WorkspaceShell>
}

export default App
