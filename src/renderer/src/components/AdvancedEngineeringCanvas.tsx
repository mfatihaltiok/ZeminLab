import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { EngineeringRenderLayer, EngineeringRenderMarker } from './engineering-render-model'

export type AdvancedEngineeringCanvasProps={variant:'profile'|'borehole';totalDepth:number;groundwaterDepth?:number;foundationDepth?:number;layers:EngineeringRenderLayer[];markers?:EngineeringRenderMarker[]}

export function AdvancedEngineeringCanvas(props:AdvancedEngineeringCanvasProps){
 const host=useRef<HTMLDivElement>(null)
 useEffect(()=>{const el=host.current;if(!el)return;let dead=false;const app=new Application();const run=async()=>{await app.init({width:1100,height:720,background:0xf7f9fa,antialias:true});if(dead){app.destroy(true);return};el.appendChild(app.canvas);const root=new Container();app.stage.addChild(root);const box=new Graphics();box.rect(20,20,1060,650).fill(0xffffff).stroke({color:0x68757d,width:1});root.addChild(box);const title=new Text({text:'FALUZMN · GPU ENGINEERING RENDER',style:{fontFamily:'Arial',fontSize:14,fill:0x35434b}});title.x=30;title.y=30;root.addChild(title)};void run();return()=>{dead=true;app.destroy(true)}},[])
 return <div ref={host} className='engineering-gpu-canvas'/>
}
