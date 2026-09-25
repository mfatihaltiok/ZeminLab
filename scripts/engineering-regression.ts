import assert from 'node:assert/strict'
import { calculateSpt } from '../src/core/engineering/spt/spt-engine.ts'
import { calculateSurfaceFoundation } from '../src/core/engineering/surface-foundation.ts'
import { liquefactionProfile } from '../src/core/engineering/liquefaction/liquefaction-profile.ts'
import { foundationChecks } from '../src/core/engineering/calculation-engine.ts'
import { calculateIdealizedSettlement } from '../src/core/engineering/idealized-settlement-engine.ts'
import { tbdy2018Liquefaction } from '../src/core/engineering/liquefaction/tbdy2018-liquefaction.ts'

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
  const eccentric=calculateSurfaceFoundation({
    B:2,L:4,Df:1,gamma1:18,gamma2:19,c:10,phi:30,verticalLoad:1000,
    momentX:100,momentY:40,resistanceFactor:1.4,method:'TBDY-2018'
  })
  approx(eccentric.qAvg,125)
  approx(eccentric.qMax,158.75)
  approx(eccentric.qMin,91.25)
  assert.equal(eccentric.contactState,'FULL')
  assert.equal(eccentric.coreContact,true)
}

{
  const layered=calculateSurfaceFoundation({
    B:2,L:2,Df:0,gamma1:18,gamma2:19,c:10,phi:30,verticalLoad:500,
    resistanceFactor:1.4,method:'TBDY-2018',
    layers:[
      {topDepth:0,bottomDepth:2,gamma:18,gammaSat:19,cohesion:10,phi:30,name:'L1'},
      {topDepth:2,bottomDepth:4,gamma:19,gammaSat:20,cohesion:30,phi:20,name:'L2'}
    ]
  })
  approx(layered.representativeC,20)
  assert.ok(layered.representativePhi>20&&layered.representativePhi<30)
  assert.equal(layered.finalDesignEligible,true)
  assert.equal(layered.layeredScreeningOnly,true)
  assert.ok(layered.warnings.some(w=>w.includes('eşdeğer parametreler')))
}


{
  const withoutPassive=foundationChecks({B:2,L:2,N:1000,V:600,Vx:600,Vy:0,Mx:0,My:0,deltaTan:.6,passiveResistanceCharacteristic:500,usePassiveResistance:false})
  const withPassive=foundationChecks({B:2,L:2,N:1000,V:600,Vx:600,Vy:0,Mx:0,My:0,deltaTan:.6,passiveResistanceCharacteristic:500,usePassiveResistance:true})
  assert.ok(withoutPassive.slidingUtilizationX>withPassive.slidingUtilizationX)
  assert.equal(withPassive.passiveResistanceDesign,500/1.4)
  const resultant=foundationChecks({B:2,L:2,N:1000,Vx:300,Vy:400,Mx:0,My:0,deltaTan:.6})
  approx(resultant.horizontalResultant,500)
  approx(resultant.slidingFS,resultant.slidingCapacityResultant/500)
}


{
  const missingCu=foundationChecks({
    B:2,L:2,N:1000,Vx:500,Vy:0,Mx:0,My:0,
    groundwaterDepth:0,foundationDepth:1,seismic:true
  })
  assert.equal(missingCu.slidingMode,'data-missing')
  assert.equal(missingCu.evaluable,false)
  assert.equal(missingCu.slidingCapacityResultant,0)
}

{
  const seismicCu=foundationChecks({
    B:2,L:2,N:1000,Vx:500,Vy:0,Mx:0,My:0,
    groundwaterDepth:0,foundationDepth:1,seismic:true,cu:100
  })
  approx(seismicCu.slidingCapacityResultant,4*100/1.1)
  assert.equal(seismicCu.slidingMode,'undrained-cu')
  assert.equal(seismicCu.evaluable,true)
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
  approx(result.rows[0].n1_60,12.266276470940088,1e-10)
  approx(result.rows[0].beta,1.1543167672515497,1e-12)
  assert.ok(result.rows[0].FS !== undefined)
  assert.equal(result.rows[0].postLiquefactionRequired,true)
  assert.equal(result.rows[0].conclusion,'SIVILAŞMA RİSKİ VAR')
}

{
  const invalidCrr=tbdy2018Liquefaction({
    depth:5,totalStress:100,effectiveStress:80,rawSPT:40,CE:1,CB:1,CR:1,CS:1,finesContent:0,Mw:7.5,SDS:1
  })
  assert.ok(Number.isNaN(invalidCrr.CRRM75))
  assert.ok(Number.isNaN(invalidCrr.FS))
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


{
  const profile={
    id:'secondary',version:1,status:'SABİTLENDİ' as const,targetLayerCount:1,generatedAt:new Date(0).toISOString(),
    sourceBoreholeIds:[],sourceLaboratoryIds:[],
    layers:[{
      id:'L1',order:1,topDepth:0,bottomDepth:10,soilName:'Kum',soilCode:'SA',boreholeIds:[],sptRecordIds:[],laboratoryRecordIds:[],
      gamma:18,gammaSat:19,constrainedModulus:10000,secondaryCompressionIndex:0.02,initialVoidRatio:1,
      parameterSources:{},userOverride:false
    }],
    methodology:'regression'
  }
  const result=calculateIdealizedSettlement({profile,method:'2to1-layer',B:2,L:2,Df:0,qGross:100,groundwaterDepth:50,timeYears:10})
  approx(result.totalSecondary,100)
  approx(result.layers[0].secondarySettlement,100)
  assert.equal(result.ready,true)
}


console.log('Engineering regression tests: PASS')
