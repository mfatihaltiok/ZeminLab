import { useEffect, useRef, type ReactNode } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import { normalizeEngineeringRenderModel, type EngineeringRenderLayer, type EngineeringRenderMarker } from './engineering-render-model'

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

const palette:Record<string,number>={clay:0xd8bca5,silt:0xcfd7ce,sand:0xe5d19c,gravel:0xc7cdd0,rock:0xb9bec1,fill:0xd9dde0}
const fmt=(v:number|undefined,d=2)=>v==null||!Number.isFinite(v)?'—':v.toFixed(d)

function addText(root:Container,text:string,x:number,y:number,size=10,bold=false,color=0x35434b){
  const item=new Text({text,style:{fontFamily:'Arial',fontSize:size,fontWeight:bold?'700':'400',fill:color}})
  item.x=x;item.y=y;root.addChild(item);return item
}

function drawPattern(root:Container,kind:string,x:number,y:number,w:number,h:number){
  if(h<18)return
  const g=new Graphics()
  if(kind==='clay'){for(let yy=y+7;yy<y+h;yy+=14)g.moveTo(x,yy).lineTo(x+w,yy).stroke({color:0x9d765d,width:1,alpha:.55})}
  else if(kind==='sand'||kind==='silt'){for(let xx=x+10;xx<x+w;xx+=22)for(let yy=y+9;yy<y+h;yy+=20)g.circle(xx,yy,1).fill(kind==='sand'?0xa18143:0x778176)}
  else if(kind==='gravel'){for(let xx=x+10;xx<x+w;xx+=28)for(let yy=y+10;yy<y+h;yy+=24)g.circle(xx,yy,3).stroke({color:0x737c81,width:1,alpha:.6})}
  else if(kind==='rock'){for(let xx=x-10;xx<x+w;xx+=30)g.moveTo(xx,y+h).lineTo(xx+18,y).stroke({color:0x626a6f,width:1,alpha:.5})}
  root.addChild(g)
}

function colorKey(layer:EngineeringRenderLayer){return layer.colorClass??'fill'}

