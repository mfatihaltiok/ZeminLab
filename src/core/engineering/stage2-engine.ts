export type Stage2BearingMethod = 'Terzaghi' | 'Meyerhof' | 'Hansen' | 'Vesic'

export interface Stage2Step { symbol:string; title:string; formula:string; value?:number; unit?:string; source?:string; note?:string }
export interface Stage2Result<T> { value:T; steps:Stage2Step[]; method:string; source:string; warnings:string[] }
const rad=(deg:number)=>deg*Math.PI/180
const finitePositive=(v:number,fallback=0)=>Number.isFinite(v)?Math.max(v,fallback):fallback

export interface Stage2BearingInput { B:number; L:number; Df:number; gamma:number; c:number; phi:number; FS?:number; method:Stage2BearingMethod; waterTableDepth?:number; surcharge?:number; loadV?:number; loadH?:number; momentX?:number; momentY?:number }

function bearingFactors(phiDeg:number){
 const phi=Math.max(0,Math.min(phiDeg,89)); const t=Math.tan(rad(phi));
 const Nq=Math.exp(Math.PI*t)*Math.pow(Math.tan(rad(45+phi/2)),2);
 const Nc=phi<1e-8?5.14:(Nq-1)/t;
 const NgammaV=2*(Nq+1)*t;
 const NgammaM=(Nq-1)*Math.tan(rad(1.4*phi));
 return{phi,t,Nq,Nc,NgammaV,NgammaM}
}
function waterGamma(i:Stage2BearingInput){
 if(i.waterTableDepth==null||!Number.isFinite(i.waterTableDepth))return{gamma:i.gamma,note:'Yeraltı su seviyesi tanımlı değil.'};
 const z=i.waterTableDepth;
 if(z<=i.Df)return{gamma:i.gamma,note:'Su seviyesi temel tabanı seviyesinde/üstünde. Efektif gerilme ayrıca değerlendirilmelidir.'};
 if(z>=i.Df+i.B)return{gamma:i.gamma,note:'Su seviyesi temel tabanından B kadar aşağıda veya daha derinde.'};
 return{gamma:i.gamma,note:'Su seviyesi temel tabanı ile B derinliği arasında. γ için doğrudan doğrusal azaltma yapılmadı; etkin gerilme hesabı ayrıca ele alınmalıdır.'}
}

export function stage2BearingCapacity(i:Stage2BearingInput):Stage2Result<any>{
 const B=finitePositive(i.B,.01),L=finitePositive(i.L,B),Df=finitePositive(i.Df),c=finitePositive(i.c); const f=bearingFactors(i.phi); const V=Math.max(Math.abs(i.loadV??0),1e-9);
 const ex=(i.momentY??0)/V,ey=(i.momentX??0)/V; const Be=Math.max(B-2*Math.abs(ex),B*.01),Le=Math.max(L-2*Math.abs(ey),L*.01);
 const ratio=Math.min(Be,Le)/Math.max(Be,Le); const phi=f.phi,t=f.t;
 const Ngamma=i.method==='Meyerhof'?f.NgammaM:f.NgammaV;
 const sc=i.method==='Terzaghi'?1:1+(f.Nq/f.Nc)*ratio;
 const sq=i.method==='Terzaghi'?1:1+t*ratio;
 const sgamma=i.method==='Terzaghi'?1:Math.max(.6,1-.4*ratio);
 const dr=Df/Math.max(Math.min(Be,Le),1e-9);
 const dc=i.method==='Terzaghi'?1:1+.4*dr;
 const dq=i.method==='Terzaghi'?1:1+2*dr*t*Math.pow(1-Math.sin(rad(phi)),2);
 const dgamma=1;
 const H=Math.abs(i.loadH??0),m=(2+ratio)/(1+ratio),common=Math.max(0,1-H/V);
 const ic=phi===0?1:Math.max(0,1-H/Math.max(Be*Le*c*f.Nc,1e-9));
 const iq=phi===0?1:Math.pow(common,m),igamma=phi===0?1:Math.pow(common,m+1);
 const wg=waterGamma(i),q=finitePositive(i.surcharge,Math.max(wg.gamma,0)*Df);
 const ultimate=c*f.Nc*sc*dc*ic+q*f.Nq*sq*dq*iq+.5*wg.gamma*Math.min(Be,Le)*Ngamma*sgamma*dgamma*igamma;
 const netUltimate=ultimate-q,FS=Math.max(finitePositive(i.FS,3),1);
 const warnings:string[]=[];
 if(Math.abs(ex)>=B/6||Math.abs(ey)>=L/6)warnings.push('Eksantriklik çekirdek dışına taşıyor; etkin alan yaklaşımı ayrıca kontrol edilmelidir.');
 if(H>=V)warnings.push('Yatay yük düşey yüke eşit/büyük; yük eğikliği bağıntısı sınır durumundadır.');
 if(phi>45)warnings.push('φ > 45°: bağıntıların uygulanabilirliği kaynak ve zemin koşullarıyla doğrulanmalıdır.');
 return{value:{Nq:f.Nq,Nc:f.Nc,Ngamma,sc,sq,sgamma,dc,dq,dgamma,ic,iq,igamma,ultimate,netUltimate,allowableGross:ultimate/FS,allowableNet:netUltimate/FS,qSurcharge:q,BEffective:Be,LEffective:Le,ex,ey},method:i.method,source:'Terzaghi/Meyerhof/Hansen/Vesic klasik taşıma gücü bağıntıları. TBDY 2018 16.8.3.2 uygulaması ayrıca ulusal yönetmelik koşullarıyla doğrulanmalıdır.',warnings,steps:[
 {symbol:'Nq',title:'Taşıma gücü katsayısı',formula:'Nq=exp(πtanφ)·tan²(45°+φ/2)',value:f.Nq,source:'Klasik sığ temel taşıma gücü bağıntısı'},
 {symbol:'Nc',title:'Kohezyon katsayısı',formula:'Nc=(Nq−1)/tanφ; φ=0 için Nc=5.14',value:f.Nc},
 {symbol:'Nγ',title:'Birim hacim ağırlığı katsayısı',formula:'Seçilen yöntemin Nγ bağıntısı',value:Ngamma,source:i.method},
 {symbol:'e',title:'Eksantriklik',formula:'eₓ=Mᵧ/V, eᵧ=Mₓ/V',value:Math.max(Math.abs(ex),Math.abs(ey)),unit:'m'},
 {symbol:'B′,L′',title:'Etkin boyutlar',formula:'B′=B−2|eₓ|, L′=L−2|eᵧ|',value:Math.min(Be,Le),unit:'m'},
 {symbol:'qᵤ',title:'Nihai taşıma gücü',formula:'cNcscdcic + qNqsqdqiq + 0.5γB′Nγsγdγiγ',value:ultimate,unit:'kPa'},
 {symbol:'qallow',title:'İzin verilen brüt taşıma gücü',formula:'qallow=qᵤ/FS',value:ultimate/FS,unit:'kPa'} ]}
}

