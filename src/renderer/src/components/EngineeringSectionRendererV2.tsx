import type { ReactNode } from 'react'
import { layerColor, normalizeEngineeringRenderModel, type EngineeringRenderLayer, type EngineeringRenderMarker } from './engineering-render-model'

export type { EngineeringRenderLayer, EngineeringRenderMarker }

type Props = {
  variant: 'profile' | 'borehole'
  totalDepth: number
  groundwaterDepth?: number
  foundationDepth?: number
  layers: EngineeringRenderLayer[]
  markers?: EngineeringRenderMarker[]
  footer?: ReactNode
}

const fmt = (v: number | undefined, d = 2) => v == null || !Number.isFinite(v) ? '—' : v.toFixed(d)

function patternFor(code: string | undefined, colorClass: EngineeringRenderLayer['colorClass']) {
  const c = (code ?? '').toLowerCase()
  if (colorClass === 'clay' || c.includes('cl') || c.includes('ci') || c.includes('ch')) return 'render-clay'
  if (colorClass === 'silt' || c.includes('si') || c.includes('ml') || c.includes('mh')) return 'render-silt'
  if (colorClass === 'sand' || c.includes('sa')) return 'render-sand'
  if (colorClass === 'gravel' || c.includes('gr') || c.includes('bo')) return 'render-gravel'
  if (colorClass === 'rock' || c.includes('rk') || c.includes('kaya')) return 'render-rock'
  return 'render-fill'
}

