import { useEffect, useMemo, useRef, useState } from 'react'
import type { LaboratoryRecord, SptRecord } from '../../../core/models/field-data'

type Mode = 'spt' | 'laboratory'
type OcrLine = { text: string; score?: number | null; box?: unknown }
type SptCandidate = { depth:number; n1?:number; n2?:number; n3?:number; score:number; raw:string }
type LabCandidate = { field:string; value:number; score:number; raw:string }

const numberTokens=(text:string)=>[...text.replace(/,/g,'.').matchAll(/-?\d+(?:\.\d+)?/g)].map(m=>Number(m[0])).filter(Number.isFinite)
const norm=(text:string)=>text.toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/İ/g,'i')

function parseSpt(lines:OcrLine[]):SptCandidate[]{
  return lines.flatMap(line=>{
    const nums=numberTokens(line.text)
    if(nums.length<3||nums.length>8)return []
    const depth=nums[0]
    if(depth<0||depth>200)return []
    const n=nums.slice(1,4).filter(v=>v>=0&&v<=999)
    if(n.length<2)return []
    return [{depth,n1:n[0],n2:n[1],n3:n[2],score:line.score??0,raw:line.text}]
  })
}

const LAB_FIELDS:Array<[string,string[]]>= [
  ['waterContent',['su muhtevasi','su icerigi','water content','w'] ],
  ['sieve10Passing',['#10','10 elek','10 gecen']],
  ['sieve200Passing',['#200','200 elek','200 gecen']],
  ['liquidLimit',['likit limit','liquid limit','ll']],
  ['plasticLimit',['plastik limit','plastic limit','pl']],
  ['plasticityIndex',['plastisite indisi','plastisite indeksi','plasticity index','pi']],
  ['unitWeight',['birim hacim agirlik','birim hacim ağırlık','unit weight','gamma']],
  ['uuC',['uu kohezyon','uu c','uu cohesion']],
  ['uuPhi',['uu phi','uu friction']],
  ['consolidationCc',['cc','konsolidasyon cc']],
  ['consolidationCs',['cs','konsolidasyon cs']],
  ['elasticModulus',['elastic modulus','deformasyon modulu','deformasyon modülü','es']],
  ['poissonRatio',['poisson','poisson orani','poisson oranı']],
  ['directShearC',['direkt kesme c','direct shear c']],
  ['directShearPhi',['direkt kesme phi','direct shear phi']],
  ['density',['yoğunluk','yogunluk','density']],
  ['porosity',['porozite','porosity']],
  ['voidRatio',['bosluk orani','boşluk oranı','void ratio']],
  ['c',['c =','kohezyon']],
  ['phi',['phi =','φ =','friction angle','kayma acisi','kayma açısı']],
  ['finesContent',['ince dane','ince dane orani','ince dane oranı','fines']]
]

function parseLaboratory(lines:OcrLine[]):LabCandidate[]{
  const out:LabCandidate[]=[]
  for(const line of lines){
    const text=norm(line.text),nums=numberTokens(line.text)
    if(nums.length!==1)continue
    const value=nums[0]
    for(const [field,labels] of LAB_FIELDS){if(labels.some(label=>text.includes(norm(label)))){out.push({field,value,score:line.score??0,raw:line.text});break}}
  }
  return out
}

function fileToDataUrl(file:File){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error??new Error('Görsel okunamadı.'));reader.readAsDataURL(file)})}

export function EngineeringOcrImport({mode,onSptImport,onLaboratoryImport}:{mode:Mode;onSptImport?:(rows:SptCandidate[])=>void;onLaboratoryImport?:(rows:LabCandidate[])=>void}){
  const inputRef=useRef<HTMLInputElement>(null)
  const [lines,setLines]=useState<OcrLine[]>([])
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [review,setReview]=useState(false)
  const candidates=useMemo(()=>mode==='spt'?parseSpt(lines):parseLaboratory(lines),[lines,mode])

  const analyze=async(dataUrl:string)=>{setBusy(true);setMessage('PaddleOCR görüntüyü okuyor…');setReview(false);try{const result=await window.api.ocr.analyzeImage(dataUrl);if(!result.ok)throw new Error(result.error??'OCR başarısız.');const next=result.lines??[];setLines(next);setReview(true);setMessage(`${next.length} OCR satırı bulundu. Aktarılacak adayları kontrol edin.`)}catch(error){setMessage(error instanceof Error?error.message:'OCR başarısız.')}finally{setBusy(false)}}
  useEffect(()=>{const onPaste=(event:ClipboardEvent)=>{const items=[...(event.clipboardData?.items??[])];const image=items.find(item=>item.type.startsWith('image/'));if(!image)return;event.preventDefault();const file=image.getAsFile();if(file)void fileToDataUrl(file).then(analyze)};document.addEventListener('paste',onPaste);return()=>document.removeEventListener('paste',onPaste)},[mode])
  const onFile=async(file?:File)=>{if(!file)return;if(!['image/png','image/jpeg'].includes(file.type)){setMessage('Yalnızca PNG veya JPG kabul edilir.');return}await analyze(await fileToDataUrl(file))}
  const importRows=()=>{if(mode==='spt')onSptImport?.(candidates as SptCandidate[]);else onLaboratoryImport?.(candidates as LabCandidate[]);setMessage(`${candidates.length} kayıt kullanıcı onayıyla içeri aktarıldı.`);setReview(false)}

  return <section className="engineering-note" style={{marginBottom:12}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div><strong>{mode==='spt'?'SPT VERİLERİNİ GÖRÜNTÜDEN OKU':'LABORATUVAR VERİLERİNİ GÖRÜNTÜDEN OKU'}</strong><div style={{fontSize:12,opacity:.75}}>PNG/JPG sürükle-bırak veya <b>Ctrl+V</b>. OCR sonucu doğrudan kaydedilmez.</div></div>
      <div style={{display:'flex',gap:8}}><button className="command-button" disabled={busy} onClick={()=>inputRef.current?.click()}>{busy?'Okunuyor…':'Görsel seç'}</button><input ref={inputRef} hidden type="file" accept="image/png,image/jpeg" onChange={e=>void onFile(e.target.files?.[0])}/></div>
    </div>
    {message&&<div style={{marginTop:8}}>{message}</div>}
    {review&&<div style={{marginTop:12,overflowX:'auto'}}>
      <table className="engineering-grid"><thead><tr>{mode==='spt'?<><th>Derinlik</th><th>n1</th><th>n2</th><th>n3</th><th>OCR</th></>:<><th>Alan</th><th>Değer</th><th>OCR</th></>}</tr></thead>
      <tbody>{mode==='spt'?(candidates as SptCandidate[]).map((r,i)=><tr key={i}><td>{r.depth}</td><td>{r.n1??'—'}</td><td>{r.n2??'—'}</td><td>{r.n3??'—'}</td><td>{r.score?`${(r.score*100).toFixed(0)}%`:r.raw}</td></tr>):(candidates as LabCandidate[]).map((r,i)=><tr key={i}><td>{r.field}</td><td>{r.value}</td><td>{r.score?`${(r.score*100).toFixed(0)}%`:r.raw}</td></tr>)}</tbody></table>
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button className="command-button primary" disabled={!candidates.length} onClick={importRows}>Kontrol ettim, verileri içeri aktar</button></div>
    </div>}
  </section>
}

export type { SptCandidate, LabCandidate }
