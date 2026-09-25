import assert from 'node:assert/strict'
import { calculateSpt } from '../src/core/engineering/spt/spt-engine.ts'
import { calculateSurfaceFoundation } from '../src/core/engineering/surface-foundation.ts'
import { liquefactionProfile } from '../src/core/engineering/liquefaction/liquefaction-profile.ts'
import { foundationChecks } from '../src/core/engineering/calculation-engine.ts'
import { calculateIdealizedSettlement } from '../src/core/engineering/idealized-settlement-engine.ts'

const approx=(actual:number,expected:number,tolerance=1e-9)=>{
  assert.ok(Math.abs(actual-expected)<=tolerance,`expected ${expected}, got ${actual}`)
}

{
  const s=calculateSpt({nField:20,energyRatio:60,boreholeDiameterMm:115,sampler:'standard',rodLengthM:10,effectiveStress:100,fineContent:30})
  approx(s.ce,1)
  approx(s.cb,1)
  approx(s.cs,1)
  approx(s.cr,1)
  approx(s.n60,20)
  approx(s.cn,0.978)
  approx(s.n1_60,19.56)
  approx(s.trace.find(x=>x.symbol==='CN')!.value!,0.978)
  assert.equal(s.warnings.length,0)
}

{
  assert.throws(() => calculateSpt({nField:10,energyRatio:60,rodLengthM:2.9,effectiveStress:100}), /rod boyu 3 m’den küçük/)
}

{
  const level=calculateSurfaceFoundation({
    B:2,L:3,Df:1,gamma1:18,gamma2:19,c:10,phi:30,verticalLoad:1000,
    horizontalLoad:0,momentX:0,momentY:0,groundSlope:0,baseSlope:0,resistanceFactor:1.4,method:'TBDY-2018'
  })
  const sloped=calculateSurfaceFoundation({
    B:2,L:3,Df:1,gamma1:18,gamma2:19,c:10,phi:30,verticalLoad:1000,
    horizontalLoad:0,momentX:0,momentY:0,groundSlope:5,baseSlope:0,resistanceFactor:1.4,method:'TBDY-2018'
  })
  assert.equal(level.gc,1)
  assert.equal(level.gq,1)
  assert.ok(sloped.gq<1)
}

{
  const withoutPassive=foundationChecks({B:2,L:2,N:1000,V:600,Vx:600,Vy:0,Mx:0,My:0,deltaTan:.6,passiveResistanceCharacteristic:500,usePassiveResistance:false})
  const withPassive=foundationChecks({B:2,L:2,N:1000,V:600,Vx:600,Vy:0,Mx:0,My:0,deltaTan:.6,passiveResistanceCharacteristic:500,usePassiveResistance:true})
  assert.ok(withoutPassive.slidingUtilizationX>withPassive.slidingUtilizationX)
  assert.equal(withPassive.passiveResistanceDesign,500/1.4)
}

{
  const result=liquefactionProfile({
    Mw:7.5,Sds:1,gwt:2,
    soilGroup:'ZE',dts:'1',continuousOrThickLens:true,foundationDepth:2,
    layers:[{top:0,bottom:10,gamma:18,gammaSat:19,soil:'SA',finesContent:30,plasticityIndex:5}],
    spt:[{depth:5,nField:10,fineContent:30,plasticityIndex:5,waterContent:20,soil:'SA',energyRatio:60,boreholeDiameterMm:115,sampler:'standard',rodLengthM:10}]
  })
  assert.equal(result.mandatoryByProject,true)
  assert.equal(result.rows[0].mandatoryAnalysis,true)
  assert.equal(result.rows[0].n1_60,9.78)
  approx(result.rows[0].beta,1.1543167672515497,1e-12)
  assert.ok(result.rows[0].FS !== undefined)
  assert.equal(result.rows[0].conclusion,'SIVILAŞMA RİSKİ VAR')
}

{
  const profile={
    id:'regression',version:1,status:'SABİTLENDİ' as const,targetLayerCount:1,generatedAt:new Date(0).toISOString(),
    sourceBoreholeIds:[],sourceLaboratoryIds:[],
    layers:[{
      id:'L1',order:1,topDepth:0,bottomDepth:10,soilName:'Kum',soilCode:'SA',boreholeIds:[],sptRecordIds:[],laboratoryRecordIds:[],
      representativeSptN:20,gamma:18,gammaSat:19,parameterSources:{},userOverride:false
    }],
    methodology:'regression'
  }
  const result=calculateIdealizedSettlement({profile,method:'2to1-layer',B:2,L:2,Df:0,qGross:100,groundwaterDepth:50})
  assert.equal(result.netFoundationPressure,100)
  assert.ok(result.layers[0].deltaSigma>0)
}

console.log('Engineering regression tests: PASS')