export function EngineeringSectionRenderer(props: Props) {
  const model = normalizeEngineeringRenderModel({
    variant: props.variant,
    totalDepth: props.totalDepth,
    groundwaterDepth: props.groundwaterDepth,
    foundationDepth: props.foundationDepth,
    layers: props.layers,
    markers: props.markers ?? []
  })
  const top = 74
  const depthHeight = 620
  const soilX = model.variant === 'profile' ? 150 : 125
  const soilW = 410
  const depthY = (depth: number) => top + (depth / model.totalDepth) * depthHeight
  const registerTop = top + depthHeight + 42
  const rowH = 34
  const registerH = Math.max(54, model.layers.length * rowH + 42)
  const height = registerTop + registerH + 18
  const sptMax = Math.max(10, ...model.layers.map(x => x.sptN60 ?? x.sptN ?? 0))
  const markers = model.markers.length ? model.markers : model.layers.flatMap(layer => {
    const depth = (layer.topDepth + layer.bottomDepth) / 2
    if (layer.sptN60 != null) return [{ depth, label: 'SPT', detail: 'N₁,₆₀=' + fmt(layer.sptN60, 1), kind: 'spt' as const }]
    if (layer.sptN != null) return [{ depth, label: 'SPT', detail: 'N=' + fmt(layer.sptN, 0), kind: 'spt' as const }]
    return []
  })
  const ticks = Array.from({ length: Math.floor(model.totalDepth) + 1 }, (_, i) => i).filter(i => i <= model.totalDepth)

  return <div className="engineering-render-shell">
    <div className="engineering-render-scroll">
      <svg className="engineering-render-svg" viewBox={'0 0 1180 ' + height} preserveAspectRatio="xMinYMin meet" role="img" aria-label={model.variant === 'profile' ? 'İdealize zemin profili' : 'Sondaj logu'}>
        <defs>
          <pattern id="render-clay" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#d8bca5"/><path d="M0 5h18M0 13h18" stroke="#9d765d" strokeWidth="1"/></pattern>
          <pattern id="render-silt" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#cfd7ce"/><circle cx="4" cy="4" r="1.2" fill="#778176"/><circle cx="12" cy="11" r="1.2" fill="#778176"/></pattern>
          <pattern id="render-sand" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#e5d19c"/><circle cx="4" cy="5" r="1.1" fill="#a18143"/><circle cx="12" cy="12" r="1.1" fill="#a18143"/></pattern>
          <pattern id="render-gravel" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#c7cdd0"/><circle cx="5" cy="6" r="2" fill="#737c81"/><circle cx="15" cy="14" r="2" fill="#737c81"/></pattern>
          <pattern id="render-rock" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#b9bec1"/><path d="M2 18L9 5l9 9" fill="none" stroke="#626a6f" strokeWidth="1.3"/></pattern>
          <pattern id="render-fill" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#d9dde0"/><path d="M0 16L16 0" stroke="#9da5aa"/></pattern>
        </defs>

        <rect width="1180" height={height} fill="#f7f9fa"/>
        <rect x="0" y="0" width="1180" height="44" fill="#e5e9ec" stroke="#aab3ba"/>
        <text x="18" y="27" fontSize="11" fontWeight="700" fill="#39464f">FALUZMN · {model.variant === 'profile' ? 'İDEALİZE ZEMİN PROFİLİ' : 'SONDAJ LOGU'}</text>
        <text x="850" y="27" fontSize="10" fill="#5f6b73">Teknik vektörel kesit · veri kaynaklı</text>

        <text x="34" y="66" fontSize="10" fontWeight="700" fill="#53616a">DERİNLİK</text>
        <text x={soilX + 8} y="66" fontSize="10" fontWeight="700" fill="#53616a">ZEMİN KESİTİ</text>
        <text x="610" y="66" fontSize="10" fontWeight="700" fill="#53616a">SPT / SAHA GÖZLEMİ</text>

        <line x1="58" y1={top} x2="58" y2={top + depthHeight} stroke="#9ca6ad"/>
        {ticks.map(i => {
          const yy = depthY(i)
          return <g key={'tick-' + i}>
            <line x1="48" y1={yy} x2="1120" y2={yy} stroke={i % 5 === 0 ? '#c5ccd1' : '#e5e8ea'} strokeWidth={i % 5 === 0 ? 1.2 : .7}/>
            <line x1="52" y1={yy} x2="58" y2={yy} stroke="#69757d"/>
            <text x="43" y={yy + 4} textAnchor="end" fontSize="9.5" fill="#5c6870">{i}</text>
          </g>
        })}

        <rect x={soilX} y={top} width={soilW} height={depthHeight} fill="#fff" stroke="#68757d" strokeWidth="1.4"/>
        {model.layers.map((layer, index) => {
          const y0 = depthY(layer.topDepth)
          const y1 = depthY(layer.bottomDepth)
          const h = Math.max(1, y1 - y0)
          return <g key={layer.id}>
            <rect x={soilX} y={y0} width={soilW} height={h} fill={'url(#' + patternFor(layer.code, layer.colorClass) + ')'} stroke="#707a81"/>
            <circle cx={soilX + 18} cy={y0 + 15} r="9" fill="#fff" stroke="#65727a"/>
            <text x={soilX + 18} y={y0 + 18} textAnchor="middle" fontSize="8" fontWeight="700" fill="#35434b">{index + 1}</text>
            {h >= 36 && <>
              <text x={soilX + 34} y={y0 + 16} fontSize="10.5" fontWeight="700" fill="#27333a">{layer.code || 'ZEMİN'}</text>
              <text x={soilX + 34} y={y0 + 30} fontSize="8.5" fill="#4f5c64">{layer.description || ''}</text>
            </>}
          </g>
        })}

        {model.layers.map(layer => {
          const yy = depthY((layer.topDepth + layer.bottomDepth) / 2)
          const nValue = layer.sptN60 ?? layer.sptN
          if (nValue == null) return null
          const bar = Math.max(2, Math.min(170, 170 * nValue / sptMax))
          return <g key={'spt-' + layer.id}>
            <rect x="610" y={yy - 8} width="170" height="16" rx="2" fill="#eef1f3" stroke="#bac2c7"/>
            <rect x="610" y={yy - 8} width={bar} height="16" rx="2" fill="#55738b"/>
            <text x="792" y={yy + 4} fontSize="9.5" fill="#42515b">{layer.sptN60 != null ? 'N₁,₆₀=' + fmt(layer.sptN60, 1) : 'N=' + fmt(layer.sptN, 0)}</text>
          </g>
        })}

        {markers.map((marker, i) => {
          const yy = depthY(marker.depth)
          const stroke = marker.kind === 'spt' ? '#416a87' : marker.kind === 'lab' ? '#647d67' : '#8a6b35'
          return <g key={'marker-' + i}>
            <circle cx="835" cy={yy} r="5" fill="#fff" stroke={stroke} strokeWidth="1.5"/>
            <text x="848" y={yy - 2} fontSize="8.5" fontWeight="700" fill={stroke}>{marker.label}</text>
            {marker.detail && <text x="848" y={yy + 10} fontSize="8" fill="#5e6970">{marker.detail}</text>}
          </g>
        })}

        {model.groundwaterDepth != null && <g>
          <line x1="48" y1={depthY(model.groundwaterDepth)} x2="1120" y2={depthY(model.groundwaterDepth)} stroke="#2f78a3" strokeWidth="2.4" strokeDasharray="9 5"/>
          <rect x="1000" y={depthY(model.groundwaterDepth) - 18} width="116" height="18" fill="#f7fbfd"/>
          <text x="1110" y={depthY(model.groundwaterDepth) - 6} textAnchor="end" fontSize="9" fontWeight="700" fill="#2f678b">YASS {fmt(model.groundwaterDepth)} m</text>
        </g>}

        {model.foundationDepth != null && model.foundationDepth > 0 && <g>
          <line x1={soilX} y1={depthY(model.foundationDepth)} x2={soilX + soilW} y2={depthY(model.foundationDepth)} stroke="#8b4f38" strokeWidth="2"/>
          <text x={soilX + 8} y={depthY(model.foundationDepth) - 6} fontSize="9" fontWeight="700" fill="#8b4f38">TEMEL TABANI · Df={fmt(model.foundationDepth)} m</text>
        </g>}

        <text x={soilX} y={top + depthHeight + 26} fontSize="8.5" fill="#68747b">0.00 → {fmt(model.totalDepth)} m · {model.layers.length} mühendislik katmanı</text>

        <rect x="48" y={registerTop} width="1070" height={registerH} fill="#fff" stroke="#aeb7bd"/>
        <rect x="48" y={registerTop} width="1070" height="28" fill="#e8ecee"/>
        <text x="60" y={registerTop + 19} fontSize="9" fontWeight="700" fill="#46545d">KATMAN</text>
        <text x="170" y={registerTop + 19} fontSize="9" fontWeight="700" fill="#46545d">DERİNLİK</text>
        <text x="300" y={registerTop + 19} fontSize="9" fontWeight="700" fill="#46545d">ZEMİN</text>
        <text x="610" y={registerTop + 19} fontSize="9" fontWeight="700" fill="#46545d">γ</text>
        <text x="690" y={registerTop + 19} fontSize="9" fontWeight="700" fill="#46545d">c</text>
        <text x="770" y={registerTop + 19} fontSize="9" fontWeight="700" fill="#46545d">φ</text>
        <text x="850" y={registerTop + 19} fontSize="9" fontWeight="700" fill="#46545d">SPT</text>
        <text x="950" y={registerTop + 19} fontSize="9" fontWeight="700" fill="#46545d">LAB</text>

        {model.layers.map((layer, i) => {
          const yy = registerTop + 28 + i * rowH
          return <g key={'row-' + layer.id}>
            <rect x="48" y={yy} width="1070" height={rowH} fill={i % 2 === 0 ? '#fff' : '#f7f9fa'}/>
            <line x1="48" y1={yy + rowH} x2="1118" y2={yy + rowH} stroke="#e1e5e7"/>
            <text x="60" y={yy + 21} fontSize="9" fontWeight="700" fill="#3f4c54">{i + 1}</text>
            <text x="170" y={yy + 21} fontSize="9" fill="#53616a">{fmt(layer.topDepth)}–{fmt(layer.bottomDepth)} m</text>
            <text x="300" y={yy + 21} fontSize="9" fill="#34424b">{layer.code || '—'} · {layer.description || ''}</text>
            <text x="610" y={yy + 21} fontSize="9" fill="#53616a">{fmt(layer.gamma, 1)}</text>
            <text x="690" y={yy + 21} fontSize="9" fill="#53616a">{fmt(layer.cohesion, 1)}</text>
            <text x="770" y={yy + 21} fontSize="9" fill="#53616a">{fmt(layer.frictionAngle, 1)}°</text>
            <text x="850" y={yy + 21} fontSize="9" fill="#53616a">{layer.sptN60 != null ? 'N₁,₆₀ ' + fmt(layer.sptN60, 1) : layer.sptN != null ? 'N ' + fmt(layer.sptN, 0) : '—'}</text>
            <text x="950" y={yy + 21} fontSize="9" fill="#53616a">{layer.labId || '—'}</text>
          </g>
        })}
      </svg>
    </div>
    {props.footer && <div className="engineering-render-footer">{props.footer}</div>}
  </div>
}
