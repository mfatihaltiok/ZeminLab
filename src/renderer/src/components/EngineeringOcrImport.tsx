import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'

type Mode = 'spt' | 'laboratory'
type OcrLine = { text: string; score?: number | null; box?: unknown }
type DocumentTable = { index?:number; page?:number|null; box?:number[]|null; columns?:string[]; rows?:string[][] }
type AnalysisResult = { ok:boolean; provider?:string; engines?:{ocr?:string;layout_table?:string}; lines?:OcrLine[]; document?:{text?:string;tables?:DocumentTable[];pages?:number}; warnings?:{paddle?:string|null;docling?:string|null}; policy?:{no_guessing?:boolean;requires_user_review?:boolean;reject_ambiguous_values?:boolean}; error?:string }
type SptCandidate = { depth:number; n1?:number; n2?:number; n3?:number; score:number; raw:string }
type LabCandidate = { field:string; value:number; score:number; raw:string; evidence:string }

const numberTokens=(text:string)=>[...text.replace(/,/g,'.').matchAll(/-?\d+(?:\.\d+)?/g)].map(m=>Number(m[0])).filter(Number.isFinite)
const norm=(text:string)=>text.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/φ/g,'phi').replace(/Φ/g,'phi').replace(/°/g,'').replace(/\s+/g,' ').trim()
const box=(value:unknown)=>{if(!Array.isArray(value)||value.length<4)return null;const n=value.slice(0,4).map(Number);return n.every(Number.isFinite)?n:null}
const center=(value:unknown)=>{const b=box(value);return b?{x:(b[0]+b[2])/2,y:(b[1]+b[3])/2,h:Math.max(1,b[3]-b[1])}:null}

function parseSpt(lines:OcrLine[]):SptCandidate[]{
  const direct=lines.flatMap(line=>{
    const nums=numberTokens(line.text)
    if(nums.length<3||nums.length>8)return[]
    const depth=nums[0]
    if(depth<0||depth>200)return[]
    const n=nums.slice(1,4).filter(v=>v>=0&&v<=999)
    if(n.length<2)return[]
    return[{depth,n1:n[0],n2:n[1],n3:n[2],score:line.score??0,raw:line.text}]
  })
  if(direct.length)return dedupeSpt(direct)
  const cells=lines.map(line=>({line,pos:center(line.box),nums:numberTokens(line.text)})).filter(c=>c.pos&&c.nums.length===1).sort((a,b)=>((a.pos?.y??0)-(b.pos?.y??0))||((a.pos?.x??0)-(b.pos?.x??0)))
  const rows:{y:number;height:number;cells:typeof cells}[]=[]
  for(const cell of cells){
    const p=cell.pos!,last=rows[rows.length-1]
    if(last&&Math.abs(last.y-p.y)<=Math.max(10,last.height*0.8,p.h*0.8)){last.cells.push(cell);last.y=(last.y*(last.cells.length-1)+p.y)/last.cells.length;last.height=Math.max(last.height,p.h)}
    else rows.push({y:p.y,height:p.h,cells:[cell]})
  }
  return dedupeSpt(rows.flatMap(row=>{
    const ordered=row.cells.sort((a,b)=>a.pos!.x-b.pos!.x),nums=ordered.map(c=>c.nums[0])
    if(nums.length<3)return[]
    const depth=nums[0],n=nums.slice(1,4).filter(v=>v>=0&&v<=999)
    if(depth<0||depth>200||n.length<2)return[]
    return[{depth,n1:n[0],n2:n[1],n3:n[2],score:ordered.reduce((s,c)=>s+(c.line.score??0),0)/ordered.length,raw:ordered.map(c=>c.line.text).join(' | ')}]
  }))
}
function dedupeSpt(rows:SptCandidate[]){const map=new Map<string,SptCandidate>();for(const row of rows){const key=row.depth.toFixed(3),old=map.get(key);if(!old||row.score>old.score)map.set(key,row)}return [...map.values()].sort((a,b)=>a.depth-b.depth)}

