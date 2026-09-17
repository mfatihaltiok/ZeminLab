import type { Stage2BearingInput, Stage2SettlementInput } from './stage2-engine'

export interface ValidationIssue { level:'ERROR'|'WARNING'; field:string; message:string }

export function validateBearingInput(i:Stage2BearingInput):ValidationIssue[]{
 const e:ValidationIssue[]=[]
 if(!(i.B>0))e.push({level:'ERROR',field:'B',message:'B > 0 olmalıdır.'})
 if(!(i.L>0))e.push({level:'ERROR',field:'L',message:'L > 0 olmalıdır.'})
 if(!(i.Df>=0))e.push({level:'ERROR',field:'Df',message:'Df ≥ 0 olmalıdır.'})
 if(!(i.gamma>0))e.push({level:'ERROR',field:'gamma',message:'γ > 0 olmalıdır.'})
 if(!(i.c>=0))e.push({level:'ERROR',field:'c',message:'c ≥ 0 olmalıdır.'})
 if(!(i.phi>=0&&i.phi<90))e.push({level:'ERROR',field:'phi',message:'φ, 0° ile 90° arasında olmalıdır.'})
 if(i.FS!=null&&i.FS<=0)e.push({level:'ERROR',field:'FS',message:'FS > 0 olmalıdır.'})
 if(i.waterTableDepth!=null&&i.waterTableDepth<0)e.push({level:'ERROR',field:'waterTableDepth',message:'Yeraltı suyu derinliği negatif olamaz.'})
 if(i.loadV!=null&&i.loadV<=0)e.push({level:'WARNING',field:'loadV',message:'Düşey yük ≤ 0 olduğunda eksantriklik tanımı güvenilir değildir.'})
 return e
}

export function validateSettlementInput(i:Stage2SettlementInput):ValidationIssue[]{
 const e:ValidationIssue[]=[]
 if(!(i.B>0))e.push({level:'ERROR',field:'B',message:'B > 0 olmalıdır.'})
 if(!(i.q>=0))e.push({level:'ERROR',field:'q',message:'q ≥ 0 olmalıdır.'})
 if(!i.layers.length)e.push({level:'ERROR',field:'layers',message:'En az bir zemin katmanı gereklidir.'})
 i.layers.forEach((l,n)=>{
  if(!(l.thickness>0))e.push({level:'ERROR',field:`layers[${n}].thickness`,message:'Katman kalınlığı > 0 olmalıdır.'})
  if(!(l.sigmaV0>0))e.push({level:'ERROR',field:`layers[${n}].sigmaV0`,message:'Başlangıç efektif gerilmesi > 0 olmalıdır.'})
  if(l.Es!=null&&l.Es<=0)e.push({level:'ERROR',field:`layers[${n}].Es`,message:'Es > 0 olmalıdır.'})
  if(l.e0!=null&&l.e0<0)e.push({level:'ERROR',field:`layers[${n}].e0`,message:'e0 ≥ 0 olmalıdır.'})
  if(l.Cc!=null&&l.Cc<0)e.push({level:'ERROR',field:`layers[${n}].Cc`,message:'Cc ≥ 0 olmalıdır.'})
 })
 return e
}
