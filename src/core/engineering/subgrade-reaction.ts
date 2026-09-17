import type { UnitSystem } from '../models/project'

export type SubgradeReactionMethod='q/s'|'elastic'
export interface SubgradeReactionInput{B:number;L?:number;Es?:number;nu?:number;q?:number;settlement?:number;method?:SubgradeReactionMethod;unitSystem?:UnitSystem}
export interface SubgradeReactionResult{ks:number;method:SubgradeReactionMethod;unit:string;formula:string;source:string;assumptions:string[]}

/**
 * Winkler yatak katsayısı. Girdiler proje birim sistemindedir:
 * B,L,s [m], q ve Es [tonf/m² veya kN/m²], ks [tonf/m³ veya kN/m³].
 * 2. yöntem elastik yarı-uzaydan eşdeğer Winkler yaklaşımıdır.
 */
export function calculateSubgradeReaction(i:SubgradeReactionInput):SubgradeReactionResult{
  if(i.B<=0)throw new Error('Temel genişliği B m cinsinden sıfırdan büyük olmalıdır.')
  const L=i.L??i.B
  if(L<=0)throw new Error('Temel uzunluğu L m cinsinden sıfırdan büyük olmalıdır.')
  const unit=i.unitSystem==='kN-m'?'kN/m³':'tonf/m³',stressUnit=i.unitSystem==='kN-m'?'kN/m²':'tonf/m²'
  if(i.method==='q/s'){
    if(i.q==null||i.q<0)throw new Error(`q/s hesabında q ${stressUnit} cinsinden sıfır veya pozitif olmalıdır.`)
    if(i.settlement==null||i.settlement<=0)throw new Error('q/s hesabında oturma s m cinsinden sıfırdan büyük olmalıdır.')
    return{ks:i.q/i.settlement,method:'q/s',unit,formula:'ks = q / s',source:'Winkler tanımı: temel taban basıncı / karşılık gelen oturma.',assumptions:[`q = ${stressUnit}`,'s = m',`ks = ${unit}`]}
  }
  if(i.Es==null||i.Es<=0)throw new Error(`Elastik ks hesabı için Es > 0 ${stressUnit} gereklidir.`)
  if(i.nu==null||i.nu<=-1||i.nu>=0.5)throw new Error('ν için -1 < ν < 0.5 aralığında değer gereklidir.')
  const equivalentWidth=Math.sqrt(i.B*L)
  const ks=i.Es/(equivalentWidth*(1-i.nu*i.nu))
  return{ks,method:'elastic',unit,formula:'ks ≈ Es / [√(B·L)·(1−ν²)]',source:'Elastik yarı-uzaydan eşdeğer Winkler yaklaşımı; yönetmelik tarafından tek başına zorunlu bir ks değeri değildir.',assumptions:[`Es = ${stressUnit}`,'B,L = m','Dikdörtgen temel için eşdeğer genişlik √(B·L) kullanılır','Tabaka kalınlığı, temel rijitliği ve yükleme şekli ayrıca değerlendirilmelidir']}
}
