import type { IdealizedSoilLayer, IdealizedSoilProfile } from '../models/idealized-soil-profile'
import type { FoundationType } from '../models/project'

export type IdealizedSettlementMethod='burland-burbidge'|'elasticity'|'2to1-layer'|'janbu'|'schmertmann'
type SettlementLayerResult={layerId:string;order:number;soilName:string;soilCode:string;topDepth:number;bottomDepth:number;thickness:number;midDepth:number;sigmaV0:number;porePressure:number;sigmaV0Effective:number;deltaSigma:number;sigmaVFinal:number;sigmaVFinalEffective:number;representativeN60?:number;Es?:number;poissonRatio?:number;immediateSettlement:number;consolidationSettlement:number;totalSettlement:number;method:string;status:'HESAPLANDI'|'VERİ EKSİK';note?:string}
export interface IdealizedSettlementInput{profile:IdealizedSoilProfile;method:IdealizedSettlementMethod;B:number;L:number;Df:number;qGross:number;groundwaterDepth?:number;foundationType?:FoundationType;timeYears?:number;influenceDepth?:number}
export interface IdealizedSettlementResult{method:IdealizedSettlementMethod;layers:SettlementLayerResult[];totalImmediate:number;totalConsolidation:number;totalSettlement:number;influenceDepth:number;netFoundationPressure:number;foundationEffectiveStress:number;ready:boolean;warnings:string[];source:string}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
const overlap=(a:number,b:number,c:number,d:number)=>a<d&&b>c
function isCohesive(layer:IdealizedSoilLayer){const code=(layer.soilCode+' '+layer.soilName).toUpperCase().replace(/İ/g,'I');return /(^|[^A-Z])(CI[LHM]|SI[LHM]|CL|CH|ML|MH)([^A-Z]|$)/.test(code)||code.includes('KIL')||code.includes('SILT')||code.includes('CLAY')||code.includes('ORGANIK')||code.includes('TURBA')}
function isGranular(layer:IdealizedSoilLayer){return !isCohesive(layer)&&!((layer.soilCode+' '+layer.soilName).toUpperCase().includes('KAYA'))}
function effectiveStressAtDepth(layers:IdealizedSoilLayer[],depth:number,gwt:number){let total=0;let cursor=0;let complete=true;for(const layer of [...layers].sort((a,b)=>a.topDepth-b.topDepth)){const top=Math.max(cursor,layer.topDepth),bottom=Math.min(depth,layer.bottomDepth);if(bottom<=top)continue;if(top>cursor+1e-6)complete=false;if(!finite(layer.gamma)||layer.gamma!<=0||!finite(layer.gammaSat??layer.gamma)||layer.gammaSat??layer.gamma<=0){complete=false;break}const above=gwt<0?bottom-top:Math.max(0,Math.min(bottom,gwt)-top),below=(bottom-top)-above;total+=above*layer.gamma!+below*(layer.gammaSat??layer.gamma)!;cursor=bottom;if(cursor>=depth-1e-6)break}if(cursor<depth-1e-6)complete=false;const u=gwt>=0&&depth>gwt?9.80665*(depth-gwt):0;return{total,porePressure:u,effective:Math.max(0,total-u),complete}}
function stressIncrement(qNet:number,B:number,L:number,z:number){return qNet*B*L/Math.max((B+z)*(L+z),1e-9)}
function adjustedBurlandN(layer:IdealizedSoilLayer,gwt:number,depth:number){if(!finite(layer.representativeN60)||layer.representativeN60!<=0)return undefined;let n=layer.representativeN60!;const code=(layer.soilCode+' '+layer.soilName).toUpperCase().replace(/İ/g,'I');const fineSand=code.includes('SISA')||code.includes('SILTY SAND')||code.includes('SM')||code.includes('CLSA');const gravellySand=code.includes('GRSA')||code.includes('SANDY GRAVEL')||code.includes('SAGR')||code.includes('GRAVELLY SAND');if(gwt>=0&&depth>=gwt&&fineSand&&n>15)n=15+.5*(n-15);if(gravellySand)n*=1.25;return n}
function burlandGlobalSettlement(pieces:Array<{layer:IdealizedSoilLayer;thickness:number;midDepth:number}>,qNet:number,B:number,L:number,influenceDepth:number,gwt:number){
  const granular=pieces.filter(x=>isGranular(x.layer)&&x.thickness>0)
  if(!granular.length)return{value:0,ok:true,note:'Etki bölgesinde granüler tabaka yok; Burland ani oturması 0.'}
  const nValues=granular.map(x=>adjustedBurlandN(x.layer,gwt,x.midDepth)).filter((x):x is number=>x!==undefined)
  if(nValues.length!==granular.length)return{value:0,ok:false,note:'Burland-Burbidge için etki bölgesindeki bütün granüler tabakalarda N60 bulunmalıdır.'}
  const H=granular.reduce((s,x)=>s+x.thickness,0),n60=nValues.reduce((s,x,i)=>s+x*granular[i].thickness,0)/H
  const pcs=granular.map(x=>x.layer.preconsolidationPressure);const anyPc=pcs.some(x=>finite(x)&&x!>0);const mixedPc=anyPc&&pcs.some(x=>!finite(x)||x!<=0)
  if(mixedPc)return{value:0,ok:false,note:'Granüler etki bölgesinde bazı tabakalarda öngerilme var, bazılarında yok; OC/NC durumu karışık olduğu için otomatik ortalama yapılmadı.'}
  const pc=anyPc?granular.reduce((s,x)=>s+(x.layer.preconsolidationPressure??0)*x.thickness,0)/H:undefined
  const ratio=L/Math.max(B,1e-9),Cs=Math.pow((1.25*ratio)/(ratio+.25),2),Br=.3,sigmaR=100,CI=H>=influenceDepth?1:(H/influenceDepth)*(2-H/influenceDepth)
  let state:'NC'|'OC-NO-YIELD'|'OC-YIELD'='NC',Ic:number,qTerm=qNet,coefficient=.14
  if(pc!==undefined){const npc=0.57/Math.pow(n60,1.4);if(qNet<=pc){state='OC-NO-YIELD';Ic=npc;coefficient=.047}else{state='OC-YIELD';Ic=npc;qTerm=Math.max(0,qNet-.67*pc);coefficient=.14}}else Ic=1.71/Math.pow(n60,1.4)
  const settlementMm=coefficient*Cs*CI*Ic*Math.pow(B/Br,.7)*(qTerm/sigmaR)*Br*1000
  return{value:Math.max(0,settlementMm),ok:true,state,n60,H,Cs,CI,Ic,pc,note:'Burland-Burbidge: '+state+', N60,adj='+n60.toFixed(2)+', Ic='+Ic.toFixed(4)+', Cs='+Cs.toFixed(3)+', CI='+CI.toFixed(3)}
}
function schmertmannIz(z:number,B:number,L:number,qNet:number,sigmaPeak:number){const ratio=L/Math.max(B,1e-9),lambda=ratio>=10?1:Math.max(0,(ratio-1)/9),zPeak=B*(.5+.5*lambda),zBottom=B*(2+2*lambda),iz0=.1+.1*lambda,izPeak=Math.min(.9,.5+.1*Math.sqrt(Math.max(qNet,0)/Math.max(sigmaPeak,1e-6)));if(z<0||z>=zBottom)return 0;if(z<=zPeak)return iz0+(izPeak-iz0)*z/Math.max(zPeak,1e-9);return izPeak*(1-z/zBottom)}
function consolidationSettlement(layer:IdealizedSoilLayer,thickness:number,sigma0:number,sigma1:number){if(!finite(layer.compressionIndexCc)||!finite(layer.initialVoidRatio)||sigma0<=0||sigma1<=sigma0)return{value:0,ok:false};const Cc=layer.compressionIndexCc!,Cr=finite(layer.recompressionIndexCr)&&layer.recompressionIndexCr!>=0?layer.recompressionIndexCr!:Cc,e0=layer.initialVoidRatio!,pc=finite(layer.preconsolidationPressure)&&layer.preconsolidationPressure!>sigma0?layer.preconsolidationPressure!:sigma0;let strain=0;if(sigma1<=pc)strain=Cr*Math.log10(sigma1/sigma0);else{strain=Cr*Math.log10(Math.max(pc/sigma0,1));strain+=Cc*Math.log10(Math.max(sigma1/pc,1))}return{value:Math.max(0,thickness*strain/(1+e0)*1000),ok:true}}
export function calculateIdealizedSettlement(input:IdealizedSettlementInput):IdealizedSettlementResult{
  const {profile,method,B,L,Df,qGross}=input;const warnings:string[]=[];const layers=[...profile.layers].sort((a,b)=>a.topDepth-b.topDepth);const gwt=finite(input.groundwaterDepth)?input.groundwaterDepth!:-1
  if(profile.status!=='SABİTLENDİ')warnings.push('İdealize Zemin Profili SABİTLENDİ durumunda değil.')
  if(B<=0||L<=0||Df<0||qGross<=0)return{method,layers:[],totalImmediate:0,totalConsolidation:0,totalSettlement:0,influenceDepth:0,netFoundationPressure:0,foundationEffectiveStress:0,ready:false,warnings:[...warnings,'Temel B, L, Df ve yük girdileri geçerli olmalıdır.'],source:'İdealize zemin profili oturma motoru'}
  const baseStress=effectiveStressAtDepth(layers,Df,gwt);if(!baseStress.complete)warnings.push('Temel tabanına kadar profil/γ verisi eksik; σ′v0 tamamlanamadı.')
  const qNet=Math.max(0,qGross-baseStress.effective);if(qNet<=0)warnings.push('Temel seviyesinde net ilave basınç sıfır/negatif.')
  const ratio=L/Math.max(B,1e-9)
  let influenceDepth=0
  if(method==='burland-burbidge')influenceDepth=1.4*Math.pow(B/.3,.75)*.3
  else if(method==='schmertmann')influenceDepth=input.influenceDepth??(ratio>=10?4*B:2*B)
  else {influenceDepth=input.influenceDepth??0;if(influenceDepth<=0)warnings.push('Seçilen yöntem için etki derinliği açıkça girilmelidir.')}
  if(input.foundationType==='surekli'&&ratio<10)warnings.push('Sürekli temel seçildi ancak L/B < 10; gerçek temel geometrisiyle değerlendirme yapılmalıdır.')
  const zoneBottom=Df+influenceDepth;const zoneStress=effectiveStressAtDepth(layers,zoneBottom,gwt);if(influenceDepth>0&&!zoneStress.complete)warnings.push('Tanımlı etki derinliği boyunca zemin profili/gerilme verisi eksik.')
  let totalImmediate=0,totalConsolidation=0;const results:SettlementLayerResult[]=[];const burlandPieces:Array<{layer:IdealizedSoilLayer;thickness:number;midDepth:number}>=[]
  for(const layer of layers){
    if(layer.bottomDepth<=Df||influenceDepth<=0)continue
    const top=Math.max(layer.topDepth,Df),bottom=Math.min(layer.bottomDepth,zoneBottom);if(bottom<=top)continue
    const thickness=bottom-top,zTop=top-Df,zBottom=bottom-Df,zMid=(zTop+zBottom)/2,midDepth=Df+zMid,midStress=effectiveStressAtDepth(layers,midDepth,gwt),deltaSigma=Math.max(0,stressIncrement(qNet,B,L,zMid)),finalEffective=midStress.effective+deltaSigma,cohesive=isCohesive(layer)
    let immediate=0,consolidation=0,status:'HESAPLANDI'|'VERİ EKSİK'=(!midStress.complete?'VERİ EKSİK':'HESAPLANDI'),methodName='',note=midStress.complete?'':'Orta noktaya kadar gerilme hesabı için profil eksik.'
    if(method==='burland-burbidge'){
      methodName=cohesive?'Burland bölgesi dışında · konsolidasyon':'Burland & Burbidge (1985)'
      if(!cohesive){burlandPieces.push({layer,thickness,midDepth});const r=adjustedBurlandN(layer,gwt,midDepth);if(r===undefined){status='VERİ EKSİK';note=(note?note+' ':'')+'N60 eksik.'}}
      if(cohesive){const r=consolidationSettlement(layer,thickness,midStress.effective,finalEffective);if(r.ok)consolidation=r.value;else{status='VERİ EKSİK';note=(note?note+' ':'')+'Cc, e0 ve başlangıç efektif gerilmesi gerekir.'}}
    }else if(method==='elasticity'){
      methodName='Elastik tabaka gerinimi';if(finite(layer.elasticModulus)&&layer.elasticModulus!>0)immediate=deltaSigma*thickness/layer.elasticModulus!*1000;else{status='VERİ EKSİK';note=(note?note+' ':'')+'Elastik E modülü gerekir.'}
      if(cohesive){const r=consolidationSettlement(layer,thickness,midStress.effective,finalEffective);if(r.ok)consolidation=r.value;else status='VERİ EKSİK'}
    }else if(method==='2to1-layer'){
      methodName='2:1 gerilme yayılımı + elastik tabaka';if(finite(layer.elasticModulus)&&layer.elasticModulus!>0)immediate=deltaSigma*thickness/layer.elasticModulus!*1000;else{status='VERİ EKSİK';note=(note?note+' ':'')+'Elastik E modülü gerekir.'}
    }else if(method==='janbu'){
      methodName='Janbu M-integrasyonu';if(finite(layer.constrainedModulus)&&layer.constrainedModulus!>0)immediate=deltaSigma*thickness/layer.constrainedModulus!*1000;else{status='VERİ EKSİK';note=(note?note+' ':'')+'Janbu M/constrained modulus gerekir.'}
    }else{
      methodName='Schmertmann et al. (1978)';const sigmaPeak=effectiveStressAtDepth(layers,Df+Math.min(influenceDepth/2,B),gwt).effective,constIz=schmertmannIz(zMid,B,L,qNet,sigmaPeak),C1=qNet>0?Math.max(.5,1-.5*baseStress.effective/qNet):1,C2=finite(input.timeYears)&&input.timeYears!>=.1?1+.2*Math.log10(input.timeYears!/.1):1,C3=ratio>=10?1:Math.max(.73,1.03-.03*ratio);if(finite(layer.elasticModulus)&&layer.elasticModulus!>0)immediate=C1*C2*C3*qNet*constIz*thickness/layer.elasticModulus!*1000;else{status='VERİ EKSİK';note=(note?note+' ':'')+'Schmertmann için E modülü gerekir.'}
    }
    totalImmediate+=immediate;totalConsolidation+=consolidation;results.push({layerId:layer.id,order:layer.order,soilName:layer.soilName,soilCode:layer.soilCode,topDepth:top,bottomDepth:bottom,thickness,midDepth,sigmaV0:midStress.total,porePressure:midStress.porePressure,sigmaV0Effective:midStress.effective,deltaSigma,sigmaVFinal:midStress.total+deltaSigma,sigmaVFinalEffective:finalEffective,representativeN60:layer.representativeN60,Es:layer.elasticModulus,poissonRatio:layer.poissonRatio,immediateSettlement:immediate,consolidationSettlement:consolidation,totalSettlement:immediate+consolidation,method:methodName,status,note})
  }
  if(method==='burland-burbidge'){const br=burlandGlobalSettlement(burlandPieces,qNet,B,L,influenceDepth,gwt);if(!br.ok){warnings.push(br.note);results.forEach(r=>{if(isGranular(layers.find(x=>x.id===r.layerId)!)){r.status='VERİ EKSİK';r.note=(r.note?r.note+' ':'')+br.note}})}else{const totalH=burlandPieces.reduce((s,x)=>s+x.thickness,0);for(const r of results){const piece=burlandPieces.find(x=>x.layer.id===r.layerId);if(piece){const share=totalH>0?piece.thickness/totalH:0;r.immediateSettlement=br.value*share;r.totalSettlement=r.immediateSettlement+r.consolidationSettlement}}totalImmediate=br.value+results.reduce((s,x)=>s+x.consolidationSettlement,0)-totalConsolidation;totalConsolidation=results.reduce((s,x)=>s+x.consolidationSettlement,0);warnings.push(br.note)}}
  if(method==='schmertmann'&&input.timeYears==null)warnings.push('Schmertmann C2=1: zaman parametresi girilmedi.')
  if(method==='burland-burbidge')warnings.push('Burland-Burbidge, SPT tabanlı granüler zemin oturması için ampirik bir yöntemdir; kohezyonlu katman katkısı ayrı konsolidasyon hesabından alınır.')
  if(method==='janbu')warnings.push('Janbu sonucu yalnız açıkça girilmiş M/constrained modulus ile hesaplanır; gerilme-bağımlı M bağıntısı burada varsayılmaz.')
  if(!baseStress.complete||results.some(x=>x.status==='VERİ EKSİK'))warnings.push('Sonuçta eksik veri bulunan katmanlar vardır; hesap hazırlıklı değildir.')
  const ready=profile.status==='SABİTLENDİ'&&baseStress.complete&&influenceDepth>0&&zoneStress.complete&&results.length>0&&!results.some(x=>x.status==='VERİ EKSİK')
  return{method,layers:results,totalImmediate,totalConsolidation,totalSettlement:totalImmediate+totalConsolidation,influenceDepth,netFoundationPressure:qNet,foundationEffectiveStress:baseStress.effective,ready,warnings,source:'Burland & Burbidge (1985), Schmertmann et al. (1978), 2:1 gerilme yayılımı ve Janbu M-integrasyonu; her yöntem yalnız kendi gerekli parametreleriyle değerlendirilir.'}
}