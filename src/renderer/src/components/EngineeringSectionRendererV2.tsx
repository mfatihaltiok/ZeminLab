import { useEffect, useRef, type ReactNode } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import { normalizeEngineeringRenderModel, type EngineeringRenderLayer, type EngineeringRenderMarker, type EngineeringRenderModel } from './engineering-render-model'

export type { EngineeringRenderLayer, EngineeringRenderMarker }

type Props={
  variant:'profile'|'borehole'
  totalDepth:number
  groundwaterDepth?:number
  foundationDepth?:number
  layers:EngineeringRenderLayer[]
  markers?:EngineeringRenderMarker[]
  footer?:ReactNode
}

const palette:Record<string,number>={
  clay:0xd8b89f,
  silt:0xd2d8d0,
  sand:0xe7d19a,
  gravel:0xc7cdd1,
  rock:0xbcc1c4,
  fill:0xd9dde0
}
const fmt=(v:number|undefined,d=2)=>v==null||!Number.isFinite(v)?'—':v.toFixed(d)

function text(root:Container,value:string,x:number,y:number,size=10,bold=false,color=0x2f3c45):void{
  const item=new Text({text:value,style:{fontFamily:'Arial',fontSize:size,fontWeight:bold?'700':'400',fill:color}})
  item.x=x
  item.y=y
  root.addChild(item)
}

function rect(root:Container,x:number,y:number,w:number,h:number,fill:number,strokeColor=0xaab4ba,strokeWidth=1):void{
  const g=new Graphics()
  g.rect(x,y,w,h).fill(fill).stroke({color:strokeColor,width:strokeWidth})
  root.addChild(g)
}

function line(root:Container,x1:number,y1:number,x2:number,y2:number,color=0xaab4ba,width=1,dash=false):void{
  const g=new Graphics()
  if(dash)g.moveTo(x1,y1).lineTo(x2,y2).stroke({color,width,dash:[8,6]})
  else g.moveTo(x1,y1).lineTo(x2,y2).stroke({color,width})
  root.addChild(g)
}

function pattern(root:Container,kind:string,x:number,y:number,w:number,h:number):void{
  if(h<12)return
  const g=new Graphics()
  if(kind==='clay'){
    for(let yy=y+8;yy<y+h;yy+=14)g.moveTo(x+2,yy).lineTo(x+w-2,yy).stroke({color:0x9b725b,width:1})
  }else if(kind==='silt'){
    for(let xx=x+8;xx<x+w;xx+=18)for(let yy=y+8;yy<y+h;yy+=18)g.circle(xx,yy,1).fill(0x748074)
  }else if(kind==='sand'){
    for(let xx=x+8;xx<x+w;xx+=18)for(let yy=y+8;yy<y+h;yy+=18){
      g.circle(xx,yy,1.3).fill(0x987943)
      g.circle(xx+5,yy+5,.7).fill(0x987943)
    }
  }else if(kind==='gravel'){
    for(let xx=x+8;xx<x+w;xx+=24)for(let yy=y+9;yy<y+h;yy+=22)g.circle(xx,yy,3).stroke({color:0x687177,width:1})
  }else if(kind==='rock'){
    for(let xx=x-4;xx<x+w;xx+=28)g.moveTo(xx,y+h).lineTo(xx+18,y+2).stroke({color:0x626a6f,width:1})
  }else{
    for(let xx=x-8;xx<x+w;xx+=18)g.moveTo(xx,y+h).lineTo(xx+12,y+2).stroke({color:0x9ba3a8,width:1})
  }
  root.addChild(g)
}

