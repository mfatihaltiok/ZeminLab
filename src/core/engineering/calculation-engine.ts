export type BearingMethod = 'Terzaghi' | 'Meyerhof' | 'Hansen' | 'Vesic'
export interface CalculationStep { symbol: string; title: string; formula: string; value?: number; unit?: string; note?: string }
export interface CalculationResult<T> { value: T; steps: CalculationStep[]; method: string; source: string }
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))
const rad=(x:number)=>x*Math.PI/180

export interface BearingInput { B:number; L:number; Df:number; gamma:number; c:number; phi:number; FS:number; method:BearingMethod; waterReduction?:number }
export function bearingCapacity(i:BearingInput): CalculationResult<{Nq:number;Nc:number;Ngamma:number;sc:number;sq:number;sg:number;ultimate:number;netUltimate:number;allowableGross:number;allowableNet:number}> {
  const p=rad(i.phi),t=Math.tan(p),Nq=Math.exp(Math.PI*t)*Math.tan(Math.PI/4+p/2)**2,Nc=Math.abs(i.phi)<1e-8?5.14:(Nq-1)/t
  const Ng=i.method==='Terzaghi'?2*(Nq+1)*t:i.method==='Meyerhof'?1.5*(Nq-1)*t:2*(Nq+1)*t
  const r=i.B/Math.max(i.L,i.B),sc=i.method==='Terzaghi'?1:1+.2*r,sq=i.method==='Terzaghi'?1:1+.1*r,sg=i.method==='Terzaghi'?1:Math.max(.6,1-.4*r)
  const q=i.c*Nc*sc+i.gamma*i.Df*Nq*sq+.5*i.gamma*i.B*Ng*sg*(i.waterReduction??1)
  const value={Nq,Nc,Ngamma:Ng,sc,sq,sg,ultimate:q,netUltimate:q-i.gamma*i.Df,allowableGross:q/i.FS,allowableNet:(q-i.gamma*i.Df)/i.FS}
  return {value,method:i.method,source:'Terzaghi / Meyerhof / Hansen / Vesic bearing-capacity formulation; selected method is retained in the trace.',steps:[
    {symbol:'Nq',title:'Taşıma gücü katsayısı',formula:'Nq = e^(π tanφ) · tan²(45° + φ/2)',value:Nq},
    {symbol:'Nc',title:'Kohezyon katsayısı',formula:'Nc = (Nq − 1) / tanφ',value:Nc},
    {symbol:'Nγ',title:'Birim hacim ağırlık katsayısı',formula:'Nγ = f(method, φ)',value:Ng},
    {symbol:'qᵤ',title:'Nihai taşıma gücü',formula:'qᵤ = cNcsc + γDfNqsq + 0.5γBNγsγ',value:q},
    {symbol:'qₙ,allow',title:'İzin verilen net değer',formula:'qₙ,allow = (qᵤ − γDf) / FS',value:value.allowableNet}
  ]}
}