const LAB_FIELDS:Array<[string,string[]]>=[
  ['waterContent',['su muhtevasi','su icerigi','water content','w content']],
  ['sieve10Passing',['#10','10 elek','10 gecen','no 10']],['sieve200Passing',['#200','200 elek','200 gecen','no 200']],
  ['liquidLimit',['likit limit','liquid limit','ll']],['plasticLimit',['plastik limit','plastic limit','pl']],
  ['plasticityIndex',['plastisite indisi','plastisite indeksi','plasticity index','pi']],['unitWeight',['birim hacim agirlik','unit weight','gamma']],
  ['uuC',['uu kohezyon','uu c','uu cohesion']],['uuPhi',['uu phi','uu friction']],['consolidationCc',['konsolidasyon cc','compression index cc']],
  ['consolidationCs',['konsolidasyon cs','swelling index cs']],['elasticModulus',['elastic modulus','deformasyon modulu','es']],
  ['poissonRatio',['poisson','poisson orani']],['directShearC',['direkt kesme c','direct shear c']],['directShearPhi',['direkt kesme phi','direct shear phi']],
  ['density',['yogunluk','density']],['porosity',['porozite','porosity']],['voidRatio',['bosluk orani','void ratio']],
  ['c',['kohezyon','cohesion']],['phi',['icsel surtunme acisi','internal friction angle','friction angle','kayma acisi','phi']],
  ['finesContent',['ince dane','ince dane orani','fines content','fines']]
]
const ranges:Record<string,[number,number]>={waterContent:[0,300],sieve10Passing:[0,100],sieve200Passing:[0,100],liquidLimit:[0,300],plasticLimit:[0,300],plasticityIndex:[0,300],unitWeight:[0,40],uuC:[0,5000],uuPhi:[0,90],consolidationCc:[0,5],consolidationCs:[0,5],elasticModulus:[0,100000],poissonRatio:[0,0.5],directShearC:[0,5000],directShearPhi:[0,90],density:[0,40],porosity:[0,100],voidRatio:[0,20],c:[0,5000],phi:[0,90],finesContent:[0,100]}
function fieldMatches(text:string,label:string){const n=norm(text);if(label.startsWith('#'))return n.includes(label);if(label==='phi')return /(^|\s)phi(\s|$)/.test(n)||n.includes('φ');if(['ll','pl','pi'].includes(label))return new RegExp('(^|\\s)'+label+'(\\s|$)').test(n);return n.includes(norm(label))}
function validValue(field:string,value:number){const range=ranges[field];return !!range&&value>=range[0]&&value<=range[1]&&Number.isFinite(value)}

function parseLaboratory(lines:OcrLine[],tables:DocumentTable[]=[]):LabCandidate[]{
  const entries=lines.map((line,index)=>({line,index,text:norm(line.text),pos:center(line.box),nums:numberTokens(line.text)})),out:LabCandidate[]=[]
  for(const [field,labels] of LAB_FIELDS){
    const labelLines=entries.filter(e=>labels.some(label=>fieldMatches(e.text,label))),candidates:{value:number;score:number;raw:string;evidence:string}[]=[]
    for(const label of labelLines){
      if(label.nums.length===1&&validValue(field,label.nums[0])){candidates.push({value:label.nums[0],score:label.line.score??0,raw:label.line.text,evidence:'aynı satır: '+label.line.text});continue}
      const lp=label.pos
      const nearby=entries.filter(e=>e.nums.length===1&&validValue(field,e.nums[0])&&e.index!==label.index).map(e=>{
        const ep=e.pos;if(!lp||!ep)return null;const dy=Math.abs(ep.y-lp.y),dx=ep.x-lp.x,height=Math.max(lp.h,ep.h,8),sameRow=dy<=height*1.4,below=ep.y>lp.y&&dy<=height*3.5,right=dx>=-height*1.5
        if(!sameRow&&!below)return null;if(sameRow&&!right)return null
        const proximity=Math.max(0,1-Math.min(1,dy/(height*3.5))),direction=sameRow?(right?1:0.2):0.75,score=(e.line.score??0)*0.65+proximity*0.25+direction*0.10
        return{value:e.nums[0],score,raw:e.line.text,evidence:label.line.text+' -> '+e.line.text}
      }).filter(Boolean) as {value:number;score:number;raw:string;evidence:string}[]
      candidates.push(...nearby.sort((a,b)=>b.score-a.score).slice(0,3))
    }
    for(const table of tables){for(const row of table.rows??[]){const rowText=row.join(' | ');if(!labels.some(label=>fieldMatches(rowText,label)))continue;const nums=numberTokens(rowText);if(nums.length===1&&validValue(field,nums[0]))candidates.push({value:nums[0],score:0.96,raw:rowText,evidence:'Docling tablo: '+rowText})}}
    if(!candidates.length)continue;candidates.sort((a,b)=>b.score-a.score);const top=candidates[0],second=candidates.find(c=>c.value!==top.value);if(second&&Math.abs(second.score-top.score)<0.12)continue
    out.push({field,value:top.value,score:Math.min(1,top.score),raw:top.raw,evidence:top.evidence})
  }
  return out
}

function fileToDataUrl(file:File){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error??new Error('Belge okunamadı.'));reader.readAsDataURL(file)})}

