import { useState, type ReactNode } from 'react'
import './assets/main.css'
import './assets/workspace-polish.css'
import './assets/field-workspace.css'
import { WorkspaceShell, type ScreenId } from './workspace/WorkspaceShell'
import { Dashboard, Foundation, JetGrout, Liquefaction, Settlement } from './screens/EngineeringScreens'
import FieldInvestigation from './screens/FieldInvestigation'
import BoreholeLogScreen from './screens/BoreholeLogScreen'
import EngineeringReportScreen from './screens/EngineeringReportScreen'
import { ProjectInfoScreenV2 } from './screens/ProjectInfoScreenV2'
import { SoilProfileScreen } from './screens/SoilProfileScreen'
import { BearingCapacityScreen } from './screens/BearingCapacityScreen'
import { UnitConverterScreen } from './screens/UnitConverterScreen'
import { Foundation3DView } from './components/Engineering3DView'
import { defaultProjectInfo, normalizeProjectInfo } from '../../core/models/project'
import { updateProjectInfo, useProjectInfo } from '../../core/state/project-store'
import type { ProjectInfo as ProjectInfoModel } from '../../core/models/project'
import type { BoreholeRecord, LaboratoryRecord } from '../../core/models/field-data'

type ProjectDocument = { projectInfo: ProjectInfoModel; boreholes: BoreholeRecord[]; labs: LaboratoryRecord[] }
function isProjectDocument(value: unknown): value is ProjectDocument { if (!value || typeof value !== 'object') return false; const data = value as Partial<ProjectDocument>; return !!data.projectInfo && Array.isArray(data.boreholes) && Array.isArray(data.labs) }

function FieldCommandBar({ boreholes, onBoreholesChange, onLabsChange }: { boreholes: BoreholeRecord[]; onBoreholesChange: (rows: BoreholeRecord[]) => void; onLabsChange: (rows: LaboratoryRecord[]) => void }) {
  const [selectedId, setSelectedId] = useState(boreholes[0]?.id ?? '')
  const create = () => {
    const id = crypto.randomUUID()
    const number = boreholes.length + 1
    const b: BoreholeRecord = { id, name: `SK-${number}`, elevation: undefined, totalDepth: 0, groundwaterDepth: undefined, drillingMethod: undefined, drillingDiameter: undefined, firstSptDepth: 1.5, spt: [], lithology: [], logObservations: [] }
    onBoreholesChange([...boreholes, b]); setSelectedId(id)
  }
  const remove = () => {
    const target = boreholes.find(b => b.id === selectedId)
    if (!target) return
    if (!window.confirm(`${target.name} sondajını ve bu sondaja bağlı laboratuvar kayıtlarını silmek istiyor musunuz?`)) return
    onBoreholesChange(boreholes.filter(b => b.id !== target.id))
    onLabsChange([])
    const next = boreholes.find(b => b.id !== target.id)?.id ?? ''
    setSelectedId(next)
  }
  return <div className="field-command-bar"><div className="command-group"><span className="command-caption">SONDAJ YÖNETİMİ</span><button className="command-button primary" onClick={create}>＋ Yeni Sondaj</button><select value={selectedId} onChange={e => setSelectedId(e.target.value)} disabled={!boreholes.length}><option value="">Sondaj seç</option>{boreholes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select><button className="command-button danger" onClick={remove} disabled={!selectedId}>Sil</button></div><div className="command-hint">Sondaj verisi boş başlar · SPT başlangıcı 1.50 m</div></div>
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('dashboard')
  const project = useProjectInfo()
  const [boreholes, setBoreholes] = useState<BoreholeRecord[]>([])
  const [labs, setLabs] = useState<LaboratoryRecord[]>([])
  const [projectPath, setProjectPath] = useState<string>()
  const saveProject = async () => { try { const path = await window.api.project.save({ projectInfo: project, boreholes, labs }, projectPath); if (path) setProjectPath(path) } catch (error) { console.error('ZeminLab proje kaydı başarısız:', error) } }
  const openProject = async () => { try { const result = await window.api.project.open(); if (!result || !isProjectDocument(result.data)) return; updateProjectInfo(normalizeProjectInfo(result.data.projectInfo)); setBoreholes(result.data.boreholes); setLabs(result.data.labs); setProjectPath(result.filePath); setScreen('dashboard') } catch (error) { console.error('ZeminLab proje açma başarısız:', error) } }
  const newProject = () => { updateProjectInfo({ ...defaultProjectInfo, id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10) }); setProjectPath(undefined); setBoreholes([]); setLabs([]); setScreen('dashboard') }
  const fieldWorkspace = <><FieldCommandBar boreholes={boreholes} onBoreholesChange={setBoreholes} onLabsChange={setLabs} /><FieldInvestigation boreholes={boreholes} labs={labs} onBoreholesChange={setBoreholes} onLabsChange={setLabs} /></>
  const foundationWorkspace = <><Foundation /><Foundation3DView boreholes={boreholes} /></>
  const content: Record<ScreenId, ReactNode> = { dashboard: <Dashboard onNavigate={setScreen} />, 'project-info': <ProjectInfoScreenV2 />, field: fieldWorkspace, 'borehole-log': <BoreholeLogScreen boreholes={boreholes} labs={labs} onBoreholesChange={setBoreholes} />, profile: <SoilProfileScreen boreholes={boreholes} labs={labs} />, 'bearing-capacity': <BearingCapacityScreen />, settlement: <Settlement boreholes={boreholes} />, liquefaction: <Liquefaction boreholes={boreholes} labs={labs} />, foundation: foundationWorkspace, 'jet-grout': <JetGrout />, report: <EngineeringReportScreen boreholes={boreholes} labs={labs} />, 'unit-converter': <UnitConverterScreen /> }
  return <WorkspaceShell screen={screen} onScreenChange={setScreen} onNewProject={newProject} onOpenProject={openProject} onSaveProject={saveProject}>{content[screen]}</WorkspaceShell>
}
