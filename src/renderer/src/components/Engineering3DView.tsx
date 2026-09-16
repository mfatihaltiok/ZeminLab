import type { BoreholeRecord } from '../../../core/models/field-data'
import { useProjectInfo } from '../../../core/state/project-store'
import './engineering-3d-view.css'

type Props = { boreholes?: BoreholeRecord[] }

export function Foundation3DView({ boreholes = [] }: Props) {
  const project = useProjectInfo()
  const f = project.foundationParameters
  const width = Math.max(f.footingWidth || 2.5, 1)
  const length = Math.max(f.footingLength || 2.5, 1)
  const depth = Math.max(f.footingDepth || 0.6, 0.3)
  const scale = Math.min(230 / length, 150 / width)
  const bx = 360
  const by = 155
  const lx = length * scale
  const wy = width * scale * 0.55
  const h = Math.max(30, depth * 45)
  const p1 = `${bx},${by}`
  const p2 = `${bx + lx},${by - wy}`
  const p3 = `${bx + lx + wy},${by + 28}`
  const p4 = `${bx + wy},${by + wy + 28}`
  const z = h
  const c1 = `${bx},${by + z}`
  const c2 = `${bx + lx},${by - wy + z}`
  const c3 = `${bx + lx + wy},${by + 28 + z}`
  const c4 = `${bx + wy},${by + wy + 28 + z}`
  return <section className="engineering-3d-card"><div className="engineering-3d-header"><div><span>GEOMETRİK GÖRÜNÜM</span><h3>Temel ve zemin modeli</h3></div><div className="engineering-3d-meta"><b>{width.toFixed(2)} × {length.toFixed(2)} m</b><span>Df = {depth.toFixed(2)} m</span></div></div><div className="engineering-3d-stage"><svg viewBox="0 0 760 330" role="img" aria-label="Temel geometrisinin izometrik mühendislik görünümü"><defs><pattern id="soil-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="currentColor" strokeOpacity=".12" /></pattern></defs><rect x="0" y="0" width="760" height="330" fill="url(#soil-grid)"/><polygon points={`${c1} ${c2} ${c3} ${c4}`} fill="#d6dde2" stroke="#71808a" strokeWidth="1.5"/><polygon points={`${p1} ${p2} ${c2} ${c1}`} fill="#eef1f3" stroke="#71808a" strokeWidth="1.5"/><polygon points={`${p2} ${p3} ${c3} ${c2}`} fill="#dfe5e8" stroke="#71808a" strokeWidth="1.5"/><polygon points={`${p4} ${p3} ${c3} ${c4}`} fill="#cbd4d9" stroke="#71808a" strokeWidth="1.5"/><polygon points={`${p1} ${p4} ${c4} ${c1}`} fill="#e6eaed" stroke="#71808a" strokeWidth="1.5"/><polygon points={`${p1} ${p2} ${p3} ${p4}`} fill="#f8fafb" stroke="#4f626e" strokeWidth="2"/>{[0,1,2,3].map((i)=><circle key={i} cx={bx + lx * (i%2 ? .72 : .28) + wy * (i>1 ? .55 : .1)} cy={by + wy * (i>1 ? .72 : .25) + 28 * (i%2) + 8} r="7" fill="#536e80" opacity=".9"/>)}<text x="36" y="34" className="engineering-3d-label">İZOMETRİK GÖRÜNÜM</text><text x="36" y="58" className="engineering-3d-note">Görsel kontrol içindir; hesap motorunun yerine geçmez.</text><line x1={bx} y1={by + wy + 58} x2={bx + lx} y2={by - wy + wy + 58} className="dimension-line"/><text x={bx + lx/2 - 18} y={by + wy + 76} className="dimension-text">L = {length.toFixed(2)} m</text><line x1={bx + lx + wy + 18} y1={by + 28} x2={bx + lx + wy + 18} y2={by + 28 + z} className="dimension-line"/><text x={bx + lx + wy + 25} y={by + 45 + z/2} className="dimension-text">Df</text><g className="borehole-markers">{boreholes.slice(0,6).map((borehole, index)=><g key={borehole.id}><circle cx={90 + index * 95} cy={270 - (index%2)*18} r="5"/><text x={77 + index * 95} y={290 - (index%2)*18}>{borehole.name}</text></g>)}</g></svg></div></section>
}
