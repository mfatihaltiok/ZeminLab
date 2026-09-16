import {useState,type ReactNode} from 'react'
import './assets/main.css'
import {WorkspaceShell,type ScreenId} from './workspace/WorkspaceShell'
import {Dashboard,Earthquake,Bearing,FieldScreen,Foundation,JetGrout,Liquefaction,ProjectInfo,Report,Settlement,useDemoFieldData} from './screens/EngineeringScreens'
import {SoilProfileScreen} from './screens/SoilProfileScreen'
import {defaultProjectInfo} from '../../../core/models/project'
import {updateProjectInfo,useProjectInfo} from '../../../core/state/project-store'
import type {ProjectInfo} from '../../../core/models/project'
import type {BoreholeRecord,LaboratoryRecord} from '../../../core/models/field-data'

type ProjectDocument={projectInfo:ProjectInfo;boreholes:BoreholeRecord[];labs:LaboratoryRecord[]}
function isProjectDocument(value:unknown):value is ProjectDocument{if(!value||typeof value!=='object')return false;const data=value as Partial<ProjectDocument>;return!!data.projectInfo&&Array.isArray(data.boreholes)&&Array.isArray(data.labs)}

export default function App(){
 const [screen,setScreen]=useState<ScreenId>('dashboard')
 const project=useProjectInfo()
 const {boreholes,labs,setBoreholes,setLabs}=useDemoFieldData()
 const [projectPath,setProjectPath]=useState<string>()
 const saveProject=async()=>{try{const path=await window.api.project.save({projectInfo:project,boreholes,labs},projectPath);if(path)setProjectPath(path)}catch(error){console.error('ZeminLab proje kaydı başarısız:',error)}}
 const openProject=async()=>{try{const result=await window.api.project.open();if(!result||!isProjectDocument(result.data))return;updateProjectInfo(result.data.projectInfo);setBoreholes(result.data.boreholes);setLabs(result.data.labs);setProjectPath(result.filePath);setScreen('dashboard')}catch(error){console.error('ZeminLab proje açma başarısız:',error)}}
 const newProject=()=>{updateProjectInfo({...defaultProjectInfo,id:crypto.randomUUID(),date:new Date().toISOString().slice(0,10)});setProjectPath(undefined);setBoreholes([]);setLabs([]);setScreen('dashboard')}
 const content:Record<ScreenId,ReactNode>={dashboard:<Dashboard onNavigate={setScreen}/>, 'project-info':<ProjectInfo/>, field:<FieldScreen boreholes={boreholes} labs={labs} onBoreholesChange={setBoreholes} onLabsChange={setLabs}/>, profile:<SoilProfileScreen boreholes={boreholes}/>, earthquake:<Earthquake/>, 'bearing-capacity':<Bearing/>, settlement:<Settlement/>, liquefaction:<Liquefaction/>, foundation:<Foundation/>, 'jet-grout':<JetGrout/>, report:<Report/>}
 return <WorkspaceShell screen={screen} onScreenChange={setScreen} onNewProject={newProject} onOpenProject={openProject} onSaveProject={saveProject}>{content[screen]}</WorkspaceShell>
}
