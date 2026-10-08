import { useId, useMemo } from 'react'
import '../assets/technical-section.css'

export interface TechnicalSectionLayer {
  topDepth: number
  bottomDepth: number
  code: string
  name: string
  colorClass: 'clay' | 'sand' | 'silt' | 'gravel' | 'fill' | 'rock'
  gamma?: number
  gammaSat?: number
  cohesion?: number
  frictionAngle?: number
  sptN?: number
  description?: string
}

export interface TechnicalSectionMarker {
  depth: number
  kind: 'spt' | 'lab' | 'water' | 'foundation'
  label?: string
  value?: string
}

export interface TechnicalSectionProps {
  variant: 'borehole' | 'profile' | 'foundation' | 'jetgrout'
  title: string
  subtitle?: string
  totalDepth: number
  width?: number
  layers: TechnicalSectionLayer[]
  markers?: TechnicalSectionMarker[]
  groundwaterDepth?: number
  foundationDepth?: number
  footingWidth?: number
  footingLength?: number
  showDimensions?: boolean
  scale?: number
}

const layerColors: Record<string, { fill: string; stroke: string }> = {
  clay: { fill: '#c8a882', stroke: '#9a7a5a' },
  sand: { fill: '#e8d088', stroke: '#b8a058' },
  silt: { fill: '#c0ccc0', stroke: '#90a090' },
  gravel: { fill: '#b8c0b8', stroke: '#889088' },
  fill: { fill: '#d0c8b8', stroke: '#a09888' },
  rock: { fill: '#a8b0a8', stroke: '#788078' }
}

const soilPatterns: Record<string, string> = {
  clay: 'M0,6 L12,6 M4,0 L4,12 M8,0 L8,12',
  sand: 'M2,3 a1.5,1.5 0 1,0 3,0 M7,8 a1,1 0 1,0 2,0 M4,10 a0.8,0.8 0 1,0 1.6,0',
  silt: 'M2,4 a0.8,0.8 0 1,0 1.6,0 M6,8 a0.6,0.6 0 1,0 1.2,0 M10,3 a0.7,0.7 0 1,0 1.4,0',
  gravel: 'M3,5 a3,3 0 1,0 6,0 M8,10 a2.5,2.5 0 1,0 5,0',
  rock: 'M0,10 L8,2 M6,12 L14,4',
  fill: 'M0,0 L12,12 M12,0 L0,12'
}

function fmt(v: number | undefined, d = 1): string {
  return v == null || !Number.isFinite(v) ? '—' : v.toFixed(d)
}