function drawModel(app:Application,model:EngineeringRenderModel):void{
  const width=1280
  const top=108
  const depthHeight=720
  const left=48
  const soilX=150
  const soilW=model.variant==='borehole'?330:360
  const codeX=soilX+soilW
  const codeW=84
  const dataX=codeX+codeW
  const dataW=666
  const bottom=top+depthHeight
  const tableTop=bottom+42
  const rowH=31
  const tableH=Math.max(74,model.layers.length*rowH+30)
  const height=tableTop+tableH+22
  app.renderer.resize(width,height)

  const previous=app.stage.children[0]
  if(previous){app.stage.removeChild(previous);previous.destroy({children:true})}
  const root=new Container()
  app.stage.addChild(root)

  rect(root,0,0,width,height,0xf5f7f8,0xd5dade,1)
  rect(root,0,0,width,58,0xe5e9ec,0xaab3ba,1)
  text(root,'FALUZMN',18,11,15,true,0x273842)
  text(root,model.variant==='profile'?'İDEALİZE ZEMİN PROFİLİ':'SONDAJ LOGU',105,11,14,true,0x34444e)
  text(root,model.variant==='profile'?'Mühendislik tasarım profili':'Saha verisi · litoloji + SPT/UD + laboratuvar + gözlemler',105,33,9,false,0x66747d)
  text(root,'TEKNİK KESİT',1120,12,8.5,true,0x52636e)
  text(root,'0.00 → '+fmt(model.totalDepth)+' m',1120,30,8,false,0x68757d)

  text(root,'DERİNLİK',48,73,9,true,0x53616a)
  text(root,model.variant==='profile'?'MÜHENDİSLİK KATMANI':'LİTOLOJİ',soilX+8,73,9,true,0x53616a)
  text(root,'SINIF',codeX+10,73,9,true,0x53616a)
  text(root,model.variant==='profile'?'TASARIM PARAMETRELERİ':'SPT / LAB / SAHA',dataX+10,73,9,true,0x53616a)
  rect(root,soilX,top,soilW+codeW+dataW,depthHeight,0xffffff,0x7f8a92,1.2)

  const depthY=(d:number)=>top+d/model.totalDepth*depthHeight
  for(let i=0;i<=Math.ceil(model.totalDepth);i++){
    const yy=depthY(i)
    line(root,left,yy,soilX+soilW+codeW+dataW,yy,i%5===0?0xc4ccd1:0xe8ebed,i%5===0?1.2:.6)
    text(root,String(i),58,yy-5,8,false,0x66727b)
  }
  line(root,110,top,110,bottom,0x8b969d,1)
  line(root,soilX,top,soilX,bottom,0x7d8890,1.1)
  line(root,codeX,top,codeX,bottom,0xb0b8bd,1)
  line(root,dataX,top,dataX,bottom,0xb0b8bd,1)

  model.layers.forEach((layer,index)=>{
    const y0=depthY(layer.topDepth)
    const y1=depthY(layer.bottomDepth)
    const h=Math.max(3,y1-y0)
    const fill=palette[layer.colorClass??'fill']??palette.fill
    rect(root,soilX,y0,soilW,h,fill,0x717b82,.9)
    pattern(root,layer.colorClass??'fill',soilX,y0,soilW,h)

    const mid=y0+h/2
    if(h>=34){
      text(root,String(index+1),soilX+8,y0+7,9,true,0x34424b)
      text(root,layer.code||'—',soilX+30,y0+6,11,true,0x28363f)
      text(root,layer.description||'Zemin',soilX+30,y0+21,8.5,false,0x4f5d65)
    }else{
      text(root,String(index+1),soilX+8,mid-5,7.5,true,0x34424b)
    }
    text(root,fmt(layer.topDepth),soilX+soilW+7,y0-5,7.5,false,0x66727b)
    if(h>=18)text(root,fmt(layer.bottomDepth),soilX+soilW+7,y1-9,7.5,false,0x66727b)
    text(root,layer.code||'—',codeX+11,mid-5,10,true,0x33424b)

    if(model.variant==='profile'){
      text(root,'γ '+fmt(layer.gamma,1),dataX+12,mid-14,8.5,true,0x46555e)
      text(root,'c '+fmt(layer.cohesion,1)+' · φ '+fmt(layer.frictionAngle,1)+'°',dataX+88,mid-14,8.5,false,0x46555e)
      text(root,'SPT '+(layer.sptN60!=null?'N₁,₆₀ '+fmt(layer.sptN60,1):layer.sptN!=null?'N '+fmt(layer.sptN,0):'—'),dataX+12,mid+2,8.5,false,0x4c5a63)
      text(root,'LAB '+(layer.labId??'—'),dataX+166,mid+2,8.5,false,0x4c5a63)
    }else{
      text(root,layer.description||'—',dataX+12,mid-14,8.5,true,0x46555e)
      text(root,'SPT '+(layer.sptN!=null?'N '+fmt(layer.sptN,0):'—'),dataX+12,mid+2,8.5,false,0x4c5a63)
    }
  })

  model.markers.forEach(marker=>{
    const yy=depthY(marker.depth)
    const c=marker.kind==='spt'?0x3d6a88:marker.kind==='lab'?0x55735e:0x8b6b37
    line(root,dataX+360,yy,dataX+384,yy,c,1.4)
    const circle=new Graphics()
    circle.circle(dataX+360,yy,5).fill(0xffffff).stroke({color:c,width:1.5})
    root.addChild(circle)
    text(root,marker.kind.toUpperCase(),dataX+392,yy-8,7.5,true,c)
    if(marker.detail)text(root,marker.detail,dataX+430,yy-5,8,false,0x5e6b72)
  })

  if(model.groundwaterDepth!=null){
    const yy=depthY(model.groundwaterDepth)
    line(root,left,yy,soilX+soilW+codeW+dataW,yy,0x37759c,2,true)
    rect(root,dataX+500,yy-18,150,17,0xf5fafd,0xd5e4ea,1)
    text(root,'YASS '+fmt(model.groundwaterDepth)+' m',dataX+507,yy-14,8.5,true,0x326a8b)
  }

  if(model.foundationDepth!=null&&model.foundationDepth>0){
    const yy=depthY(model.foundationDepth)
    line(root,soilX,yy,soilX+soilW,yy,0x8a4f39,2)
    rect(root,soilX+8,yy-19,180,16,0xfdf8f5,0xe7d8d1,1)
    text(root,'TEMEL TABANI · Df='+fmt(model.foundationDepth)+' m',soilX+14,yy-15,8,true,0x874b36)
  }

  rect(root,left,tableTop,1180,tableH,0xffffff,0xaeb7bd,1)
  rect(root,left,tableTop,1180,28,0xe7ebed,0xaeb7bd,1)
  text(root,'KATMAN',left+12,tableTop+9,8.5,true,0x46545d)
  text(root,'DERİNLİK',left+102,tableTop+9,8.5,true,0x46545d)
  text(root,'ZEMİN / AÇIKLAMA',left+212,tableTop+9,8.5,true,0x46545d)
  text(root,'γ',left+555,tableTop+9,8.5,true,0x46545d)
  text(root,'c',left+610,tableTop+9,8.5,true,0x46545d)
  text(root,'φ',left+670,tableTop+9,8.5,true,0x46545d)
  text(root,'SPT',left+755,tableTop+9,8.5,true,0x46545d)
  text(root,'LAB',left+880,tableTop+9,8.5,true,0x46545d)
  model.layers.forEach((layer,i)=>{
    const yy=tableTop+28+i*rowH
    if(i%2===1)rect(root,left,yy,1180,rowH,0xf8f9fa,0xf8f9fa,0)
    text(root,String(i+1),left+12,yy+10,8.5,true)
    text(root,fmt(layer.topDepth)+' – '+fmt(layer.bottomDepth)+' m',left+102,yy+10,8.5)
    text(root,(layer.code||'—')+' · '+(layer.description||''),left+212,yy+10,8.5)
    text(root,fmt(layer.gamma,1),left+555,yy+10,8.5)
    text(root,fmt(layer.cohesion,1),left+610,yy+10,8.5)
    text(root,fmt(layer.frictionAngle,1)+'°',left+670,yy+10,8.5)
    text(root,layer.sptN60!=null?'N₁,₆₀ '+fmt(layer.sptN60,1):layer.sptN!=null?'N '+fmt(layer.sptN,0):'—',left+755,yy+10,8.5)
    text(root,layer.labId||'—',left+880,yy+10,8.5)
  })
}