export interface TbdyBearingInput{B:number;L:number;Df:number;gamma1:number;gamma2:number;c:number;phi:number;verticalLoad:number;horizontalLoad:number;momentX:number;momentY:number;groundSlope:number;baseSlope:number;resistanceFactor:number}
export function tbdyBearingCapacity(i:TbdyBearingInput): CalculationResult<{Nq:number;Nc:number;Ngamma:number;ex:number;ey:number;Be:number;Le:number;qk:number;qt:number;qo:number;utilization:number;adequate:boolean}> {
  const phi=clamp(i.phi,0,89.9),t=Math.tan(rad(phi)),s=Math.sin(rad(phi)),Nq=Math.exp(Math.PI*t)*Math.tan(Math.PI/4+rad(phi)/2)**2,Nc=phi<1e-8?5.14:(Nq-1)/t,Ngamma=2*(Nq-1)*t
  const P=Math.max(i.verticalLoad,1e-9),V=Math.abs(i.horizontalLoad),A=Math.max(i.B*i.L,1e-9),ex=i.momentY/P,ey=i.momentX/P,Be=Math.max(i.B-2*Math.abs(ex),0),Le=Math.max(i.L-2*Math.abs(ey),0),B=Math.min(Be,Le),L=Math.max(Be,Le),ratio=L>0?B/L:0
  const sc=1+ratio*(Nq/Math.max(Nc,1e-9)),sq=1+ratio*t,sg=Math.max(0,1-.4*ratio),k=Math.atan2(i.Df,Math.max(i.B,1e-9)),dc=1+.4*k,dq=1+2*k*t*(1-s)**2,dg=1,loadAngle=V/P,m=(2+ratio)/(1+ratio),common=Math.max(0,1-loadAngle),ic=phi<1e-8?1:Math.max(0,1-V/(A*Math.max(i.c*Nc,1e-9))),iq=phi<1e-8?1:Math.max(0,common**m),ig=phi<1e-8?1:Math.max(0,common**(m+1))
  const beta=rad(Math.abs(i.groundSlope)),gq=Math.max(0,(1-Math.tan(beta)**2)**2),gc=Math.max(0,1-Math.abs(i.groundSlope)/147),gg=gc,eta=rad(Math.abs(i.baseSlope)),bq=Math.max(0,(1-Math.tan(eta)*t)**2),bc=Math.max(0,1-Math.abs(i.baseSlope)/147),bg=bq,surcharge=Math.max(0,i.Df*i.gamma1)
  const qk=i.c*Nc*sc*dc*ic*gc*bc+surcharge*Nq*sq*dq*iq*gq*bq+.5*i.gamma2*B*Ngamma*sg*dg*ig*gg*bg,qt=qk/Math.max(i.resistanceFactor,1e-9),qo=P/Math.max(Be*Le,1e-9)
  const value={Nq,Nc,Ngamma,ex,ey,Be,Le,qk,qt,qo,utilization:qo/Math.max(qt,1e-9),adequate:qo<=qt}
  return {value,method:'TBDY 2018 yüzeysel temel taşıma gücü',source:'TBDY 2018 Bölüm 16.8.3.2 / Denklem 16.8; katsayılar ve tasarım dayanımı raporda açıkça gösterilir.',steps:[{symbol:'eₓ',title:'Yük eksantrikliği',formula:'eₓ = Mᵧ / N',value:ex,unit:'m'},{symbol:'eᵧ',title:'Yük eksantrikliği',formula:'eᵧ = Mₓ / N',value:ey,unit:'m'},{symbol:'Bₑ,Lₑ',title:'Etkin temel boyutları',formula:'Bₑ=B−2|eₓ| ; Lₑ=L−2|eᵧ|',value:Math.min(Be,Le),unit:'m'},{symbol:'qₖ',title:'Karakteristik taşıma gücü',formula:'Denklem 16.8',value:qk},{symbol:'qₜ',title:'Tasarım taşıma gücü',formula:'qₜ = qₖ / γRv',value:qt},{symbol:'q₀',title:'Temel tabanındaki tasarım etkisi',formula:'q₀ = N / (BₑLₑ)',value:qo},{symbol:'η',title:'Kullanım oranı',formula:'η = q₀ / qₜ',value:value.utilization}]}
}

export interface SettlementInput { B:number; q:number; Es:number; nu:number; layers?:{thickness:number;Cc?:number;e0?:number;sigma0?:number;dSigma?:number}[] }
export function settlement(i:SettlementInput): CalculationResult<{immediate:number;consolidation:number;total:number}> {
  const immediate=i.q*i.B*(1-i.nu*i.nu)/Math.max(i.Es,1),consolidation=(i.layers??[]).reduce((s,l)=>l.Cc!=null&&l.e0!=null&&l.sigma0!=null&&l.dSigma!=null?s+l.thickness*l.Cc/(1+l.e0)*Math.log10((l.sigma0+l.dSigma)/Math.max(l.sigma0,.01)):s,0)
  const value={immediate,consolidation,total:immediate+consolidation}
  return {value,method:'Elastik + konsolidasyon',source:'Settlement method is selected from supplied soil parameters/correlations; missing parameters must retain their correlation provenance.',steps:[{symbol:'sᵢ',title:'Elastik oturma',formula:'sᵢ = q·B·(1−ν²) / Eₛ',value:immediate,unit:'m'},{symbol:'s꜀',title:'Konsolidasyon oturması',formula:'Σ H·Cc/(1+e₀)·log₁₀[(σ′₀+Δσ′)/σ′₀]',value:consolidation,unit:'m'},{symbol:'sₜ',title:'Toplam oturma',formula:'sₜ = sᵢ + s꜀',value:value.total,unit:'m'}]}
}

export interface LiquefactionInput { Mw:number; Sds:number; depth:number; N160f:number; sigmaV:number; sigmaVPrime:number }
export function liquefaction(i:LiquefactionInput): CalculationResult<{rd:number;CRRM75:number;CM:number;Rtau:number;tau:number;ratio:number;safe:boolean}> {
  const z=i.depth,rd=z<=9.15?1-.00765*z:z<=23?1.174-.0267*z:z<=30?.744-.008*z:.5,CRRM75=1/(34-i.N160f)+i.N160f/135+50/(10*i.N160f+45)**2-1/200,CM=10**(2.24/i.Mw**2.56),Rtau=CRRM75*CM*i.sigmaVPrime,tau=.65*i.sigmaV*(i.Sds/.4)*rd,ratio=Rtau/Math.max(tau,.0001),value={rd,CRRM75,CM,Rtau,tau,ratio,safe:Rtau>=1.1*tau}
  return {value,method:'Ön değerlendirme – SPT tabanlı basitleştirilmiş yaklaşım',source:'TBDY 2018 Bölüm 16.6 çerçevesi. Bu fonksiyon nihai yönetmelik uygulaması olarak etiketlenmez; yöntem katsayıları ayrıca doğrulanacaktır.',steps:[{symbol:'rᵈ',title:'Derinlik azaltma katsayısı',formula:'rᵈ = f(z)',value:rd},{symbol:'CRR',title:'Sıvılaşma direnci oranı',formula:'CRR = f[(N₁)₆₀, M)',value:CRRM75},{symbol:'τ',title:'Deprem kayma gerilmesi',formula:'τ = 0.65·σv·(SDS/0.4)·rᵈ',value:tau},{symbol:'FS',title:'Direnç / talep oranı',formula:'FS = CRR / CSR',value:ratio}]}
}

