import {useState,type ReactNode} from 'react'
import {updateProjectInfo,useProjectInfo} from '../../../core/state/project-store'

export type ScreenId='dashboard'|'project-info'|'field'|'profile'|'earthquake'|'bearing-capacity'|'settlement'|'liquefaction'|'foundation'|'jet-grout'|'report'
export const SCREEN_META:Record<ScreenId,{title:string;group:string}>={dashboard:{title:'Proje Özeti',group:'PROJE'},'project-info':{title:'Proje Bilgileri',group:'PROJE'},field:{title:'Saha / Sondaj',group:'SAHA'},profile:{title:'Zemin Profili',group:'SAHA'},earthquake:{title:'Deprem Parametreleri',group:'ANALİZ'},'bearing-capacity':{title:'Taşıma Gücü',group:'ANALİZ'},settlement:{title:'Oturma',group:'ANALİZ'},liquefaction:{title:'Sıvılaşma',group:'ANALİZ'},foundation:{title:'Temel Tasarımı',group:'TASARIM'},'jet-grout':{title:'Jet Grout',group:'TASARIM'},report:{title:'Mühendislik Raporu',group:'RAPOR'}}

export function Frame({screen,children}:{screen:ScreenId;children:ReactNode}){const m=SCREEN_META[screen];return <section className="engineering-screen"><header className="engineering-header"><div><div className="engineering-header-category">{m.group}</div><h2>{m.title}</h2></div></header><div className="engineering-content">{children}</div></section>}
export function Field({label,value,onChange,type='number'}:{label:string;value:string|number;onChange:(v:string)=>void;type?:string}){return <label><span>{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)}/></label>}
export function Card({title,children}:{title:string;children:ReactNode}){return <div className="calculation-card"><div className="calculation-card-title">{title}</div>{children}</div>}
export function Metric({label,value,unit,tone}:{label:string;value:string|number;unit?:string;tone?:string}){return <div className={`metric ${tone??''}`}><span>{label}</span><strong>{value}</strong>{unit&&<small>{unit}</small>}</div>}
export function Source({children}:{children:ReactNode}){return <div className="engineering-note"><b>Kaynak / yöntem:</b> {children}</div>}
export function Table({headers,rows}:{headers:string[];rows:(string|number)[][]}){return <table className="data-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table>}

type WorkspaceActions={
  onNewProject:()=>void
  onOpenProject:()=>void
  onSaveProject:()=>void
}

export function WorkspaceShell({screen,onScreenChange,onNewProject,onOpenProject,onSaveProject,children}:{screen:ScreenId;onScreenChange:(screen:ScreenId)=>void;children:ReactNode}&WorkspaceActions){
  const project=useProjectInfo()
  const [expanded,setExpanded]=useState<Record<string,boolean>>({PROJE:true,SAHA:true,ANALİZ:true,TASARIM:true,RAPOR:true})
  const go=(id:ScreenId)=>onScreenChange(id)
  const groups=[{name:'PROJE',items:['dashboard','project-info'] as ScreenId[]},{name:'SAHA',items:['field','profile'] as ScreenId[]},{name:'ANALİZ',items:['earthquake','bearing-capacity','settlement','liquefaction'] as ScreenId[]},{name:'TASARIM',items:['foundation','jet-grout'] as ScreenId[]},{name:'RAPOR',items:['report'] as ScreenId[]}]
  const changeUnits=(unit:'kN-m'|'ton-m'|'kPa-m')=>updateProjectInfo({...project,unitSystem:unit})
  return <div className="app-shell">
    <div className="title-bar">
      <div className="app-title"><div className="app-mark">Z</div><b>ZeminLab</b><span className="title-separator">|</span><span className="project-name">{project.title||'Yeni Proje'}</span></div>
      <div className="window-controls"><button aria-label="Küçült" onClick={()=>void window.api.window.minimize()}>_</button><button aria-label="Büyüt" onClick={()=>void window.api.window.maximizeToggle()}>□</button><button className="close" aria-label="Kapat" onClick={()=>void window.api.window.close()}>×</button></div>
    </div>
    <div className="menu-bar">
      <button onClick={onNewProject}>Dosya</button><button onClick={()=>go('project-info')}>Düzen</button><button onClick={()=>go('dashboard')}>Görünüm</button><button onClick={()=>go('profile')}>Tanımlar</button><button onClick={()=>go('bearing-capacity')}>Analiz</button><button onClick={()=>go('foundation')}>Tasarım</button><button onClick={()=>go('report')}>Rapor</button><button onClick={()=>go('dashboard')}>Yardım</button>
    </div>
    <div className="toolbar">
      <div className="toolbar-section"><button className="tool-button" onClick={onNewProject}><span>＋</span><b>Yeni</b></button><button className="tool-button" onClick={onOpenProject}><span>▣</span><b>Aç</b></button><button className="tool-button" onClick={onSaveProject}><span>▤</span><b>Kaydet</b></button></div>
      <div className="toolbar-divider"/>
      <div className="toolbar-section"><button className="tool-button" onClick={()=>go('field')}><span>⌕</span><b>Sondaj</b></button><button className="tool-button" onClick={()=>go('field')}><span>N</span><b>SPT</b></button><button className="tool-button" onClick={()=>go('field')}><span>▥</span><b>Laboratuvar</b></button></div>
      <div className="toolbar-divider"/>
      <div className="toolbar-section"><button className="tool-button emphasis" onClick={()=>go('bearing-capacity')}><span>∑</span><b>Analiz</b></button><button className="tool-button emphasis" onClick={()=>go('foundation')}><span>⌂</span><b>Temel</b></button><button className="tool-button emphasis" onClick={()=>go('jet-grout')}><span>◉</span><b>Jet Grout</b></button><button className="tool-button emphasis" onClick={()=>go('report')}><span>▤</span><b>Rapor</b></button></div>
      <div className="toolbar-spacer"/><span className="units-label">Birim</span><select className="units-select" value={project.unitSystem} onChange={e=>changeUnits(e.target.value as 'kN-m'|'ton-m'|'kPa-m')}><option value="kN-m">kN-m</option><option value="ton-m">ton-m</option><option value="kPa-m">kPa-m</option></select>
    </div>
    <div className="main-layout">
      <aside className="panel"><div className="panel-header"><span>MODEL EXPLORER</span><span>◫</span></div><div className="project-header"><b>▾</b><span>{project.projectNo||'YENİ PROJE'}</span></div><div className="tree">{groups.map(group=><div key={group.name}><div className="tree-row clickable" onClick={()=>setExpanded(s=>({...s,[group.name]:!s[group.name]}))}><span className={`tree-arrow ${expanded[group.name]?'expanded':''}`}>▶</span><span className="tree-icon">▣</span><b>{group.name}</b></div>{expanded[group.name]&&<div className="tree-children">{group.items.map(id=><div key={id} className={`tree-row clickable ${screen===id?'active':''}`} onClick={()=>go(id)}><span className="tree-arrow"/><span className="tree-icon">•</span><span>{SCREEN_META[id].title}</span></div>)}</div>}</div>)}</div></aside>
      <main className="workspace"><div className="workspace-tabs"><button className="workspace-tab selected">{SCREEN_META[screen].title}</button><div className="tab-spacer"/></div><div className="workspace-content">{children}</div></main>
      <aside className="panel"><div className="panel-header"><span>PROPERTIES</span><span>×</span></div><div className="form-section"><div className="section-title">AKTİF PROJE</div><div className="form-grid" style={{gridTemplateColumns:'1fr'}}><Field label="Proje" type="text" value={project.title} onChange={v=>updateProjectInfo({...project,title:v})}/><Field label="Proje No" type="text" value={project.projectNo} onChange={v=>updateProjectInfo({...project,projectNo:v})}/><Field label="Mühendis" type="text" value={project.engineer} onChange={v=>updateProjectInfo({...project,engineer:v})}/></div></div></aside>
    </div>
    <div className="status-bar"><span>{SCREEN_META[screen].group} / {SCREEN_META[screen].title}</span><span className="status-center">ZeminLab Engineering Workspace</span><span className="status-right"><span><i className="status-indicator"/>Hazır</span><span>{project.unitSystem}</span></span></div>
  </div>
}