export function TechnicalSection(props: TechnicalSectionProps) {
  const uid = useId().replace(/:/g, '')
  const {
    variant, title, subtitle, totalDepth,
    width = 800,
    layers, markers = [],
    groundwaterDepth, foundationDepth,
    footingWidth, footingLength,
    showDimensions = true,
    scale = 1
  } = props

  const sortedLayers = [...layers].sort((a, b) => a.topDepth - b.topDepth)
  
  // Layout constants
  const marginLeft = 80
  const marginRight = 220
  const marginTop = 70
  const marginBottom = 50
  const columnWidth = variant === 'foundation' ? 280 : variant === 'jetgrout' ? 340 : 180
  const plotHeight = Math.max(400, totalDepth * 20 * scale)
  const svgWidth = marginLeft + columnWidth + marginRight
  const svgHeight = marginTop + plotHeight + marginBottom

  const depthY = (d: number) => marginTop + (d / totalDepth) * plotHeight
  const soilX = marginLeft
  const dataX = soilX + columnWidth + 10

  const patterns = useMemo(() => {
    return Object.entries(soilPatterns).map(([key, path]) => ({
      key,
      id: `${uid}-pat-${key}`,
      path
    }))
  }, [uid])

  return (
    <div className="ts-container">
      <svg 
        className="ts-svg" 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
        width={svgWidth} 
        height={svgHeight}
      >
        <defs>
          {/* Zemin dokuları */}
          {patterns.map(p => (
            <pattern key={p.key} id={p.id} width="14" height="14" patternUnits="userSpaceOnUse">
              <path d={p.path} stroke="#00000020" strokeWidth="0.5" fill="none" />
            </pattern>
          ))}
          
          {/* YASS çizgisi */}
          <pattern id={`${uid}-water`} width="20" height="6" patternUnits="userSpaceOnUse">
            <path d="M0,3 Q5,0 10,3 Q15,6 20,3" stroke="#2196F3" strokeWidth="0.8" fill="none" />
          </pattern>
          
          {/* Gölge */}
          <filter id={`${uid}-shadow`}>
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Arka plan */}
        <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#fafbfc" />
        
        {/* Başlık */}
        <rect x="0" y="0" width={svgWidth} height="54" fill="#1a4971" />
        <text x="16" y="22" fontSize="11" fill="#ffffff90" fontFamily="Arial" fontWeight="600" letterSpacing="2">
          FALUZMN · TEKNİK KESİT
        </text>
        <text x="16" y="42" fontSize="16" fill="#fff" fontFamily="Arial" fontWeight="700">
          {title}
        </text>
        {subtitle && (
          <text x={svgWidth - 16} y="42" fontSize="10" fill="#ffffffb0" fontFamily="Arial" textAnchor="end">
            {subtitle}
          </text>
        )}

        {/* Derinlik ölçeği */}
        <g className="ts-depth-scale">
          <rect x={marginLeft - 30} y={marginTop} width="30" height={plotHeight} fill="#f0f2f4" stroke="#c0c8d0" />
          {Array.from({ length: Math.floor(totalDepth) + 1 }, (_, i) => {
            const d = i
            if (d > totalDepth) return null
            const y = depthY(d)
            return (
              <g key={d}>
                <line x1={marginLeft - 10} y1={y} x2={marginLeft} y2={y} stroke="#4a5560" strokeWidth="1" />
                <text x={marginLeft - 14} y={y + 4} fontSize="9" fill="#4a5560" textAnchor="end" fontFamily="Consolas">
                  {d}
                </text>
              </g>
            )
          })}
          <text x={marginLeft - 14} y={marginTop - 8} fontSize="8" fill="#6a7580" textAnchor="end" fontFamily="Arial">
            m
          </text>
        </g>

        {/* Zemin kolonu */}
        <g className="ts-soil-column">
          <rect x={soilX} y={marginTop} width={columnWidth} height={plotHeight} fill="#fff" stroke="#888" strokeWidth="1.5" />
          
          {sortedLayers.map((layer, i) => {
            const top = Math.max(layer.topDepth, 0)
            const bottom = Math.min(layer.bottomDepth, totalDepth)
            if (bottom <= top) return null
            
            const y1 = depthY(top)
            const y2 = depthY(bottom)
            const h = y2 - y1
            const colors = layerColors[layer.colorClass] || layerColors.sand
            const patternId = `${uid}-pat-${layer.colorClass}`
            
            return (
              <g key={i} className="ts-layer">
                {/* Dolgu rengi */}
                <rect x={soilX} y={y1} width={columnWidth} height={h} fill={colors.fill} />
                {/* Doku */}
                <rect x={soilX} y={y1} width={columnWidth} height={h} fill={`url(#${patternId})`} opacity="0.4" />
                {/* Sınır çizgisi */}
                <line x1={soilX} y1={y2} x2={soilX + columnWidth} y2={y2} stroke={colors.stroke} strokeWidth="1.5" />
                
                {/* Katman etiketi */}
                <text x={soilX + columnWidth / 2} y={y1 + h / 2 + 4} fontSize="11" fill="#1a2332" 
                      textAnchor="middle" fontFamily="Arial" fontWeight="600">
                  {layer.code}
                </text>
                {h > 30 && (
                  <text x={soilX + columnWidth / 2} y={y1 + h / 2 + 18} fontSize="8" fill="#4a556080" 
                        textAnchor="middle" fontFamily="Arial">
                    {layer.name}
                  </text>
                )}
              </g>
            )
          })}
          
          {/* YASS çizgisi */}
          {groundwaterDepth != null && groundwaterDepth <= totalDepth && (
            <g className="ts-groundwater">
              <rect x={soilX - 2} y={depthY(groundwaterDepth) - 3} width={columnWidth + 4} height="6" fill={`url(#${uid}-water)`} />
              <line x1={soilX} y1={depthY(groundwaterDepth)} x2={soilX + columnWidth} y2={depthY(groundwaterDepth)} 
                    stroke="#2196F3" strokeWidth="1.5" strokeDasharray="6,3" />
              <text x={soilX + columnWidth + 4} y={depthY(groundwaterDepth) + 4} fontSize="8" fill="#2196F3" fontFamily="Arial" fontWeight="600">
                YASS = {groundwaterDepth.toFixed(2)} m
              </text>
            </g>
          )}
          
          {/* Temel kotu */}
          {foundationDepth != null && foundationDepth >= 0 && (
            <g className="ts-foundation-level">
              <line x1={soilX - 5} y1={depthY(foundationDepth)} x2={soilX + columnWidth + 5} y2={depthY(foundationDepth)} 
                    stroke="#e65100" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x={soilX - 8} y={depthY(foundationDepth) + 3} fontSize="8" fill="#e65100" textAnchor="end" fontFamily="Arial" fontWeight="600">
                Df={foundationDepth.toFixed(2)}
              </text>
            </g>
          )}
        </g>

        {/* Marker'lar */}
        <g className="ts-markers">
          {markers.map((marker, i) => {
            const y = depthY(marker.depth)
            if (y < marginTop || y > marginTop + plotHeight) return null
            
            const color = marker.kind === 'spt' ? '#1a4971' : marker.kind === 'lab' ? '#2e7d32' : marker.kind === 'water' ? '#2196F3' : '#e65100'
            const icon = marker.kind === 'spt' ? 'S' : marker.kind === 'lab' ? 'L' : marker.kind === 'water' ? 'W' : 'F'
            
            return (
              <g key={i} className="ts-marker">
                <circle cx={soilX - 12} cy={y} r="8" fill={color} />
                <text x={soilX - 12} y={y + 3.5} fontSize="8" fill="#fff" textAnchor="middle" fontFamily="Arial" fontWeight="700">
                  {icon}
                </text>
                {marker.value && (
                  <text x={dataX + 5} y={y + 4} fontSize="9" fill={color} fontFamily="Consolas" fontWeight="600">
                    {marker.value}
                  </text>
                )}
              </g>
            )
          })}
        </g>

        {/* Veri kolonu (sağ) */}
        <g className="ts-data-column">
          <rect x={dataX} y={marginTop} width={marginRight - 20} height={plotHeight} fill="#f8fafc" stroke="#d0d7de" />
          
          {/* Sütun başlıkları */}
          <rect x={dataX} y={marginTop} width={marginRight - 20} height="20" fill="#e8ecf0" />
          <text x={dataX + 10} y={marginTop + 14} fontSize="8" fill="#4a5560" fontFamily="Arial" fontWeight="700">γ (kN/m³)</text>
          <text x={dataX + 70} y={marginTop + 14} fontSize="8" fill="#4a5560" fontFamily="Arial" fontWeight="700">c' (kPa)</text>
          <text x={dataX + 120} y={marginTop + 14} fontSize="8" fill="#4a5560" fontFamily="Arial" fontWeight="700">φ' (°)</text>
          <text x={dataX + 155} y={marginTop + 14} fontSize="8" fill="#4a5560" fontFamily="Arial" fontWeight="700">N₆₀</text>
          
          {/* Katman verileri */}
          {sortedLayers.map((layer, i) => {
            const top = Math.max(layer.topDepth, 0)
            const bottom = Math.min(layer.bottomDepth, totalDepth)
            if (bottom <= top) return null
            
            const y1 = depthY(top)
            const y2 = depthY(bottom)
            const h = y2 - y1
            const cy = y1 + h / 2
            
            return (
              <g key={i}>
                <line x1={dataX} y1={y2} x2={dataX + marginRight - 20} y2={y2} stroke="#e0e5ea" />
                <text x={dataX + 30} y={cy + 4} fontSize="10" fill="#1a2332" textAnchor="middle" fontFamily="Consolas">
                  {fmt(layer.gamma)}
                </text>
                <text x={dataX + 90} y={cy + 4} fontSize="10" fill="#1a2332" textAnchor="middle" fontFamily="Consolas">
                  {fmt(layer.cohesion)}
                </text>
                <text x={dataX + 135} y={cy + 4} fontSize="10" fill="#1a2332" textAnchor="middle" fontFamily="Consolas">
                  {fmt(layer.frictionAngle)}
                </text>
                <text x={dataX + 165} y={cy + 4} fontSize="10" fill="#1a4971" textAnchor="middle" fontFamily="Consolas" fontWeight="600">
                  {layer.sptN != null ? layer.sptN : '—'}
                </text>
              </g>
            )
          })}
        </g>

        {/* Temel görseli */}
        {variant === 'foundation' && footingWidth != null && foundationDepth != null && (
          <g className="ts-foundation">
            <rect 
              x={soilX + columnWidth / 2 - footingWidth * 30} 
              y={depthY(foundationDepth) - 12} 
              width={footingWidth * 60} 
              height="12" 
              fill="#455a64" 
              stroke="#263238" 
              strokeWidth="1.5"
              filter={`url(#${uid}-shadow)`}
            />
            {/* Ölçü çizgileri */}
            {showDimensions && (
              <g className="ts-dimensions">
                <line x1={soilX + columnWidth / 2 - footingWidth * 30} y1={depthY(foundationDepth) + 15} 
                      x2={soilX + columnWidth / 2 + footingWidth * 30} y2={depthY(foundationDepth) + 15} 
                      stroke="#e65100" strokeWidth="1" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
                <text x={soilX + columnWidth / 2} y={depthY(foundationDepth) + 28} fontSize="10" fill="#e65100" 
                      textAnchor="middle" fontFamily="Arial" fontWeight="600">
                  B = {footingWidth.toFixed(2)} m
                </text>
              </g>
            )}
          </g>
        )}

        {/* Alt bilgi */}
        <g className="ts-footer">
          <text x={marginLeft} y={svgHeight - 15} fontSize="8" fill="#888" fontFamily="Arial">
            Ölçek: 1:{Math.round(100 / scale)} | Toplam Derinlik: {totalDepth.toFixed(1)} m
          </text>
          <text x={svgWidth - 16} y={svgHeight - 15} fontSize="8" fill="#888" fontFamily="Arial" textAnchor="end">
            FALUZMN Geoteknik Mühendisliği
          </text>
        </g>
      </svg>

      {/* Lejant */}
      <div className="ts-legend">
        <span className="ts-legend-title">LEJANT:</span>
        <span className="ts-legend-item">
          <i style={{ background: '#c8a882' }} /> Kil
        </span>
        <span className="ts-legend-item">
          <i style={{ background: '#e8d088' }} /> Kum
        </span>
        <span className="ts-legend-item">
          <i style={{ background: '#c0ccc0' }} /> Silt
        </span>
        <span className="ts-legend-item">
          <i style={{ background: '#b8c0b8' }} /> Çakıl
        </span>
        <span className="ts-legend-item ts-legend-line">
          <i style={{ borderTop: '2px dashed #2196F3' }} /> YASS
        </span>
        <span className="ts-legend-item">
          <i className="ts-legend-marker spt">S</i> SPT
        </span>
        <span className="ts-legend-item">
          <i className="ts-legend-marker lab">L</i> Lab
        </span>
      </div>
    </div>
  )
}

export default TechnicalSection