export function EngineeringOcrImport({mode,laboratoryTargets=[],onSptImport,onLaboratoryImport}:{mode:Mode;laboratoryTargets?:Array<{id:string;sampleId:string;depth:number}>;onSptImport?:(rows:SptCandidate[])=>void;onLaboratoryImport?:(targetId:string,rows:LabCandidate[])=>void}){
  const inputRef=useRef<HTMLInputElement>(null),[host,setHost]=useState<HTMLElement|null>(null),[visible,setVisible]=useState(false),[analysis,setAnalysis]=useState<AnalysisResult|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[review,setReview]=useState(false),[targetId,setTargetId]=useState(laboratoryTargets[0]?.id??'')
  const lines=analysis?.lines??[],tables=analysis?.document?.tables??[],candidates=useMemo(()=>mode==='spt'?parseSpt(lines):parseLaboratory(lines,tables),[lines,tables,mode])
  useEffect(()=>{const updateHost=()=>{const nextHost=document.querySelector<HTMLElement>('.field-content'),active=document.querySelector<HTMLElement>('.field-tabs button.active')?.textContent?.trim();setHost(nextHost);setVisible(mode==='spt'?active==='SPT':active==='Laboratuvar')};updateHost();const observer=new MutationObserver(updateHost);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});return()=>observer.disconnect()},[mode])
  useEffect(()=>{if(!targetId&&laboratoryTargets[0])setTargetId(laboratoryTargets[0].id)},[laboratoryTargets,targetId])
  const analyze=async(dataUrl:string)=>{setBusy(true);setMessage('Belge yapısı ve OCR analiz ediliyor…');setReview(false);setAnalysis(null);try{const result=await window.api.ocr.analyzeImage(dataUrl);if(!result.ok)throw new Error(result.error??'Belge analizi başarısız.');setAnalysis(result);const found=result.lines?.length??0,tableCount=result.document?.tables?.length??0;if(!found&&!result.document?.text?.trim())throw new Error('Belgede güvenilir metin bulunamadı.');setReview(true);setMessage(found+' OCR satırı, '+tableCount+' tablo yapısı bulundu. Sonuçlar otomatik kaydedilmez.')}catch(error){setMessage(error instanceof Error?error.message:'Belge analizi başarısız.')}finally{setBusy(false)}}
  useEffect(()=>{const onPaste=(event:ClipboardEvent)=>{const active=document.querySelector<HTMLElement>('.field-tabs button.active')?.textContent?.trim();if((mode==='spt'&&active!=='SPT')||(mode==='laboratory'&&active!=='Laboratuvar'))return;const image=[...(event.clipboardData?.items??[])].find(item=>item.type.startsWith('image/'));if(!image)return;event.preventDefault();const file=image.getAsFile();if(file)void fileToDataUrl(file).then(analyze)};document.addEventListener('paste',onPaste);return()=>document.removeEventListener('paste',onPaste)},[mode])
  const onFile=async(file?:File)=>{if(!file)return;if(!['image/png','image/jpeg','application/pdf'].includes(file.type)){setMessage('Yalnızca PNG, JPG veya PDF kabul edilir.');return}await analyze(await fileToDataUrl(file))}
  const importRows=()=>{if(!candidates.length)return;if(mode==='spt')onSptImport?.(candidates as SptCandidate[]);else if(targetId)onLaboratoryImport?.(targetId,candidates as LabCandidate[]);setMessage(candidates.length+' doğrulanmış aday kullanıcı onayıyla içeri aktarılacak şekilde hazırlandı.');setReview(false)}
  if(!host||!visible)return null
  const panel=<section className="engineering-note engineering-ocr-panel" style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><strong>{mode==='spt'?'SPT VERİLERİNİ BELGEDEN OKU':'LABORATUVAR VERİLERİNİ BELGEDEN OKU'}</strong><div style={{fontSize:12,opacity:.75}}>PNG/JPG seçebilir, PDF yükleyebilir veya Ctrl+V ile görsel yapıştırabilirsiniz. Yer değişimi için sayfa koordinatına değil belge yapısına bakılır.</div></div><div style={{display:'flex',gap:8,alignItems:'center'}}>{mode==='laboratory'&&<select value={targetId} onChange={e=>setTargetId(e.target.value)} disabled={!laboratoryTargets.length}><option value="">Hedef numune seçin</option>{laboratoryTargets.map(t=><option key={t.id} value={t.id}>{t.sampleId} · {t.depth.toFixed(2)} m</option>)}</select>}<button className="command-button" disabled={busy} onClick={()=>inputRef.current?.click()}>{busy?'Analiz ediliyor…':'Belge seç'}</button><input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,application/pdf" onChange={e=>void onFile(e.target.files?.[0])}/></div></div>{message&&<div style={{marginTop:8}}>{message}</div>}{review&&<div style={{marginTop:12,overflowX:'auto'}}><table className="engineering-grid"><thead><tr>{mode==='spt'?<><th>Derinlik</th><th>n1</th><th>n2</th><th>n3</th><th>Güven</th></>:<><th>Alan</th><th>Değer</th><th>Güven</th><th>Kanıt</th></>}</tr></thead><tbody>{mode==='spt'?(candidates as SptCandidate[]).map((r,i)=><tr key={i}><td>{r.depth}</td><td>{r.n1??'—'}</td><td>{r.n2??'—'}</td><td>{r.n3??'—'}</td><td>{r.score?(r.score*100).toFixed(0)+'%':'belirsiz'}</td></tr>):(candidates as LabCandidate[]).map((r,i)=><tr key={i}><td>{r.field}</td><td>{r.value}</td><td>{r.score?(r.score*100).toFixed(0)+'%':'belirsiz'}</td><td>{r.evidence}</td></tr>)}</tbody></table><div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button className="command-button primary" disabled={!candidates.length||(mode==='laboratory'&&!targetId)} onClick={importRows}>Kontrol ettim, verileri içeri aktar</button></div></div>}</section>
  return createPortal(panel,host)
}
export type { SptCandidate, LabCandidate }