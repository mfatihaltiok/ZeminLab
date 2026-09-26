import { useId, type ReactNode } from 'react'
import type { EngineeringRenderLayer, EngineeringRenderMarker, EngineeringRenderModel } from './engineering-render-model'
import { normalizeEngineeringRenderModel, layerColor } from './engineering-render-model'

export type { EngineeringRenderLayer, EngineeringRenderMarker }

type Props={
  variant:'profile'|'borehole'
  totalDepth:number
  groundwaterDepth?:number
  foundationDepth?:number
  layers:EngineeringRenderLayer[]
  markers?:EngineeringRenderMarker[]
  footer?:ReactNode
}

const fmt=(v:number|undefined,d=2)=>v==null||!Number.isFinite(v)?'—':v.toFixed(d)

const HATCH={
  clay:'repeating-linear-gradient(0deg,transparent 0 10px,rgba(110,76,54,.34) 10px 11px)',
  silt:'radial-gradient(circle at 4px 4px,rgba(82,92,82,.45) 0 1.3px,transparent 1.4px),radial-gradient(circle at 12px 11px,rgba(82,92,82,.35) 0 1px,transparent 1.1px)',
  sand:'radial-gradient(circle at 4px 5px,rgba(132,101,45,.48) 0 1.3px,transparent 1.4px),radial-gradient(circle at 12px 12px,rgba(132,101,45,.38) 0 .9px,transparent 1px)',
  gravel:'radial-gradient(circle at 6px 7px,transparent 0 3px,rgba(86,94,100,.50) 3px 4px,transparent 4.2px)',
  rock:'repeating-linear-gradient(130deg,transparent 0 17px,rgba(73,79,84,.34) 17px 18px)',
  fill:'repeating-linear-gradient(135deg,transparent 0 12px,rgba(104,112,118,.24) 12px 13px)'
} as const

function soilCss(code:string|undefined,colorClass:EngineeringRenderLayer['colorClass']|undefined){
  return layerColor(code,colorClass)
}

function Legend(){return <div className="section-render-legend"><span><i className="legend-swatch" style={{background:'#d8b89f'}}/>Kil</span><span><i className="legend-swatch" style={{background:'#e7d19a'}}/>Kum</span><span><i className="legend-swatch" style={{background:'#d2d8d0'}}/>Silt</span><span><i className="legend-line gw"/>YASS</span><span><i className="legend-marker spt"/>SPT</span><span><i className="legend-marker lab"/>LAB</span></div>}

function depthTicks(total:number){
  const step=total<=12?1:total<=25?2:5
  const values:number[]=[]
  for(let d=0;d<=total+1e-9;d+=step)values.push(Number(d.toFixed(3)))
  if(values.at(-1)!<total-1e-9)values.push(total)
  return values
}

function markerColor(kind:EngineeringRenderMarker['kind']){
  return kind==='spt'?'#3d6a88':kind==='lab'?'#587660':'#8c6d38'
}

function buildModel(props:Props):EngineeringRenderModel{
  return normalizeEngineeringRenderModel({
    variant:props.variant,
    totalDepth:props.totalDepth,
    groundwaterDepth:props.groundwaterDepth,
    foundationDepth:props.foundationDepth,
    layers:props.layers,
    markers:props.markers??[]
  })
}

