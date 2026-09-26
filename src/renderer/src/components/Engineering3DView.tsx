import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useProjectInfo } from '../../../core/state/project-store'
import type { BoreholeRecord } from '../../../core/models/field-data'
import './engineering-3d-view.css'

type Props={boreholes?:BoreholeRecord[]}

const soilColor=(code:string|undefined,colorClass:string|undefined)=>colorClass==='clay'||code?.toLowerCase().includes('cl')?0xb88968:colorClass==='sand'||code?.toLowerCase().includes('sa')?0xd2b46d:colorClass==='gravel'?0x858f95:colorClass==='rock'?0x6d7478:0xa7b0b5

export function Foundation3DView({boreholes=[]}:Props){
 const host=useRef<HTMLDivElement>(null);const p=useProjectInfo();const f=p.foundationParameters;const j=p.jetGrout
 useEffect(()=>{const el=host.current;if(!el)return
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xf3f5f6)
  const camera=new THREE.PerspectiveCamera(42,1,.1,250);const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));el.replaceChildren(renderer.domElement)
  const root=new THREE.Group();scene.add(root)
  const B=Math.max(f.footingWidth,.5),L=Math.max(f.footingLength,.5),Df=Math.max(f.footingDepth,.3),foundation=new THREE.Mesh(new THREE.BoxGeometry(L,.65,B),new THREE.MeshStandardMaterial({color:0xd9dde0,roughness:.75}));foundation.position.y=-Df+.33;root.add(foundation)
  const first=boreholes[0];let y=-Df-.5
  const soilLayers=first?.lithology?.length?first.lithology:[];soilLayers.forEach(layer=>{const h=Math.max(.25,(layer.to-layer.from));const mesh=new THREE.Mesh(new THREE.BoxGeometry(L+6,h,B+6),new THREE.MeshStandardMaterial({color:soilColor(layer.code,layer.colorClass),transparent:true,opacity:.52,roughness:1}));mesh.position.y=-(Df+layer.from+h/2);root.add(mesh)})
  const d=Number(j.columnDiameter||0),s=Number(j.spacing||0),H=Number(j.foundationThickness||0);if(d>0&&s>0&&H>0){const r=d/2;for(let x=-L/2+r;x<=L/2-r+.001;x+=s)for(let z=-B/2+r;z<=B/2-r+.001;z+=s){const col=new THREE.Mesh(new THREE.CylinderGeometry(r, r, H, 24),new THREE.MeshStandardMaterial({color:0x707e87,roughness:.78}));col.position.set(x,-Df-H/2,z);root.add(col)}} 
  scene.add(new THREE.HemisphereLight(0xffffff,0x5f6870,2.1));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(8,12,10);scene.add(light)
  let yaw=.65,pitch=.35,radius=14,drag=false,lx=0,ly=0
  const resize=()=>{const w=Math.max(360,el.clientWidth),h=Math.max(320,el.clientHeight||420);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);render()}
  const render=()=>{camera.position.set(radius*Math.cos(pitch)*Math.sin(yaw),radius*Math.sin(pitch),radius*Math.cos(pitch)*Math.cos(yaw));camera.lookAt(new THREE.Vector3(0,-Df/2,0));renderer.render(scene,camera)}
  const down=(e:PointerEvent)=>{drag=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)},move=(e:PointerEvent)=>{if(!drag)return;yaw-=(e.clientX-lx)*.01;pitch=Math.max(-1.1,Math.min(1.1,pitch+(e.clientY-ly)*.008));lx=e.clientX;ly=e.clientY;render()},up=()=>{drag=false},wheel=(e:WheelEvent)=>{e.preventDefault();radius=Math.max(7,Math.min(30,radius*(e.deltaY>0?1.08:.92)));render()}
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});const ro=new ResizeObserver(resize);ro.observe(el);resize()
  return()=>{ro.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.domElement.removeEventListener('wheel',wheel);renderer.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose()}})}
 },[boreholes,f.footingWidth,f.footingLength,f.footingDepth,j.columnDiameter,j.spacing,j.foundationThickness])
 return <section className="engineering-3d-card"><div className="engineering-3d-header"><div><span>GPU MÜHENDİSLİK GÖRÜNÜMÜ</span><h3>Temel · Zemin · Jet Grout</h3></div><div className="engineering-3d-meta"><b>{f.footingWidth.toFixed(2)} × {f.footingLength.toFixed(2)} m</b><span>Df = {f.footingDepth.toFixed(2)} m</span></div></div><div ref={host} className="engineering-3d-stage" aria-label="Three.js temel ve zemin 3D görünümü"/><div className="engineering-3d-help">Sürükle: döndür · Tekerlek: yakınlaştır / uzaklaştır</div></section>
}
