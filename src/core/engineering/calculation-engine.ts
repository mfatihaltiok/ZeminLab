export function jetGrout(i:{columnDiameter:number;spacing:number;qultSoil:number;qultColumn:number;improvementFactor:number;FS:number;columnStrength:number}){
  const Ac=Math.PI*i.columnDiameter**2/4,ratio=Math.min(1,Ac/Math.max(i.spacing**2,1e-9)),composite=(1-ratio)*i.qultSoil+ratio*i.qultColumn*i.improvementFactor
  return{value:{Ac,ratio,composite,allowable:composite/Math.max(i.FS,1e-9),columnLoad:Ac*i.columnStrength/Math.max(i.FS,1e-9)},steps:[{symbol:'Ac',title:'Kolon kesit alanı',formula:'πd²/4',value:Ac},{symbol:'ρ',title:'İyileştirme oranı',formula:'Ac/Acell',value:ratio}],method:'Jet Grout ön model',source:'Proje kaynak paketi'}
}
export function jetGrout(i:{columnDiameter:number;spacing:number;qultSoil:number;qultColumn:number;improvementFactor:number;FS:number;columnStrength:number}){
  if(!Number.isFinite(i.columnDiameter)||i.columnDiameter<=0||!Number.isFinite(i.spacing)||i.spacing<=0||!Number.isFinite(i.qultSoil)||i.qultSoil<0||!Number.isFinite(i.qultColumn)||i.qultColumn<0||!Number.isFinite(i.improvementFactor)||i.improvementFactor<0||!Number.isFinite(i.FS)||i.FS<=0||!Number.isFinite(i.columnStrength)||i.columnStrength<0)throw new Error('Jet Grout uyumluluk girdileri geçersiz.')
  const Ac=Math.PI*i.columnDiameter**2/4,ratio=Ac/(i.spacing**2)
  if(ratio<=0||ratio>1)throw new Error('Jet Grout iyileştirme oranı 0<ρ≤1 olmalıdır; d ve aks aralığını kontrol edin.')
  const composite=(1-ratio)*i.qultSoil+ratio*i.qultColumn*i.improvementFactor
  return{value:{Ac,ratio,composite,allowable:composite/i.FS,columnLoad:Ac*i.columnStrength/i.FS},steps:[{symbol:'Ac',title:'Kolon kesit alanı',formula:'πd²/4',value:Ac},{symbol:'ρ',title:'İyileştirme oranı',formula:'Ac/Acell',value:ratio}],method:'Jet Grout ön model',source:'Uyumluluk API; ileri Jet Grout motorunun yerine geçmez.',warnings:['Bu fonksiyon basitleştirilmiş uyumluluk modelidir.']}
}
export function stressAtDepth(depth:number,layers:{top:number;bottom:number;gamma:number;gammaSat:number}[],gwt:number){
  if(!Number.isFinite(depth)||depth<0||!Number.isFinite(gwt)||gwt<0)throw new Error('Derinlik ve YASS geçerli olmalıdır.')
  let sigmaV=0,cursor=0
  for(const layer of [...layers].filter(x=>x.bottom>x.top).sort((a,b)=>a.top-b.top)){
   if(layer.top>cursor+1e-9&&layer.top<depth-1e-9)throw new Error('Gerilme profili süreksiz; katmanlar 0 m’den başlayarak kesintisiz tanımlanmalıdır.')
   const z0=Math.max(cursor,layer.top),z1=Math.min(depth,layer.bottom);if(z1<=z0)continue
   if(!Number.isFinite(layer.gamma)||layer.gamma<=0||!Number.isFinite(layer.gammaSat)||layer.gammaSat<=0)throw new Error('γ ve γsat tüm gerilme katmanlarında geçerli olmalıdır.')
   const dry=Math.max(0,Math.min(z1,gwt)-z0),sat=(z1-z0)-dry;sigmaV+=dry*layer.gamma+sat*layer.gammaSat;cursor=z1;if(cursor>=depth-1e-9)break
  }
  if(cursor<depth-1e-9)throw new Error('Gerilme profili hesap derinliğine kadar tamamlanmamış.')
  const u=depth>gwt?(depth-gwt)*9.80665:0
  return{sigmaV,sigmaVPrime:Math.max(0,sigmaV-u),u}
}
