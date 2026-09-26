import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Layer={topDepth:number;bottomDepth:number;colorClass?:string;code?:string}
type Props={layers:Layer[];totalDepth:number}

const color=(x:string|undefined)=>x==='clay'?0xb88968:x==='silt'?0x9ca99c:x==='sand'?0xd2b46d:x==='gravel'?0x858f95:x==='rock'?0x6d7478:0xb8bec2

export function Soil3DViewport({layers,totalDepth}:Props){
 const ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{const host=ref.current;if(!host)return
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xf3f5f6)
 const camera=new THREE.PerspectiveCamera(38,1,.1,200);camera.position.set(10,8,12)
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(900,420);host.replaceChildren(renderer.domElement)
 const group=new THREE.Group();scene.add(group)
 const depthScale=8/Math.max(totalDepth,1)
 layers.forEach(layer=>{const h=Math.max(.08,(layer.bottomDepth-layer.topDepth)*depthScale);const geo=new THREE.BoxGeometry(5,h,3);const mat=new THREE.MeshStandardMaterial({color:color(layer.colorClass),roughness:.88,metalness:.02});const mesh=new THREE.Mesh(geo,mat);mesh.position.y=4-layer.topDepth*depthScale-h/2;group.add(mesh)})
 const base=new THREE.Mesh(new THREE.BoxGeometry(5,.12,3),new THREE.MeshStandardMaterial({color:0x70777b}));base.position.y=-4;group.add(base)
 scene.add(new THREE.HemisphereLight(0xffffff,0x5f6870,2.2));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(6,10,8);scene.add(light)
 let raf=0;const animate=()=>{raf=requestAnimationFrame(animate);group.rotation.y+=.002;renderer.render(scene,camera)};animate()
 return()=>{cancelAnimationFrame(raf);renderer.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;m.dispose()}})}
 },[layers,totalDepth])
 return <div ref={ref} className="soil-3d-viewport" aria-label="Three.js üç boyutlu zemin profili"/>
}