export function EngineeringSectionRenderer(props:Props){
  const host=useRef<HTMLDivElement>(null)
  const modelRef=useRef<EngineeringRenderModel>()
  const appRef=useRef<Application|null>(null)

  modelRef.current=normalizeEngineeringRenderModel({
    variant:props.variant,
    totalDepth:props.totalDepth,
    groundwaterDepth:props.groundwaterDepth,
    foundationDepth:props.foundationDepth,
    layers:props.layers,
    markers:props.markers??[]
  })

  useEffect(()=>{
    const el=host.current
    if(!el)return undefined
    let cancelled=false
    const app=new Application()
    appRef.current=app
    const run=async()=>{
      await app.init({
        width:1280,
        height:900,
        background:0xf5f7f8,
        antialias:true,
        resolution:Math.min(window.devicePixelRatio||1,2),
        autoDensity:true
      })
      if(cancelled){app.destroy(true);return}
      el.replaceChildren(app.canvas)
      app.canvas.className='engineering-render-canvas'
      app.canvas.setAttribute('role','img')
      app.canvas.setAttribute('aria-label',props.variant==='profile'?'İdealize zemin profili teknik kesiti':'Sondaj logu teknik kesiti')
      if(modelRef.current)drawModel(app,modelRef.current)
    }
    void run().catch(error=>console.error('FALUZMN teknik kesit renderer hatası:',error))
    return()=>{
      cancelled=true
      appRef.current=null
      app.destroy(true)
    }
  },[])

  useEffect(()=>{
    const app=appRef.current
    const model=modelRef.current
    if(app&&model)drawModel(app,model)
  },[props.variant,props.totalDepth,props.groundwaterDepth,props.foundationDepth,props.layers,props.markers])

  return <div className="engineering-render-shell"><div className="engineering-render-scroll" ref={host}/>{props.footer&&<div className="engineering-render-footer">{props.footer}</div>}</div>
}
