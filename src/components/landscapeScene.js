import * as THREE from 'three'
import { createBreeze, breezeGLSL } from './landscapeWind.js'
import { createLighting } from './landscapeLighting.js'

import { prepareVegetation } from './vegetation.js'

import { captureHits } from './landscapeHits.js'
import { createResponses } from './landscapeResponses.js'

export function releaseLandscape(root) {
  root?.traverse(child => {
    if (child.isInstancedMesh) child.dispose()
    child.geometry?.dispose()
    if (child.material) {
      for (const mat of [].concat(child.material)) {
        if (mat.map && !mat.map.isRenderTargetTexture) mat.map.dispose()
        mat.normalMap?.dispose()
        mat.dispose()
      }
    }
  })
}

function weather(renderer, season, night, wind) {
  const snow = season === 'winter'
  const count = snow ? 480 : season === 'summer' ? 0 : 36
  const coords = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    coords[i*3] = Math.random()*48-24
    coords[i*3+1] = Math.random()*22
    coords[i*3+2] = Math.random()*46-24
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position',new THREE.BufferAttribute(coords,3))
  const material = new THREE.ShaderMaterial({
    uniforms: { ...wind, night:{value:Number(night)}, tint: { value: new THREE.Color(snow ? '#fff' : season==='spring' ? '#ffc5d7' : '#df8b3e') }, time:{value:0}, scale:{value:renderer.getPixelRatio()} },
    vertexShader: `${breezeGLSL}
      uniform float time,scale; void main(){vec3 p=position; p.y=mod(p.y-time*.7,22.); p.xz=mod(p.xz+vec2(24.,23.)+windDirection*(time*.38+sin(time*.55+p.z)*.32),vec2(48.,46.))-vec2(24.,23.); vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(54./-mv.z,1.,4.)*scale;}`,
    fragmentShader: `uniform vec3 tint; uniform float night;
      void main() {
        vec2 uv=gl_PointCoord-.5;
        float r=length(uv);
        if(r>=.49)discard;
        gl_FragColor=vec4(tint*mix(vec3(1.),vec3(.35,.47,.68),night),1.-smoothstep(.25,.5,r));
        #include <colorspace_fragment>
      }`,
    transparent:true
  })
  return new THREE.Points(geom,material)
}

