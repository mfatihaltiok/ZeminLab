import type { IdealizedSoilLayer, IdealizedSoilProfile } from '../models/idealized-soil-profile'
import type { FoundationType } from '../models/project'

export type IdealizedSettlementMethod='burland-burbidge'|'elasticity'|'2to1-layer'|'janbu'|'schmertmann'
export type BurlandNTrend='constant-increasing'|'decreasing'|'unknown'
type SettlementLayerResult={
  layerId:string;order:number;soilName:string;soilCode:string;topDepth:number;bottomDepth:number;thickness:number;midDepth:number
  sigmaV0:number;porePressure:number;sigmaV0Effective:number;deltaSigma:number;sigmaVFinal:number;sigmaVFinalEffective:number;representativeN60?:number
  Es?:number;poissonRatio?:number;immediateSettlement:number;consolidationSettlement:number;totalSettlement:number;method:string
  status:'HESAPLANDI'|'VERİ EKSİK';note?:string
}
export interface IdealizedSettlementInput{
  profile:IdealizedSoilProfile;method:IdealizedSettlementMethod;B:number;L:number;Df:number;qGross:number;groundwaterDepth?:number
  foundationType?:FoundationType;timeYears?:number;burlandNTrend?:BurlandNTrend;burlandSoftLayerBottomDepth?:number;burlandState?:'NC'|'OC';burlandPreconsolidationPressure?:number
}
export interface IdealizedSettlementResult{
  method:IdealizedSettlementMethod;layers:SettlementLayerResult[];totalImmediate:number;totalConsolidation:number;totalSettlement:number
  influenceDepth:number;netFoundationPressure:number;foundationEffectiveStress:number;ready:boolean;warnings:string[];source:string
}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
function isCohesive(layer:IdealizedSoilLayer){
  const code=(layer.soilCode+' '+layer.soilName).toUpperCase().replace(/İ/g,'I')
  return /(^|[^A-Z])(CI[LHM]|SI[LHM]|CL|CH|ML|MH)([^A-Z]|$)/.test(code)||code.includes('KIL')||code.includes('SILT')||code.includes('CLAY')||code.includes('ORGANIK')||code.includes('TURBA')
}
function isGranular(layer:IdealizedSoilLayer){return !isCohesive(layer)&&(/SA|GR|SAND|KUM|ÇAKIL|CAKIL/i.test(layer.soilCode+' '+layer.soilName))}
function effectiveStressAtDepth(layers:IdealizedSoilLayer[],depth:number,gwt:number){
  let total=0,cursor=0
  for(const layer of [...layers].sort((x,y)=>x.topDepth-y.topDepth)){
    if(layer.bottomDepth<=layer.topDepth)continue
    if(layer.topDepth>cursor+1e-9&&layer.topDepth<depth-1e-9)return{total:NaN,porePressure:NaN,effective:NaN}
    const top=Math.max(layer.topDepth,cursor),bottom=Math.min(depth,layer.bottomDepth)
    if(bottom<=top)continue
    const gamma=finite(layer.gamma)&&layer.gamma!>0?layer.gamma:undefined
    const gammaSat=finite(layer.gammaSat)&&layer.gammaSat!>0?layer.gammaSat:gamma
    if(gamma==null||gammaSat==null)return{total:NaN,porePressure:NaN,effective:NaN}
    const above=gwt>=0?Math.max(0,Math.min(bottom,gwt)-top):bottom-top
    const below=(bottom-top)-above
    total+=above*gamma+below*gammaSat
    cursor=bottom
    if(cursor>=depth-1e-9)break
  }
  if(cursor<depth-1e-9)return{total:NaN,porePressure:NaN,effective:NaN}
  const porePressure=gwt>=0&&depth>gwt?9.80665*(depth-gwt):0
  return{total,porePressure,effective:Math.max(0,total-porePressure)}
}
function stressIncrement(qNet:number,B:number,L:number,z:number){return qNet*B*L/Math.max((B+z)*(L+z),1e-9)}
function overlap(a:number,b:number,c:number,d:number){return Math.max(0,Math.min(b,d)-Math.max(a,c))}
function adjustedBurlandN(layer:IdealizedSoilLayer,midDepth:number,gwt:number){
  if(!finite(layer.representativeN60)||layer.representativeN60<=0)return undefined
  let n=layer.representativeN60
  const code=(layer.soilCode+' '+layer.soilName).toUpperCase().replace(/İ/g,'I')
  const gravelly=(code.includes('GR')||code.includes('CAKIL'))&&(code.includes('SA')||code.includes('KUM'))
  const fineSand=code.includes('SISA')||code.includes('SILTY SAND')||code.includes('SM')||code.includes('CLSA')
  if(gravelly)n*=1.25
  else if(gwt>=0&&midDepth>=gwt&&fineSand&&n>15)n=15+.5*(n-15)
  return n
}
function burlandInfluenceDepth(B:number,trend:BurlandNTrend,softLayerBottomDepth?:number,Df=0){const zi=1.4*Math.pow(B/.3,.75)*.3;if(trend==='decreasing'){if(!finite(softLayerBottomDepth)||softLayerBottomDepth!<=Df)return 2*B;return Math.min(2*B,softLayerBottomDepth!-Df)}return zi}
function burlandSettlementTotal(qNet:number,B:number,L:number,avgN:number,zI: number,state:'NC'|'OC',pc?:number){
  const Br=.3,ratio=L/Math.max(B,1e-9),Cs=Math.pow((1.25*ratio)/(ratio+.25),2),Ic=state==='NC'?1.71/Math.pow(avgN,1.4):.57/Math.pow(avgN,1.4)
  const qb=state==='NC'?.14*(qNet/100)*Br*Math.pow(B/Br,.7):qNet<=((pc??-1))?.047*(qNet/100)*Br*Math.pow(B/Br,.7):.14*Math.max(0,qNet-.67*(pc??0))/100*Br*Math.pow(B/Br,.7)
  return Math.max(0,qb*Cs*Ic*1000)
}
function consolidationSettlement(layer:IdealizedSoilLayer,thickness:number,sigma0:number,sigma1:number){
  if(!finite(layer.compressionIndexCc)||!finite(layer.initialVoidRatio)||layer.initialVoidRatio!<=-1||sigma0<=0||sigma1<=sigma0)return{value:0,ok:false}
  if(layer.consolidationState!=='NC'&&layer.consolidationState!=='OC')return{value:0,ok:false}
  const Cc=layer.compressionIndexCc!,e0=layer.initialVoidRatio!,state=layer.consolidationState
  if(state==='NC')return{value:Math.max(0,thickness*Cc*Math.log10(sigma1/sigma0)/(1+e0)*1000),ok:true}
  if(!finite(layer.recompressionIndexCr)||layer.recompressionIndexCr!<0||!finite(layer.preconsolidationPressure)||layer.preconsolidationPressure!<=sigma0)return{value:0,ok:false}
  const Cr=layer.recompressionIndexCr!,pc=layer.preconsolidationPressure!
  const strain=sigma1<=pc?Cr*Math.log10(sigma1/sigma0):Cr*Math.log10(pc/sigma0)+Cc*Math.log10(sigma1/pc)
  return{value:Math.max(0,thickness*strain/(1+e0)*1000),ok:true}
}
function schmertmannIz(z:number,B:number,L:number,qNet:number,sigmaPeak:number,forceStrip:boolean){
  const ratio=forceStrip?10:Math.max(1,Math.min(10,L/Math.max(B,1e-9))),lambda=(ratio-1)/9,zPeak=B*(.5+.5*lambda),zBottom=B*(2+2*lambda),iz0=.1+.1*lambda,izPeak=Math.min(1,.5+.1*Math.sqrt(Math.max(qNet,0)/Math.max(sigmaPeak,1e-6)))
  if(z<0||z>=zBottom)return 0
  return z<=zPeak?iz0+(izPeak-iz0)*z/Math.max(zPeak,1e-9):izPeak*(1-z/zBottom)
}
function janbuStrain(sigma0:number,sigma1:number,m:number,a:number,referenceStress=100){
  if(sigma1<=sigma0||m<=0||referenceStress<=0)return 0
  if(a===0)return Math.log(sigma1/Math.max(sigma0,1e-9))/m
  return (Math.pow(sigma1,a)-Math.pow(Math.max(sigma0,0),a))/(m*a*Math.pow(referenceStress,a))
}
export function calculateIdealizedSettlement(input:IdealizedSettlementInput):IdealizedSettlementResult{
  const {profile,method,B,L,Df,qGross}=input,warnings:string[]=[]
  const layers=[...profile.layers].sort((a,b)=>a.topDepth-b.topDepth)
  if(profile.status!=='SABİTLENDİ')warnings.push('İdealize Zemin Profili SABİTLENDİ durumunda değil.')
  if(profile.parameterUnitSystem!=='kN-m')warnings.push('Profil mühendislik birimleri kN-m taban sisteminde değil; sonuç üretilmedi.')
  if(B<=0||L<=0||Df<0||qGross<=0)return{method,layers:[],totalImmediate:0,totalConsolidation:0,totalSettlement:0,influenceDepth:0,netFoundationPressure:0,foundationEffectiveStress:0,ready:false,warnings:[...warnings,'Temel B, L, Df ve pozitif yük girdileri geçerli olmalıdır.'],source:'FALUZMN ortak oturma motoru'}
  const gwt=finite(input.groundwaterDepth)?input.groundwaterDepth!:NaN
  if(!finite(gwt))return{method,layers:[],totalImmediate:0,totalConsolidation:0,totalSettlement:0,influenceDepth:0,netFoundationPressure:0,foundationEffectiveStress:0,ready:false,warnings:[...warnings,'YASS girilmeden efektif gerilme/oturma hesabı yapılamaz.'],source:'FALUZMN ortak oturma motoru'}
  const baseStress=effectiveStressAtDepth(layers,Df,gwt)
  if(!finite(baseStress.effective))return{method,layers:[],totalImmediate:0,totalConsolidation:0,totalSettlement:0,influenceDepth:0,netFoundationPressure:0,foundationEffectiveStress:0,ready:false,warnings:[...warnings,'Df seviyesine kadar γ/γsat profili eksik veya geçersiz.'],source:'FALUZMN ortak oturma motoru'}
  const qNet=Math.max(0,qGross-baseStress.effective)
  const ratio=L/Math.max(B,1e-9)
  const influenceDepth=method==='burland-burbidge'?burlandInfluenceDepth(B,input.burlandNTrend??'unknown',input.burlandSoftLayerBottomDepth,input.Df):method==='schmertmann'?(input.foundationType==='surekli'?4*B:(ratio>=10?4*B:2*B)):method==='janbu'?Math.max(2*B,1):2*B
  if(qNet<=0)warnings.push('Temel seviyesinde net ilave basınç sıfır/negatif; seçilen yöntem yük artışı açısından hesaplanamaz.')
  let totalImmediate=0,totalConsolidation=0
  const results:SettlementLayerResult[]=[]
  const relevant=layers.map((layer,index)=>{const top=Math.max(layer.topDepth,Df),bottom=layer.bottomDepth,h=overlap(top,bottom,Df,Df+influenceDepth);return{layer,index,top,bottom,h}}).filter(x=>x.h>0)
  let methodReady=true
  let globalBurlandSettlement=0
  if(method==='burland-burbidge'){
    if(input.burlandNTrend==='unknown'||!input.burlandNTrend)warnings.push('Burland-Burbidge için N60 derinlik eğilimi (sabit/artan veya azalan) seçilmelidir.');methodReady=false
    if(input.burlandState!=='NC'&&input.burlandState!=='OC'){warnings.push('Burland-Burbidge için zemin konsolidasyon durumu NC veya OC seçilmelidir.');methodReady=false}
    if(input.burlandState==='OC'&&(!finite(input.burlandPreconsolidationPressure)||input.burlandPreconsolidationPressure!<=0)){warnings.push('Burland OC hesabı için σ′c girilmelidir.');methodReady=false}
    const zone=layers.map(layer=>{const h=overlap(layer.topDepth,layer.bottomDepth,Df,Df+influenceDepth);return{layer,h}}).filter(x=>x.h>0)
    if(!zone.length||zone.some(x=>!isGranular(x.layer))){warnings.push('Burland-Burbidge yalnız granüler zemin zonu için uygulanır; etki zonunda kohezyonlu/organik tabaka bulunduğundan hesap durduruldu.');methodReady=false}
    const nValues=zone.map(x=>{const mid=(Math.max(x.layer.topDepth,Df)+Math.min(x.layer.bottomDepth,Df+influenceDepth))/2;return adjustedBurlandN(x.layer,mid,gwt)});if(nValues.some(n=>n==null||n<=0)){warnings.push('Burland-Burbidge için etki zonundaki SPT temsilcilerinin N60 değerleri gerekir.');methodReady=false}
    const avgN=nValues.length>0?nValues.reduce((s,n)=>s+(n??0),0)/nValues.length:0
    if(methodReady&&qNet>0)globalBurlandSettlement=burlandSettlementTotal(qNet,B,L,avgN,input.burlandState!,influenceDepth)
  }
  for(const {layer,index,top,bottom,h} of relevant){
    const zTop=top-Df,zBottom=bottom-Df,zMid=(zTop+zBottom)/2,midDepth=Df+zMid,midStress=effectiveStressAtDepth(layers,midDepth,gwt)
    if(!finite(midStress.effective)){methodReady=false;results.push({layerId:layer.id,order:layer.order,soilName:layer.soilName,soilCode:layer.soilCode,topDepth:top,bottomDepth:bottom,thickness:h,midDepth,sigmaV0:0,porePressure:0,sigmaV0Effective:0,deltaSigma:0,sigmaVFinal:0,sigmaVFinalEffective:0,immediateSettlement:0,consolidationSettlement:0,totalSettlement:0,method:'VERİ EKSİK',status:'VERİ EKSİK',note:'Efektif gerilme profili eksik.'});continue}
    const deltaSigma=Math.max(0,stressIncrement(qNet,B,L,zMid)),finalEffective=midStress.effective+deltaSigma,cohesive=isCohesive(layer)
    let immediate=0,consolidation=0,status:'HESAPLANDI'|'VERİ EKSİK'='HESAPLANDI',methodName='',note=''
    if(method==='burland-burbidge'){
      methodName='Burland & Burbidge (1985)'
      if(methodReady&&qNet>0&&isGranular(layer)){const zoneH=relevant.reduce((s,x)=>s+(isGranular(x.layer)?x.h:0),0);immediate=globalBurlandSettlement*(zoneH>0?h/zoneH:0)}
      else{status='VERİ EKSİK';note='Etki zonu koşulları ve N60 değerlendirmesi tamamlanmadı.'}
    }else if(method==='elasticity'){
      methodName='Elastik tabaka gerinimi'
      if(finite(layer.elasticModulus)&&layer.elasticModulus!>0&&finite(layer.poissonRatio)&&layer.poissonRatio!>=0&&layer.poissonRatio!<.5){const nu=layer.poissonRatio!;immediate=deltaSigma*h*(1-nu*nu)/layer.elasticModulus!*1000}else{status='VERİ EKSİK';note='Young modülü Es ve Poisson ν birlikte gerekir.'}
      else{status='VERİ EKSİK';note:'Young modülü Es gerekir.'}
      if(cohesive){const c=consolidationSettlement(layer,h,midStress.effective,finalEffective);if(c.ok)consolidation=c.value;else status='VERİ EKSİK'}
    }else if(method==='2to1-layer'){
      methodName='2:1 gerilme yayılımı + M'
      if(finite(layer.constrainedModulus)&&layer.constrainedModulus!>0)immediate=deltaSigma*h/layer.constrainedModulus!*1000
      else{status='VERİ EKSİK';note:'M (constrained/oedometer modulus) gerekir.'}
    }else if(method==='janbu'){
      methodName='Janbu tangent modulus'
      const a=layer.janbuStressExponent,m=layer.janbuModulusNumber
      if(finite(a)&&a!>=0&&a!<=1&&finite(m)&&m!>0)immediate=janbuStrain(midStress.effective,finalEffective,m!,a!,100)*h*1000
      else{status='VERİ EKSİK';note:'Janbu için m ve a gerekir; örtülü değer kullanılmaz.'}
    }else{
      methodName='Schmertmann et al. (1978)'
      if(!isGranular(layer)){status='VERİ EKSİK';note:'Schmertmann kum/granüler zemin içindir.'}
      else if(!finite(layer.elasticModulus)||layer.elasticModulus!<=0){status='VERİ EKSİK';note:'Schmertmann için Es gerekir.'}
      else if(!finite(input.timeYears)||input.timeYears!<.1){status='VERİ EKSİK';note:'C2 için timeYears ≥ 0.1 yıl girilmelidir.'}
      else{
        const peakDepth=input.foundationType==='surekli'?B:ratio>=10?B:.5*B,sigmaPeak=effectiveStressAtDepth(layers,Df+peakDepth,gwt).effective
        if(!finite(sigmaPeak)){status='VERİ EKSİK';note='Schmertmann için tepe etki derinliğine kadar efektif gerilme profili tamamlanmalıdır.'} else {
        const Iz=schmertmannIz(zMid,B,L,qNet,sigmaPeak,input.foundationType==='surekli'),C1=Math.max(.5,1-.5*baseStress.effective/Math.max(qNet,1e-9)),C2=1+.2*Math.log10(10*input.timeYears!)
        immediate=C1*C2*qNet*Iz*h/layer.elasticModulus!*1000
        }
      }
    }
    totalImmediate+=immediate;totalConsolidation+=consolidation
    results.push({layerId:layer.id,order:layer.order,soilName:layer.soilName,soilCode:layer.soilCode,topDepth:top,bottomDepth:bottom,thickness:h,midDepth,sigmaV0:midStress.total,porePressure:midStress.porePressure,sigmaV0Effective:midStress.effective,deltaSigma,sigmaVFinal:midStress.total+deltaSigma,sigmaVFinalEffective:finalEffective,representativeN60:layer.representativeN60,Es:layer.elasticModulus,poissonRatio:layer.poissonRatio,immediateSettlement:immediate,consolidationSettlement:consolidation,totalSettlement:immediate+consolidation,method:methodName,status,note})
  }
  const profileBottom=layers.reduce((m,x)=>Math.max(m,x.bottomDepth),0)
  if(profileBottom<Df+influenceDepth-1e-9){warnings.push('Profil, seçilen yöntemin etki derinliğinin altına kadar kesintisiz tanımlanmalıdır.');methodReady=false}
  if(results.length===0)methodReady=false
  if(results.some(x=>x.status==='VERİ EKSİK'))methodReady=false
  if(method==='burland-burbidge')warnings.push('Burland-Burbidge granüler zemin için ampirik oturma yöntemidir; N60 etki zonu ortalaması ve NC/OC durumu açık girdidir.')
  if(method==='elasticity')warnings.push('Elastik yöntem Young modülü Es ile 2:1 gerilme artışını birleştirir; tam 3B elastik yarı-uzay çözümü değildir.')
  if(method==='2to1-layer')warnings.push('2:1 + M yöntemi tek boyutlu sıkışma gerinimini M ile entegre eder; E_s kullanılmaz.')
  if(method==='janbu')warnings.push('Janbu sonucu yalnız açık m ve a girdileriyle üretilir; otomatik m/a korelasyonu yapılmaz.')
  if(method==='schmertmann')warnings.push('Schmertmann granüler zemin içindir; C1 ve C2 açıkça hesaplanır.')
  return{method,layers:results,totalImmediate,totalConsolidation,totalSettlement:totalImmediate+totalConsolidation,influenceDepth,netFoundationPressure:qNet,foundationEffectiveStress:baseStress.effective,ready:methodReady&&results.length>0,warnings,source:'Burland & Burbidge (1985), Schmertmann et al. (1978) ve Janbu (1967) tangent modulus; yöntem kapsamları ayrı tutulur.'}
}
