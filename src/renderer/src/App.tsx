import {useState,type ReactNode} from 'react'
import './assets/main.css'
import {WorkspaceShell,type ScreenId} from './workspace/WorkspaceShell'
import {Dashboard,Earthquake,Bearing,FieldScreen,Foundation,JetGrout,Liquefaction,Profile,ProjectInfo,Report,Settlement,useDemoFieldData} from './screens/EngineeringScreens'

export default function App(){
  const [screen,setScreen]=useState<ScreenId>('dashboard')
  const {boreholes,labs,setBoreholes,setLabs}=useDemoFieldData()
  const content:Record<ScreenId,ReactNode>={
    dashboard:<Dashboard onNavigate={setScreen}/>,
    'project-info':<ProjectInfo/>,
    field:<FieldScreen boreholes={boreholes} labs={labs} onBoreholesChange={setBoreholes} onLabsChange={setLabs}/>,
    profile:<Profile/>,
    earthquake:<Earthquake/>,
    'bearing-capacity':<Bearing/>,
    settlement:<Settlement/>,
    liquefaction:<Liquefaction/>,
    foundation:<Foundation/>,
    'jet-grout':<JetGrout/>,
    report:<Report/>
  }
  return <WorkspaceShell screen={screen} onScreenChange={setScreen}>{content[screen]}</WorkspaceShell>
}