// Each season owns one scene graph. Each visited lighting state owns its
// finished canvas and the render passes needed to continue animating it.
export function createLandscape(renderer, model, season, initialNight, lens) {
  const scene=new THREE.Scene()
  const camera=new THREE.PerspectiveCamera(43,1,.2,180)
  const mirrorCamera=new THREE.PerspectiveCamera()
  const reflectionClip=[new THREE.Plane(new THREE.Vector3(0,1,0),.20)]
  const waterTime={value:0}
  const wind=createBreeze(waterTime)
  const lighting=createLighting(scene,renderer)
  const views=new Map()
  // Keep the near bank and first row of trees or cabins inside the clear range.
  const focusDistance={spring:23,summer:22,autumn:24,winter:26}[season]
  let vegetation, responses, particles, hits, activeView
  let hitWidth=0, hitHeight=0, elapsed=0, currentNight=initialNight

  function disposeView(view) {
    for (const target of [view.backdrop,view.mirrorBackdrop,view.underlay,view.reflection,view.shadow]) target?.dispose()
    if (!view.canvas.isConnected) view.canvas.width=view.canvas.height=0
  }

  function dispose() {
    lighting.sun.shadow.map=null
    for (const view of views.values()) disposeView(view)
    views.clear()
    vegetation?.dispose()
    releaseLandscape(model)
    releaseLandscape(particles)
    releaseLandscape(responses?.falling)
    lighting.dispose()
  }

  try {
    lighting.apply(season,initialNight)
    model.traverse(child=>{
      if (child.isMesh) child.castShadow=child.receiveShadow=true
    })
    vegetation=prepareVegetation(model,scene,renderer,season,wind,initialNight)
    responses=createResponses(renderer,model,season,lighting,waterTime,wind)
    particles=weather(renderer,season,initialNight,wind)
    scene.add(model,particles,responses.falling)
    lighting.sky.layers.set(1)
    const ridges=model.getObjectByName('Ridges')
    ridges?.layers.set(1)
    for (const item of scene.children) if(item.isLight)item.layers.enable(1)
  } catch (error) {
    dispose()
    throw error
  }

  function renderTarget(width,height,withDepth=false) {
    const w=Math.max(1,Math.round(width)), h=Math.max(1,Math.round(height))
    return new THREE.WebGLRenderTarget(w,h,{
      type:renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
      colorSpace:THREE.LinearSRGBColorSpace,
      depthTexture:withDepth ? new THREE.DepthTexture(w,h,THREE.UnsignedIntType) : null
    })
  }

  function photographReflection(view) {
    const previous=renderer.getRenderTarget()
    const waterVisible=responses.water.visible
    const clipping=renderer.clippingPlanes
    const background=scene.background
    try {
      scene.background=view.mirrorBackdrop.texture
      responses.water.visible=false
      renderer.clippingPlanes=reflectionClip
      lens.render(scene,mirrorCamera,view,focusDistance,true)
    } finally {
      renderer.setRenderTarget(previous)
      responses.water.visible=waterVisible
      renderer.clippingPlanes=clipping
      scene.background=background
    }
  }

  function frameCamera(width,height) {
    camera.aspect=width/height
    if (season==='autumn') {
      camera.fov=width<650 ? 53 : 45
      camera.position.set(1.5,5.9,20)
      camera.lookAt(.4,3.1,-12)
    } else if (season==='summer') {
      camera.far=1600
      camera.fov=width<650 ? 49 : 44
      camera.position.set(1,4.8,16)
      camera.lookAt(width<650 ? 5.9 : -1.8,3.5,-12)
    } else {
      camera.fov=43
      camera.position.set(0,7.5,20)
      camera.lookAt(width<650 ? 3 : 1.0,2.65,-6)
    }
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    mirrorCamera.copy(camera)
    mirrorCamera.position.y=2*(-.20)-camera.position.y
    const direction=camera.getWorldDirection(new THREE.Vector3())
    direction.y*=-1
    mirrorCamera.up.set(0,-1,0)
    mirrorCamera.lookAt(direction.add(mirrorCamera.position))
    mirrorCamera.updateMatrixWorld()
    responses.water.material.uniforms.reflectedView.value.multiplyMatrices(
      mirrorCamera.projectionMatrix,mirrorCamera.matrixWorldInverse)
    vegetation.update(camera,mirrorCamera)
    lighting.follow(camera.position)
  }

  function createView(width,height,size) {
    const canvas=document.createElement('canvas')
    canvas.width=size.x
    canvas.height=size.y
    const bitmap=renderer.domElement.transferToImageBitmap && canvas.getContext('bitmaprenderer')
    const context=bitmap || canvas.getContext('2d')
    if (!context) throw new Error('Could not create landscape presentation canvas')
    return {
      width,height,canvas,shadow:null,shadowMatrix:new THREE.Matrix4(),
      backdrop:renderTarget(size.x*.60,size.y*.60,true),
      mirrorBackdrop:renderTarget(size.x*.40,size.y*.40,true),
      underlay:renderTarget(size.x,size.y),
      reflection:renderTarget(size.x*.72,size.y*.72),
      present:bitmap
        ? ()=>bitmap.transferFromImageBitmap(renderer.domElement.transferToImageBitmap())
        : ()=>context.drawImage(renderer.domElement,0,0)
    }
  }

  function bakeBackdrops(view) {
    const previous=renderer.getRenderTarget(), clipping=renderer.clippingPlanes
    try {
      scene.background=null
      for (const [eye,target] of [[camera,view.backdrop],[mirrorCamera,view.mirrorBackdrop]]) {
        eye.layers.set(1)
        lighting.follow(eye.position)
        renderer.clippingPlanes=eye===mirrorCamera ? reflectionClip : clipping
        renderer.setRenderTarget(target)
        renderer.render(scene,eye)
      }
    } finally {
      camera.layers.set(0)
      mirrorCamera.layers.set(0)
      lighting.follow(camera.position)
      renderer.clippingPlanes=clipping
      renderer.setRenderTarget(previous)
    }
  }

  function renderFrame(delta) {
    elapsed+=delta
    waterTime.value=particles.material.uniforms.time.value=elapsed
    responses.update(elapsed)
    photographReflection(activeView)
    lens.render(scene,camera,activeView,focusDistance)
    activeView.present()
  }

  function prepare(night,width,height) {
    const size=renderer.getDrawingBufferSize(new THREE.Vector2())
    if (currentNight!==night) {
      lighting.apply(season,night)
      vegetation.relight(night)
      currentNight=night
    }
    frameCamera(width,height)
    const uniforms=responses.water.material.uniforms
    uniforms.night.value=particles.material.uniforms.night.value=Number(night)
    uniforms.sunDir.value.copy(lighting.sun.position).sub(lighting.sun.target.position).normalize()
    uniforms.viewport.value.copy(size)
    let view=views.get(night)
    if (view && (view.width!==width || view.height!==height || view.canvas.width!==size.x || view.canvas.height!==size.y)) {
      views.delete(night)
      disposeView(view)
      view=null
    }
    const cached=Boolean(view)
    if (!view) {
      view=createView(width,height,size)
      views.set(night,view)
    }
    activeView=view
    scene.background=view.backdrop.texture
    uniforms.underlay.value=view.underlay.texture
    uniforms.reflection.value=view.reflection.texture
    lighting.sun.shadow.map=view.shadow
    if (cached) {
      lighting.sun.shadow.matrix.copy(view.shadowMatrix)
      renderer.shadowMap.needsUpdate=false
    } else {
      scene.background=null
      try {
        bakeBackdrops(view)
        scene.background=view.backdrop.texture
        particles.visible=responses.falling.visible=responses.water.visible=false
        responses.showTrails(false)
        vegetation.includeOffscreenCasters(true)
        renderer.shadowMap.needsUpdate=true
        renderer.setRenderTarget(view.underlay)
        renderer.render(scene,camera)
        view.shadow=lighting.sun.shadow.map
        view.shadowMatrix.copy(lighting.sun.shadow.matrix)
      } finally {
        responses.showTrails(true)
        vegetation.includeOffscreenCasters(false)
        renderer.setRenderTarget(null)
        camera.layers.set(0)
        particles.visible=responses.falling.visible=responses.water.visible=true
      }
    }
    if (width!==hitWidth || height!==hitHeight) {
      hits=captureHits(renderer,model,camera,season,width,height)
      hitWidth=width
      hitHeight=height
    }
    if (!cached) renderFrame(0)
    return view.canvas
  }

  let pointer=null
  function resetStroke() {
    pointer=null
    responses.resetStroke()
  }
  function brush(x,y) {
    const drawsTrail=season==='winter' || season==='summer'
    if (drawsTrail && pointer && hits)
      hits.walk(pointer,x,y,elapsed,hit=>responses.brush(hit,elapsed))
    else responses.brush(hits?.at(x,y,elapsed),elapsed)
    if (drawsTrail) pointer={x,y}
  }

  return {
    prepare,renderFrame,dispose,
    hasView(night,width,height,ratio) {
      const view=views.get(night)
      return view?.width===width && view.height===height &&
        view.canvas.width===Math.floor(width*ratio) && view.canvas.height===Math.floor(height*ratio)
    },
    resetStroke,brush,
    keyboardBrush(kind){
      for(let y=.65;y>.25;y-=.025)for(let x=.52;x<.95;x+=.025){
        const hit=hits?.at(x,y,elapsed)
        if(hit?.kind===kind){resetStroke();responses.brush(hit,elapsed);resetStroke();return true}
      }
      return false
    }
  }
}