export interface Stage2SettlementLayer { thickness:number; sigmaV0:number; deltaSigma:number; Es?:number; nu?:number; Cc?:number; e0?:number; Cr?:number; sigmaPc?:number; mv?:number }
export interface Stage2SettlementInput { B:number; q:number; layers:Stage2SettlementLayer[]; method?:'elastic'|'2:1'|'janbu'|'schmertmann'|'consolidation' }

function settlementDelta21(q:number,B:number,zTop:number,zBottom:number){
 const L=B; const z1=Math.max(zTop,0),z2=Math.max(zBottom,z1); const avg=(z1+z2)/2;
 return q*B*L/Math.max((B+avg)*(L+avg),1e-9)
}

export function stage2Settlement(i:Stage2SettlementInput):Stage2Result<any>{
 const B=finitePositive(i.B,.01),q=finitePositive(i.q),method=i.method??'elastic'; let immediate=0,consolidation=0,depth=0;
 const layerResults:any[]=[];
 i.layers.forEach((layer,index)=>{const H=finitePositive(layer.thickness),sigma0=Math.max(finitePositive(layer.sigmaV0),1e-6);let ds=Math.max(finitePositive(layer.deltaSigma),0);const top=depth,bottom=depth+H; if(method==='2:1')ds=settlementDelta21(q,B,top,bottom);let s=0;
 if((method==='elastic'||method==='2:1')&&layer.Es){const nu=Math.min(Math.max(layer.nu??.3,0),.49);s=ds*H*(1-nu*nu)/Math.max(layer.Es,1e-9);immediate+=s}
 else if(method==='janbu'&&layer.Es){s=ds*H/Math.max(layer.Es,1e-9);immediate+=s}
 else if(method==='schmertmann'&&layer.Es){const Iz=Math.max(0,.5*(1-Math.min(1,top/(2*B))));s=ds*Iz*H/Math.max(layer.Es,1e-9);immediate+=s}
 else if(method==='consolidation'&&layer.Cc!=null&&layer.e0!=null){const pc=Math.max(layer.sigmaPc??sigma0,sigma0),final=sigma0+ds,Cr=layer.Cr??layer.Cc;if(final<=pc)s=H*Cr/(1+layer.e0)*Math.log10(Math.max(final/sigma0,1));else{s=H*Cr/(1+layer.e0)*Math.log10(Math.max(pc/sigma0,1))+H*layer.Cc/(1+layer.e0)*Math.log10(Math.max(final/pc,1))}consolidation+=s}
 layerResults.push({index,top,bottom,deltaSigma:ds,settlement:s});depth=bottom});
 const warnings:string[]=[]; if(!i.layers.length)warnings.push('Katman tanımlanmadığı için oturma hesabı üretilemedi.'); if(i.layers.some(x=>x.sigmaV0<=0))warnings.push('Başlangıç efektif gerilmesi sıfır/negatif katmanlar var.');
 return{value:{immediate,consolidation,total:immediate+consolidation,layerResults},method,source:'Katman bazlı elastik, 2:1, Janbu, Schmertmann ve konsolidasyon hesapları. Yöntem katsayıları ve varsayımlar hesap izinde tutulur.',warnings,steps:[{symbol:'Δσ',title:'Gerilme artışı',formula:method==='2:1'?'Δσ=qBL/[(B+z)(L+z)]':'Katman girdisinden alınır',value:i.layers.reduce((s,x)=>s+Math.max(x.deltaSigma,0),0),unit:'kPa'},{symbol:'sᵢ',title:'Anlık oturma',formula:'Seçilen yöntemin katman toplamı',value:immediate,unit:'m'},{symbol:'s꜀',title:'Konsolidasyon',formula:'Cc/Cr ve gerilme oranları',value:consolidation,unit:'m'},{symbol:'sₜ',title:'Toplam oturma',formula:'sₜ=sᵢ+s꜀',value:immediate+consolidation,unit:'m'}]}
}