export function EngineeringSectionRenderer(props:Props){
  const uid=useId().replace(/:/g,'')
  const model=buildModel(props)
  const ticks=depthTicks(model.totalDepth)
  const width=1180
  const plotHeight=Math.max(540,Math.min(760,model.totalDepth*24))
  const top=92
  const bottom=top+plotHeight
  const depthY=(d:number)=>top+(d/model.totalDepth)*plotHeight
  const soilX=150
  const soilW=model.variant==='borehole'?315:355
  const classX=soilX+soilW
  const classW=88
  const dataX=classX+classW
  const dataW=width-dataX-34

  return <div className="engineering-render-shell">
    <div className="engineering-render-scroll">
      <svg className="engineering-render-canvas" viewBox={`0 0 ${width} ${bottom+92}`} role="img" aria-label={model.variant==='profile'?'İdealize zemin profili teknik kesiti':'Sondaj logu teknik kesiti'}>
        <defs>
          {Object.entries(HATCH).map(([kind,value])=><pattern key={kind} id={`${uid}-${kind}`} width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="url(#${uid}-base-${kind})"/></pattern>)}
          <linearGradient id={`${uid}-header`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#eef1f3"/><stop offset="1" stopColor="#dde2e5"/></linearGradient>
          {(['clay','silt','sand','gravel','rock','fill'] as const).map((kind)=><pattern key={`${kind}-base`} id={`${uid}-base-${kind}`} width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill={kind==='clay'?'#d8b89f':kind==='silt'?'#d2d8d0':kind==='sand'?'#e7d19a':kind==='gravel'?'#c7cdd1':kind==='rock'?'#bcc1c4':'#d9dde0'}/></pattern>)}
          {(['clay','silt','sand','gravel','rock','fill'] as const).map(kind=>
            <pattern key={`h-${kind}`} id={`${uid}-h-${kind}`} width="18" height="18" patternUnits="userSpaceOnUse">
              <rect width="18" height="18" fill={kind==='clay'?'#d8b89f':kind==='silt'?'#d2d8d0':kind==='sand'?'#e7d19a':kind==='gravel'?'#c7cdd1':kind==='rock'?'#bcc1c4':'#d9dde0'}/>
              <foreignObject x="0" y="0" width="18" height="18"><div xmlns="http://www.w3.org/1999/xhtml" style={{width:'18px',height:'18px',background:HATCH[kind]}} /></foreignObject>
            </pattern>
          )}
        </defs>

        <rect x="0" y="0" width={width} height={bottom+92} fill="#f7f9fa"/>
        <rect x="0" y="0" width={width} height="50" fill={`url(#${uid}-header)`} stroke="#aab4ba"/>
        <text x="18" y="20" fontFamily="Arial" fontSize="15" fontWeight="700" fill="#263640">FALUZMN</text>
        <text x="105" y="20" fontFamily="Arial" fontSize="14" fontWeight="700" fill="#334650">{model.variant==='profile'?'İDEALİZE ZEMİN PROFİLİ':'SONDAJ LOGU'}</text>
        <text x="105" y="37" fontFamily="Arial" fontSize="8.5" fill="#68767f">{model.variant==='profile'?'Katman bazlı mühendislik tasarım modeli':'Saha kayıtları, litoloji, SPT, laboratuvar ve gözlem referansları'}</text>
        <text x="1040" y="19" fontFamily="Arial" fontSize="8.5" fontWeight="700" fill="#596973">TEKNİK KESİT</text>
        <text x="1040" y="35" fontFamily="Consolas,monospace" fontSize="8" fill="#6a777f">0.00 → {fmt(model.totalDepth)} m</text>

        <text x="58" y="73" fontFamily="Arial" fontSize="9" fontWeight="700" fill="#53616a">DERİNLİK</text>
        <text x={soilX+8} y="73" fontFamily="Arial" fontSize="9" fontWeight="700" fill="#53616a">{model.variant==='profile'?'MÜHENDİSLİK KATMANI':'LİTOLOJİ'}</text>
        <text x={classX+10} y="73" fontFamily="Arial" fontSize="9" fontWeight="700" fill="#53616a">SINIF</text>
        <text x={dataX+10} y="73" fontFamily="Arial" fontSize="9" fontWeight="700" fill="#53616a">{model.variant==='profile'?'TASARIM PARAMETRELERİ':'SPT / LAB / SAHA'}</text>

        <rect x={soilX} y={top} width={soilW+classW+dataW} height={plotHeight} fill="#fff" stroke="#707c84" strokeWidth="1.2"/>
        {ticks.map(t=><g key={t}><line x1="42" y1={depthY(t)} x2={dataX+dataW} y2={depthY(t)} stroke={t%5===0?'#c3cbd0':'#e5e8ea'} strokeWidth={t%5===0?1.2:.65}/><text x="55" y={depthY(t)+3.5} fontFamily="Consolas,monospace" fontSize="8" fill="#66737b">{t.toFixed(2)}</text></g>)}
        <line x1={soilX} y1={top} x2={soilX} y2={bottom} stroke="#6f7a82" />
        <line x1={classX} y1={top} x2={classX} y2={bottom} stroke="#adb5ba" />
        <line x1={dataX} y1={top} x2={dataX} y2={bottom} stroke="#adb5ba" />

        {model.layers.map((layer,index)=>{
          const y0=depthY(layer.topDepth)
          const y1=depthY(layer.bottomDepth)
          const h=Math.max(4,y1-y0)
          const fill=soilCss(layer.code,layer.colorClass)
          const hatchId=`${uid}-h-${layer.colorClass??'fill'}`
          const mid=(y0+y1)/2
          return <g key={layer.id}>
            <rect x={soilX} y={y0} width={soilW} height={h} fill={fill} stroke="#737e85" strokeWidth=".8"/>
            <rect x={soilX} y={y0} width={soilW} height={h} fill={`url(#${hatchId})`} opacity=".7"/>
            {h>34?<><rect x={soilX+7} y={y0+6} width="22" height="18" rx="2" fill="#f6f7f7" stroke="#8c979e"/><text x={soilX+18} y={y0+19} textAnchor="middle" fontFamily="Arial" fontSize="8" fontWeight="700" fill="#34424a">{index+1}</text><text x={soilX+38} y={y0+14} fontFamily="Arial" fontSize="10.5" fontWeight="700" fill="#2c3b44">{layer.code||'—'}</text><text x={soilX+38} y={y0+28} fontFamily="Arial" fontSize="8.2" fill="#516068">{layer.description||'Zemin tanımı'}</text></>:<text x={soilX+9} y={mid+3} fontFamily="Arial" fontSize="7.5" fontWeight="700" fill="#39474e">{index+1}</text>}
            <text x={classX+11} y={mid+3} fontFamily="Arial" fontSize="9.5" fontWeight="700" fill="#33424b">{layer.code||'—'}</text>
            <text x={dataX+12} y={mid-11} fontFamily="Arial" fontSize="8.3" fontWeight="700" fill="#45545c">{model.variant==='profile'?'γ '+fmt(layer.gamma,1):layer.description||'—'}</text>
            {model.variant==='profile'?<><text x={dataX+86} y={mid-11} fontFamily="Arial" fontSize="8.3" fill="#45545c">c {fmt(layer.cohesion,1)} · φ {fmt(layer.frictionAngle,1)}°</text><text x={dataX+12} y={mid+5} fontFamily="Arial" fontSize="8.3" fill="#45545c">SPT {layer.sptN60!=null?'N₁,₆₀ '+fmt(layer.sptN60,1):layer.sptN!=null?'N '+fmt(layer.sptN,0):'—'}</text><text x={dataX+170} y={mid+5} fontFamily="Arial" fontSize="8.3" fill="#45545c">LAB {layer.labId??'—'}</text></>:<text x={dataX+12} y={mid+5} fontFamily="Arial" fontSize="8.3" fill="#45545c">SPT {layer.sptN60!=null?'N₁,₆₀ '+fmt(layer.sptN60,1):layer.sptN!=null?'N '+fmt(layer.sptN,0):'—'}</text>}
          </g>
        })}

        {model.variant==='borehole'&&<g>
          <rect x={dataX+10} y={top+8} width="245" height={plotHeight-16} fill="none" stroke="#d6dbde"/>
          <line x1={dataX+70} y1={top+8} x2={dataX+70} y2={bottom-8} stroke="#e0e4e6"/>
          <line x1={dataX+168} y1={top+8} x2={dataX+168} y2={bottom-8} stroke="#e0e4e6"/>
          <text x={dataX+20} y={top+22} fontFamily="Arial" fontSize="8" fontWeight="700" fill="#596971">SPT N</text>
          <text x={dataX+88} y={top+22} fontFamily="Arial" fontSize="8" fontWeight="700" fill="#596971">LAB</text>
          <text x={dataX+179} y={top+22} fontFamily="Arial" fontSize="8" fontWeight="700" fill="#596971">SAHA NOTU</text>
          {model.layers.map((layer,index)=>{
            const mid=depthY((layer.topDepth+layer.bottomDepth)/2)
            const n=layer.sptN??layer.sptN60
            const bw=n==null?0:Math.min(58,Math.max(2,n/Math.max(10,...model.layers.map(x=>x.sptN??x.sptN60??0))*58))
            const lab=model.markers.find(m=>m.kind==='lab'&&Math.abs(m.depth-(layer.topDepth+layer.bottomDepth)/2)<Math.max(.25,(layer.bottomDepth-layer.topDepth)/2))
            const note=model.markers.find(m=>m.kind==='note'&&Math.abs(m.depth-(layer.topDepth+layer.bottomDepth)/2)<Math.max(.25,(layer.bottomDepth-layer.topDepth)/2))
            return <g key={`data-${layer.id}`}><rect x={dataX+20} y={mid-5} width="58" height="10" fill="#eef1f3" stroke="#c4cdd2"/><rect x={dataX+20} y={mid-5} width={bw} height="10" fill="#52758e"/>{n!=null&&<text x={dataX+82} y={mid+3} fontFamily="Consolas,monospace" fontSize="7.8" fill="#41535d">{n.toFixed(1)}</text>}<text x={dataX+88} y={mid+3} fontFamily="Arial" fontSize="7.5" fill="#52626b">{lab?.label??'—'}</text><text x={dataX+179} y={mid+3} fontFamily="Arial" fontSize="7.5" fill="#52626b">{note?.detail??'—'}</text></g>
          })}
        </g>}

        {model.markers.map((marker,index)=>{
          const yy=depthY(marker.depth)
          const c=markerColor(marker.kind)
          return <g key={`marker-${index}`}><circle cx={dataX+350} cy={yy} r="4.5" fill="#fff" stroke={c} strokeWidth="1.5"/><text x={dataX+362} y={yy-4} fontFamily="Arial" fontSize="7.5" fontWeight="700" fill={c}>{marker.label}</text>{marker.detail&&<text x={dataX+362} y={yy+7} fontFamily="Arial" fontSize="7" fill="#66737b">{marker.detail}</text>}</g>
        })}

        {model.groundwaterDepth!=null&&<g><line x1="42" y1={depthY(model.groundwaterDepth)} x2={dataX+dataW} y2={depthY(model.groundwaterDepth)} stroke="#2f7498" strokeWidth="2"/><rect x={dataX+dataW-140} y={depthY(model.groundwaterDepth)-18} width="128" height="16" fill="#f4fafc" stroke="#cfe0e7"/><text x={dataX+dataW-133} y={depthY(model.groundwaterDepth)-6} fontFamily="Arial" fontSize="8" fontWeight="700" fill="#2f6987">YASS {fmt(model.groundwaterDepth)} m</text></g>}
        {model.foundationDepth!=null&&model.foundationDepth>0&&<g><line x1={soilX} y1={depthY(model.foundationDepth)} x2={soilX+soilW} y2={depthY(model.foundationDepth)} stroke="#8c5039" strokeWidth="2"/><text x={soilX+8} y={depthY(model.foundationDepth)-6} fontFamily="Arial" fontSize="8" fontWeight="700" fill="#874b36">TEMEL TABANI · Df={fmt(model.foundationDepth)} m</text></g>}
      </svg>
    </div>
    <div className="section-render-meta"><Legend/>{props.footer}</div>
  </div>
}