export interface FoundationInput { B:number; L:number; N:number; V:number; Mx:number; My:number; delta?:number; cu?:number; area?:number }
export function foundationChecks(i:FoundationInput){const ex=i.My/Math.max(Math.abs(i.N),1e-9),ey=i.Mx/Math.max(Math.abs(i.N),1e-9),qAvg=i.N/(i.B*i.L),qMax=qAvg*(1+6*Math.abs(ex)/i.L+6*Math.abs(ey)/i.B),qMin=qAvg*(1-6*Math.abs(ex)/i.L-6*Math.abs(ey)/i.B),delta=i.delta??0,resistance=Math.max(0,i.N)*Math.tan(delta)+(i.cu??0)*(i.area??i.B*i.L);return{value:{ex,ey,qAvg,qMax,qMin,contactRatio:qMin>=0?1:Math.max(0,1-6*Math.abs(ex)/i.L)*Math.max(0,1-6*Math.abs(ey)/i.B),slidingFS:Math.abs(i.V)>0?resistance/Math.abs(i.V):Infinity},steps:[{symbol:'eₓ',title:'Eksantriklik',formula:'eₓ = Mᵧ / N',value:ex,unit:'m'},{symbol:'eᵧ',title:'Eksantriklik',formula:'eᵧ = Mₓ / N',value:ey,unit:'m'},{symbol:'q̄',title:'Ortalama taban gerilmesi',formula:'q̄ = N/(B·L)',value:qAvg},{symbol:'qmax',title:'Maksimum taban gerilmesi',formula:'qmax = q̄(1+6eₓ/L+6eᵧ/B)',value:qMax},{symbol:'qmin',title:'Minimum taban gerilmesi',formula:'qmin = q̄(1−6eₓ/L−6eᵧ/B)',value:qMin}],method:'Temel gerilme / eksantriklik kontrolü',source:'TBDY 2018 Bölüm 16.7–16.8 temel tasarım kontrolleri.'}}
}

export function jetGrout(i:{columnDiameter:number;spacing:number;qultSoil:number;qultColumn:number;improvementFactor:number;FS:number;columnStrength:number}){const Ac=Math.PI*i.columnDiameter**2/4,ratio=Math.min(1,Ac/(i.spacing*i.spacing)),composite=(1-ratio)*i.qultSoil+ratio*i.qultColumn*i.improvementFactor;return{value:{Ac,ratio,composite,allowable:composite/i.FS,columnLoad:Ac*i.columnStrength/i.FS},steps:[{symbol:'A꜀',title:'Kolon alanı',formula:'A꜀ = πd²/4',value:Ac,unit:'m²'},{symbol:'ρ',title:'İyileştirme oranı',formula:'ρ = A꜀/s²',value:ratio},{symbol:'qcomp',title:'Kompozit model',formula:'(1−ρ)qsoil + ρ·qcolumn·η',value:composite},{symbol:'qallow',title:'İzin verilen değer',formula:'qallow = qcomp/FS',value:composite/i.FS}],method:'Jet Grout kompozit ön model',source:'TBDY 2018 Bölüm 16 / Ek 16D; proje deneyleri ile doğrulama gerekir.'}}
}

export function stressAtDepth(depth:number,layers:{top:number;bottom:number;gamma:number;gammaSat:number}[],gwt:number){let sigmaV=0,u=Math.max(0,depth-gwt)*9.80665;for(const l of [...layers].sort((a,b)=>a.top-b.top)){const z0=Math.max(l.top,0),z1=Math.min(l.bottom,depth);if(z1<=z0)continue;const above=Math.max(0,Math.min(z1,gwt)-z0),below=z1-z0-above;sigmaV+=above*l.gamma+below*l.gammaSat}return{sigmaV,sigmaVPrime:Math.max(.01,sigmaV-u),u}}

export const SOURCE_NOTES={investigation:'TBDY 2018 Bölüm 16.2–16.3: zemin araştırmaları ve zemin parametrelerinin belirlenmesi.',liquefaction:'TBDY 2018 Bölüm 16.6: deprem etkisi altında zeminin sıvılaşma riskinin değerlendirilmesi.',bearing:'TBDY 2018 Bölüm 16.8.3.2 / Denklem 16.8: yüzeysel temeller için taşıma gücü.',settlement:'TBDY 2018 Bölüm 16 kapsamında taşıma gücü ve yerdeğiştirme koşulları birlikte değerlendirilmelidir.',foundation:'TBDY 2018 Bölüm 16.7–16.8: temel tasarımı.',jetGrout:'TBDY 2018 Bölüm 16 / Ek 16D: zemin iyileştirmesi.'}
