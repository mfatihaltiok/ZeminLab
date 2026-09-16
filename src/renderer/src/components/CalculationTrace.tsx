import type { ReactNode } from 'react'
import type { SptTraceStep } from '../../../core/engineering/spt/spt-engine'
import '../assets/calculation-trace.css'

type TraceRow = { symbol: string; title: string; formula: string; value?: string | number; unit?: string; note?: string }
type Props = { title: string; rows: TraceRow[]; source: string; children?: ReactNode }

export function CalculationTrace({ title, rows, source, children }: Props) { return <section className="calculation-trace"><div className="calculation-trace-header"><div><span>HESAP İZİ</span><h3>{title}</h3></div><div className="calculation-trace-badge">AYRINTILI</div></div><div className="calculation-trace-body">{rows.map((row,index)=><div className="trace-row" key={`${row.symbol}-${index}`}><div className="trace-index">{String(index+1).padStart(2,'0')}</div><div className="trace-main"><div className="trace-title"><b>{row.symbol}</b><span>{row.title}</span></div><code>{row.formula}</code>{row.note&&<small>{row.note}</small>}</div><div className="trace-value"><strong>{row.value===undefined?'—':typeof row.value==='number'?row.value.toLocaleString('tr-TR',{maximumFractionDigits:4}):row.value}</strong>{row.unit&&<span>{row.unit}</span>}</div></div>)}{children}</div><div className="calculation-trace-footer"><span>KAYNAK</span><b>{source}</b></div></section> }
export function SptCalculationTrace({ steps, source }: { steps: SptTraceStep[]; source: string }) { return <CalculationTrace title="SPT düzeltme ve normalizasyon" source={source} rows={steps.map((step)=>({symbol:step.symbol,title:step.title,formula:step.formula,value:step.value,unit:step.unit,note:step.note}))} /> }
