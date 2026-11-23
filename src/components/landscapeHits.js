import * as THREE from 'three'
import { seaHeight } from './coastalWaves.js'

// One fixed-view depth/ID image accounts for occlusion by grass, bridges,
// rocks and foliage. Pointer events only look up a pixel in the CPU copy.
export const HIT = { none: 0, water: 1, canopy: 2, snow: 3, sand: 4 }

export function captureHits(renderer, root, camera, season, width, height) {
  const scale = Math.min(1, 900 / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const pixels = new Uint8Array(w*h*4)
  const target = new THREE.WebGLRenderTarget(w,h)
  const stage = new THREE.Scene()
  const cache = new Map()
  const originals = []
  const parent = root.parent
  const previous = renderer.getRenderTarget()
  try {
    stage.add(root)
    root.traverse(mesh => {
      if (!mesh.isMesh) return
      const source = mesh.material
      const kind = mesh.userData.water ? HIT.water : mesh.userData.canopy ? HIT.canopy :
        mesh.userData.snow ? HIT.snow :
        mesh.name === 'Banks' && season === 'summer' ? HIT.sand : HIT.none
      const key = source.uuid + kind
      if (!cache.has(key)) {
        const material = new THREE.MeshBasicMaterial({
          map: source.map || null, alphaTest: source.alphaTest || 0,
          side: source.side, toneMapped: false, blending: THREE.NoBlending
        })
        material.onBeforeCompile = shader => {
          // Preserve the displacement that seats grass on sloping banks.
          if (source.customProgramCacheKey().includes('-wind-')) source.onBeforeCompile(shader)
          // Cache the seabed even where the tide happened to be high during
          // capture. The live wave intersection is resolved on pointer input.
          if(season==='summer' && kind===HIT.water) {
            shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
              #include <project_vertex>
              vec4 seaFloor=modelMatrix*vec4(transformed,1.);
              seaFloor.y=-2.;
              gl_Position=projectionMatrix*viewMatrix*seaFloor;`)
          }
          shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
            float d=floor(gl_FragCoord.z*16777215.+.5);
            gl_FragColor=vec4(floor(d/65536.),mod(floor(d/256.),256.),mod(d,256.),${kind}.0)/255.;
          `)
        }
        material.customProgramCacheKey = () => key
        cache.set(key,material)
      }
      originals.push([mesh,source])
      mesh.material=cache.get(key)
    })
    renderer.setRenderTarget(target)
    renderer.clear()
    renderer.render(stage,camera)
    renderer.readRenderTargetPixels(target,0,0,w,h,pixels)
  } finally {
    for (const [mesh,material] of originals) mesh.material=material
    parent.add(root)
    renderer.setRenderTarget(previous)
    for (const material of cache.values()) material.dispose()
    target.dispose()
  }

  function at(x,y,time=0) {
    const col=Math.floor(x*w), row=Math.floor((1-y)*h)
    if (col<0 || col>=w || row<0 || row>=h) return null
    const i=(row*w+col)*4
    let kind=pixels[i+3]
    if (!kind || kind>HIT.sand) return null
    const depth=(pixels[i]*65536+pixels[i+1]*256+pixels[i+2])/16777215
    const point=kind===HIT.snow || kind===HIT.sand
      ? new THREE.Vector3(x*2-1,1-y*2,depth*2-1)
      : new THREE.Vector3((col+.5)/w*2-1,(row+.5)/h*2-1,depth*2-1)
    point.unproject(camera)
    if (season==='summer' && (kind===HIT.water || kind===HIT.sand)) {
      // Keep the cached occlusion test for trees and props. Only the ocean
      // surface moves along this ray as swash covers or exposes the sand.
      const floorDistance=point.distanceTo(camera.position)
      if (floorDistance>45) return null
      const ray=point.clone().sub(camera.position).normalize()
      if (ray.y>=-.01) return null
      const surface=point.clone()
      for(let step=0;step<5;step++) {
        const height=seaHeight(surface.x,surface.z,time)
        surface.copy(camera.position).addScaledVector(ray,(height-camera.position.y)/ray.y)
      }
      if(kind!==HIT.sand || surface.distanceTo(camera.position)<floorDistance){
        point.copy(surface)
        kind=HIT.water
      }
    }
    return point.distanceTo(camera.position)<34 ? {kind,point} : null
  }
  // Walk the cached hit image in screen order, including occluders between
  // sparse pointer events. Each contiguous stretch of snow forms one stroke.
  function walk(from,x,y,time,visit) {
    const dx=x-from.x, dy=y-from.y
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx)*w,Math.abs(dy)*h)))
    for(let i=1;i<=steps;i++) visit(at(from.x+dx*i/steps,from.y+dy*i/steps,time))
  }
  return {at,walk}
}
