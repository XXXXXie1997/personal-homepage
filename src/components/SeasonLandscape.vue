<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { createLandscape, releaseLandscape } from './landscapeScene.js'
import { createLandscapeFocus } from './landscapeFocus.js'
import { HIT } from './landscapeHits.js'

const props=defineProps({season:String, paused:Boolean, night:Boolean, retry:Number})
const emit=defineEmits(['ready','loading','error'])
const surface=ref(null)
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
const seasons=new Map()
const frameInterval=1000/30
let renderer, lens, observer, active, frame, last=0, ticket=0
let nextFrame=0
let width=0,height=0,lost=false,disposed=false,keyboardKind=0

function stop() { cancelAnimationFrame(frame); frame=undefined }
function animate(now) {
  frame=undefined
  if (!active || props.paused || document.hidden || lost || disposed) return
  if (now+.5>=nextFrame) {
    active.renderFrame(Math.min(.08,(now-last)/1000))
    last=now
    // Stay on cadence at fractional refresh rates and skip missed deadlines.
    nextFrame+=frameInterval*Math.max(1,Math.floor((now+.5-nextFrame)/frameInterval)+1)
  }
  frame=requestAnimationFrame(animate)
}
function resume() {
  stop()
  last=performance.now()
  nextFrame=last+frameInterval
  if (active && !props.paused && !document.hidden && !lost) frame=requestAnimationFrame(animate)
}

function seasonEntry(id) {
  if (seasons.has(id)) return seasons.get(id)
  const entry={model:null,landscape:null}
  seasons.set(id,entry)
  entry.loading=loader.loadAsync(import.meta.env.BASE_URL+'scenes/'+id+'.glb').then(asset=>{
    if (seasons.get(id)===entry) entry.model=asset.scene
    else releaseLandscape(asset.scene)
  }).catch(error=>{
    if (seasons.get(id)===entry) seasons.delete(id)
    throw error
  })
  return entry
}

async function select() {
  const request=++ticket
  if (disposed || lost) return
  if (!renderer && !initRenderer()) {emit('error');return}
  const bounds=surface.value.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  const id=props.season,night=props.night
  try {
    const entry=seasonEntry(id)
    if (!entry.landscape && !entry.model) {
      emit('loading')
      await entry.loading
    }
    if (request!==ticket || disposed || lost) return
    const ratio=Math.min(devicePixelRatio,1.6)
    if (!entry.landscape?.hasView(night,bounds.width,bounds.height,ratio)) {
      emit('loading')
      // Give the status indicator a paint before synchronous GPU preparation.
      if (!document.hidden) await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
      if (request!==ticket || disposed || lost) return
    }
    stop()
    active?.resetStroke()
    if (renderer.getPixelRatio()!==ratio) renderer.setPixelRatio(ratio)
    if (!entry.landscape) {
      const model=entry.model
      entry.model=null
      entry.landscape=createLandscape(renderer,model,id,night,lens)
    }
    const landscape=entry.landscape
    if (width!==bounds.width || height!==bounds.height) {
      width=bounds.width
      height=bounds.height
      renderer.setSize(width,height,false)
    }
    const canvas=landscape.prepare(night,width,height)
    if (surface.value.firstChild!==canvas) surface.value.replaceChildren(canvas)
    active=landscape
    emit('ready',id)
    resume()
  } catch (error) {
    if (request!==ticket || disposed || lost) return
    console.error('Scene preparation failed',error)
    const entry=seasons.get(id)
    if (entry) {
      if (active && active===entry.landscape) {
        preserveDisplayedFrame()
        active=null
      }
      seasons.delete(id)
      entry.landscape?.dispose()
      releaseLandscape(entry.model)
    }
    emit('error')
    resume()
  }
}

function brush(event) {
  if (!active || props.paused || lost || event.isPrimary===false) return
  const box=surface.value.getBoundingClientRect()
  if (event.type==='pointerdown') active.resetStroke()
  if ((props.season==='winter' || props.season==='summer') && event.type==='pointermove') {
    for (const sample of event.getCoalescedEvents?.() || [])
      active.brush((sample.clientX-box.left)/box.width,(sample.clientY-box.top)/box.height)
  }
  active.brush((event.clientX-box.left)/box.width,(event.clientY-box.top)/box.height)
}
function resetStroke() {active?.resetStroke()}
defineExpose({brush,resetStroke})
function keyboardBrush(event) {
  if (!active || props.paused || lost || !['Enter',' '].includes(event.key)) return
  event.preventDefault()
  const kinds=[HIT.water,HIT.canopy,HIT.snow]
  for (let n=0;n<kinds.length;n++) if (active.keyboardBrush(kinds[keyboardKind++%kinds.length])) return
}
function clearCache() {
  ticket++
  stop()
  active=null
  for (const {landscape,model} of seasons.values()) {
    landscape?.dispose()
    releaseLandscape(model)
  }
  seasons.clear()
}
function preserveDisplayedFrame() {
  const canvas=surface.value?.firstChild
  if (canvas) {
    const still=canvas.cloneNode()
    still.getContext('2d').drawImage(canvas,0,0)
    surface.value.replaceChildren(still)
  }
}
function contextLost(e) {
  e.preventDefault()
  lost=true
  preserveDisplayedFrame()
  clearCache()
  emit('loading')
}
function restored() {lost=false;select()}

function initRenderer() {
  const options={alpha:true,antialias:true,powerPreference:'low-power'}
  if (typeof OffscreenCanvas!=='undefined') {
    try {renderer=new THREE.WebGLRenderer({...options,canvas:new OffscreenCanvas(1,1)})} catch {}
  }
  if (!renderer) {
    try {renderer=new THREE.WebGLRenderer(options)} catch {return false}
  }
  renderer.domElement.addEventListener('webglcontextlost',contextLost)
  renderer.domElement.addEventListener('webglcontextrestored',restored)
  lens=createLandscapeFocus(renderer)
  return true
}
onMounted(()=>{
  observer=new ResizeObserver(([entry])=>{
    if (entry.contentRect.width!==width || entry.contentRect.height!==height) select()
  })
  observer.observe(surface.value)
  document.addEventListener('visibilitychange',resume)
  select()
})
watch(()=>[props.season,props.night,props.retry],select)
watch(()=>props.paused,()=>{active?.resetStroke();resume()})
onBeforeUnmount(()=>{
  disposed=true
  observer?.disconnect()
  document.removeEventListener('visibilitychange',resume)
  clearCache()
  renderer?.domElement.removeEventListener('webglcontextlost',contextLost)
  renderer?.domElement.removeEventListener('webglcontextrestored',restored)
  lens?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <div ref="surface" tabindex="0" role="img" aria-label="互动四季风景。轻拂或轻点景物，键盘按回车体验场景反馈。"
    @pointerdown="brush" @pointermove="brush" @pointerleave="active?.resetStroke()"
    @pointercancel="active?.resetStroke()" @keydown="keyboardBrush" />
</template>
<style scoped>
div {width:100%;height:100%;touch-action:pan-y}
div :deep(canvas) {width:100%;height:100%;display:block}
</style>
