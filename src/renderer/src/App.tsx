import { useState, type ReactNode } from 'react'
import './assets/main.css'
import { WorkspaceShell, type ScreenId } from './workspace/WorkspaceShell'
import { Dashboard, Foundation, JetGrout, Liquefaction, Settlement } from './screens/EngineeringScreens'
import FieldInvestigation from './screens/FieldInvestigation'
import BoreholeLogScreen from './screens/BoreholeLogScreen'
import EngineeringReportScreen from './screens/EngineeringReportScreen'
import { ProjectInfoScreenV2 } from './screens/ProjectInfoScreenV2'
import { SoilProfileScreen } from './screens/SoilProfileScreen'
import { BearingCapacityScreen } from './screens/BearingCapacityScreen'
import { UnitConverterScreen } from './screens/UnitConverterScreen'
import { defaultProjectInfo } from '../../core/models/project'
import { updateProjectInfo, useProjectInfo } from '../../core/state/project-store'
import type { ProjectInfo as ProjectInfoModel } from '../../core/models/project'
import type { BoreholeRecord, LaboratoryRecord } from '../../core/models/field-data'

type ProjectDocument = { projectInfo: ProjectInfoModel; boreholes: BoreholeRecord[]; labs: LaboratoryRecord[] }
function isProjectDocument(value: unknown): value is ProjectDocument { if (!value || typeof value !== 'object') return false; const data = value as Partial<ProjectDocument>; return !!data.projectInfo && Array.isArray(data.boreholes) && Array.isArray(data.labs) }
export default function App() {
  const [screen,setScreen]=useState<ScreenId>('dashboard'); const project=useProjectInfo(); const [boreholes,setBoreholes]=useState<BoreholeRecord[]>([]); const [labs,setLabs]=useState<LaboratoryRecord[]>([]); const [projectPath,setProjectPath]=useState<string>()
  const saveProject=async()=>{try{const path=await window.api.project.save({projectInfo:project,boreholes,labs},projectPath);if(path)setProjectPath(path)}catch(error){console.error('ZeminLab proje kaydı başarısız:',error)}}
  const openProject=async()=>{try{const result=await window.api.project.open();if(!result||!isProjectDocument(result.data))return;updateProjectInfo(result.data.projectInfo);setBoreholes(result.data.boreholes);setLabs(result.data.labs);setProjectPath(result.filePath);setScreen('dashboard')}catch(error){console.error('ZeminLab proje açma başarısız:',error)}}
  const newProject=()=>{updateProjectInfo({...defaultProjectInfo,id:crypto.randomUUID(),date:new Date().toISOString().slice(0,10)});setProjectPath(undefined);setBoreholes([]);setLabs([]);setScreen('dashboard')}
  const content:Record<ScreenId,ReactNode>={dashboard:<Dashboard onNavigate={setScreen}/>, 'project-info':<ProjectInfoScreenV2/>, field:<FieldInvestigation boreholes={boreholes} labs={labs} onBoreholesChange={setBoreholes} onLabsChange={setLabs}/>, 'borehole-log':<BoreholeLogScreen boreholes={boreholes} labs={labs} onBoreholesChange={setBoreholes}/>, profile:<SoilProfileScreen boreholes={boreholes} labs={labs}/>, 'bearing-capacity':<BearingCapacityScreen/>, settlement:<Settlement/>, liquefaction:<Liquefaction/>, foundation:<Foundation/>, 'jet-grout':<JetGrout/>, report:<EngineeringReportScreen boreholes={boreholes} labs={labs}/>, 'unit-converter':<UnitConverterScreen/>}
  return <WorkspaceShell screen={screen} onScreenChange={setScreen} onNewProject={newProject} onOpenProject={openProject} onSaveProject={saveProject}>{content[screen]}</WorkspaceShell>
}