export function EngineeringSectionRenderer(props:Props){
  const host=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const el=host.current;if(!el)return
    let disposed=false
    const model=normalizeEngineeringRenderModel({variant:props.variant,totalDepth:props.totalDepth,groundwaterDepth:props.groundwaterDepth,foundationDepth:props.foundationDepth,layers:props.layers,markers:props.markers??[]})
    const width=1180
    const top=76
    const depthHeight=620
    const rowH=34
    const registerTop=top+depthHeight+40
    const registerH=Math.max(60,model.layers.length*rowH+30)
    const height=registerTop+registerH+20
    const soilX=model.variant==='profile'?150:125
    const soilW=410
    const depthY=(d:number)=>top+d/model.totalDepth*depthHeight
    const sptMax=Math.max(10,...model.layers.map(x=>x.sptN60??x.sptN??0))
    const markers=model.markers.length?model.markers:model.layers.flatMap(layer=>{
      const depth=(layer.topDepth+layer.bottomDepth)/2
      return layer.sptN60!=null?[{depth,label:'SPT',detail:'N₁,₆₀='+fmt(layer.sptN60,1),kind:'spt' as const}]:layer.sptN!=null?[{depth,label:'SPT',detail:'N='+fmt(layer.sptN,0),kind:'spt' as const}]:[]
    })
    const app=new Application()
    const run=async()=>{
      await app.init({width,height,background:0xf7f9fa,antialias:true,resolution:Math.min(window.devicePixelRatio||1,2),autoDensity:true})
      if(disposed){app.destroy(true);return}
      el.replaceChildren(app.canvas)
      app.canvas.className='engineering-render-canvas'
      app.canvas.setAttribute('aria-label',model.variant==='profile'?'GPU idealize zemin profili':'GPU sondaj logu')
      const root=new Container();app.stage.addChild(root)
      const header=new Graphics();header.rect(0,0,width,44).fill(0xe5e9ec).stroke({color:0xaab3ba,width:1});root.addChild(header)
      addText(root,'FALUZMN · '+(model.variant==='profile'?'İDEALİZE ZEMİN PROFİLİ':'SONDAJ LOGU'),18,15,12,true)
      addText(root,'GPU TEKNİK KESİT · PIXIJS',850,16,10,false,0x5f6b73)
      addText(root,'DERİNLİK',33,55,10,true,0x53616a);addText(root,'ZEMİN KESİTİ',soilX+8,55,10,true,0x53616a);addText(root,'SPT / SAHA / LAB',610,55,10,true,0x53616a)
      const frame=new Graphics();frame.rect(soilX,top,soilW,depthHeight).fill(0xffffff).stroke({color:0x68757d,width:1.5});root.addChild(frame)
      for(let i=0;i<=Math.floor(model.totalDepth);i++){const yy=depthY(i);const g=new Graphics();g.moveTo(48,yy).lineTo(1120,yy).stroke({color:i%5===0?0xc5ccd1:0xe5e8ea,width:i%5===0?1.2:.7});root.addChild(g);addText(root,String(i),34,yy-5,9,false,0x5c6870)}
      model.layers.forEach((layer,index)=>{
        const y0=depthY(layer.topDepth),y1=depthY(layer.bottomDepth),h=Math.max(2,y1-y0),g=new Graphics()
        g.rect(soilX,y0,soilW,h).fill(palette[colorKey(layer)]??palette.fill).stroke({color:0x707a81,width:1});root.addChild(g)
        drawPattern(root,colorKey(layer),soilX,y0,soilW,h)
        if(h>=32){addText(root,String(index+1),soilX+9,y0+8,9,true);addText(root,layer.code||'ZEMİN',soilX+32,y0+7,10.5,true);addText(root,layer.description||'',soilX+32,y0+22,8.5,false,0x4f5c64)}
        const n=layer.sptN60??layer.sptN
        if(n!=null){const bar=new Graphics();bar.rect(610,y0+h/2-7,170,14).fill(0xf0f2f3).stroke({color:0xbac2c7,width:1});bar.rect(610,y0+h/2-7,Math.max(2,170*n/sptMax),14).fill(0x55738b);root.addChild(bar);addText(root,(layer.sptN60!=null?'N₁,₆₀=':'N=')+fmt(n,layer.sptN60!=null?1:0),792,y0+h/2-5,9,false,0x42515b)}
      })
      markers.forEach(marker=>{const yy=depthY(marker.depth),c=marker.kind==='spt'?0x416a87:marker.kind==='lab'?0x647d67:0x8a6b35,g=new Graphics();g.circle(835,yy,5).fill(0xffffff).stroke({color:c,width:1.5});root.addChild(g);addText(root,marker.label,848,yy-7,8.5,true,c);if(marker.detail)addText(root,marker.detail,848,yy+5,8,false,0x5e6970)})
      if(model.groundwaterDepth!=null){const yy=depthY(model.groundwaterDepth),g=new Graphics();g.moveTo(48,yy).lineTo(1120,yy).stroke({color:0x2f78a3,width:2.4});root.addChild(g);addText(root,'YASS '+fmt(model.groundwaterDepth)+' m',1000,yy-17,9,true,0x2f678b)}
      if(model.foundationDepth!=null&&model.foundationDepth>0){const yy=depthY(model.foundationDepth),g=new Graphics();g.moveTo(soilX,yy).lineTo(soilX+soilW,yy).stroke({color:0x8b4f38,width:2});root.addChild(g);addText(root,'TEMEL TABANI · Df='+fmt(model.foundationDepth)+' m',soilX+8,yy-17,9,true,0x8b4f38)}
      const reg=new Graphics();reg.rect(48,registerTop,1070,registerH).fill(0xffffff).stroke({color:0xaeb7bd,width:1});reg.rect(48,registerTop,1070,28).fill(0xe8ecee);root.addChild(reg)
      addText(root,'KATMAN',60,registerTop+9,9,true,0x46545d);addText(root,'DERİNLİK',170,registerTop+9,9,true,0x46545d);addText(root,'ZEMİN',300,registerTop+9,9,true,0x46545d);addText(root,'γ',610,registerTop+9,9,true,0x46545d);addText(root,'c',690,registerTop+9,9,true,0x46545d);addText(root,'φ',770,registerTop+9,9,true,0x46545d);addText(root,'SPT',850,registerTop+9,9,true,0x46545d);addText(root,'LAB',950,registerTop+9,9,true,0x46545d)
      model.layers.forEach((layer,i)=>{const yy=registerTop+28+i*rowH;if(i%2===1){const bg=new Graphics();bg.rect(48,yy,1070,rowH).fill(0xf7f9fa);root.addChild(bg)}addText(root,String(i+1),60,yy+12,9,true);addText(root,fmt(layer.topDepth)+'–'+fmt(layer.bottomDepth)+' m',170,yy+12,9);addText(root,(layer.code||'—')+' · '+(layer.description||''),300,yy+12,9);addText(root,fmt(layer.gamma,1),610,yy+12,9);addText(root,fmt(layer.cohesion,1),690,yy+12,9);addText(root,fmt(layer.frictionAngle,1)+'°',770,yy+12,9);addText(root,layer.sptN60!=null?'N₁,₆₀ '+fmt(layer.sptN60,1):layer.sptN!=null?'N '+fmt(layer.sptN,0):'—',850,yy+12,9);addText(root,layer.labId||'—',950,yy+12,9)})
    }
    void run()
    return()=>{disposed=true;app.destroy(true)}
  },[props])
  return <div className="engineering-render-shell"><div className="engineering-render-scroll" ref={host}/>{props.footer&&<div className="engineering-render-footer">{props.footer}</div>}</div>
}
