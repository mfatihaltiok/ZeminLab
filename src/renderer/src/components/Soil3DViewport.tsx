import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Layer={topDepth:number;bottomDepth:number;colorClass?:'fill'|'clay'|'silt'|'sand'|'gravel'|'rock';code?:string}
type Props={layers:Layer[];totalDepth:number}

const color=(x:Layer['colorClass'])=>x==='clay'?0xb88968:x==='silt'?0x9ca99c:x==='sand'?0xd2b46d:x==='gravel'?0x858f95:x==='rock'?0x6d7478:0xb8bec2

export function Soil3DViewport({layers,totalDepth}:Props){
  const host=useRef<HTMLDivElement>(null)
  const dataRef=useRef({layers,totalDepth})
  const rebuildRef=useRef<(()=>void)|null>(null)
  dataRef.current={layers,totalDepth}

  useEffect(()=>{
    const el=host.current
    if(!el)return undefined

    const scene=new THREE.Scene()
    scene.background=new THREE.Color(0xf3f5f6)
    const camera=new THREE.PerspectiveCamera(38,1,.1,200)
    const target=new THREE.Vector3(0,0,0)
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true})
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2))
    el.replaceChildren(renderer.domElement)
    renderer.domElement.className='soil-3d-canvas'

    const group=new THREE.Group()
    scene.add(group)
    scene.add(new THREE.HemisphereLight(0xffffff,0x5f6870,2.2))
    const light=new THREE.DirectionalLight(0xffffff,2.6)
    light.position.set(6,10,8)
    scene.add(light)

    let yaw=.65,pitch=.45,radius=15,drag=false,lastX=0,lastY=0

    const disposeGroup=()=>{
      for(const child of group.children){
        if(child instanceof THREE.Mesh){
          child.geometry.dispose()
          const material=child.material
          if(Array.isArray(material))material.forEach(x=>x.dispose())
          else material.dispose()
        }
      }
      group.clear()
    }

    const rebuild=()=>{
      disposeGroup()
      const data=dataRef.current
      const scale=8/Math.max(data.totalDepth,1)
      data.layers.forEach(layer=>{
        const h=Math.max(.08,(layer.bottomDepth-layer.topDepth)*scale)
        const mesh=new THREE.Mesh(
          new THREE.BoxGeometry(5,h,3),
          new THREE.MeshStandardMaterial({color:color(layer.colorClass),roughness:.9,metalness:0})
        )
        mesh.position.y=4-layer.topDepth*scale-h/2
        group.add(mesh)
      })
      const floor=new THREE.Mesh(
        new THREE.BoxGeometry(5,.12,3),
        new THREE.MeshStandardMaterial({color:0x70777b,roughness:1})
      )
      floor.position.y=-4
      group.add(floor)
      render()
    }

    const resize=()=>{
      const w=Math.max(320,el.clientWidth)
      const h=Math.max(280,el.clientHeight||420)
      camera.aspect=w/h
      camera.updateProjectionMatrix()
      renderer.setSize(w,h,false)
      render()
    }

    const render=()=>{
      camera.position.set(radius*Math.cos(pitch)*Math.sin(yaw),radius*Math.sin(pitch),radius*Math.cos(pitch)*Math.cos(yaw))
      camera.lookAt(target)
      renderer.render(scene,camera)
    }

    const down=(e:PointerEvent)=>{
      drag=true;lastX=e.clientX;lastY=e.clientY
      renderer.domElement.setPointerCapture(e.pointerId)
    }
    const move=(e:PointerEvent)=>{
      if(!drag)return
      yaw-=(e.clientX-lastX)*.01
      pitch=Math.max(-1.1,Math.min(1.1,pitch+(e.clientY-lastY)*.008))
      lastX=e.clientX;lastY=e.clientY
      render()
    }
    const up=()=>{drag=false}
    const wheel=(e:WheelEvent)=>{
      e.preventDefault()
      radius=Math.max(7,Math.min(30,radius*(e.deltaY>0?1.08:.92)))
      render()
    }

    renderer.domElement.addEventListener('pointerdown',down)
    renderer.domElement.addEventListener('pointermove',move)
    renderer.domElement.addEventListener('pointerup',up)
    renderer.domElement.addEventListener('pointercancel',up)
    renderer.domElement.addEventListener('wheel',wheel,{passive:false})

    const observer=new ResizeObserver(resize)
    observer.observe(el)
    rebuildRef.current=rebuild
    rebuild()

    return()=>{

      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown',down)
      renderer.domElement.removeEventListener('pointermove',move)
      renderer.domElement.removeEventListener('pointerup',up)
      renderer.domElement.removeEventListener('pointercancel',up)
      renderer.domElement.removeEventListener('wheel',wheel)
      rebuildRef.current=null
      disposeGroup()
      renderer.dispose()
    }
  },[])

  useEffect(()=>{
    rebuildRef.current?.()
  },[layers,totalDepth])

  return <div ref={host} className="soil-3d-viewport" aria-label="Three.js üç boyutlu zemin profili"/>
}
