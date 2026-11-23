<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { createLandscape, releaseLandscape } from './landscapeScene.js'
import { createLandscapeFocus } from './landscapeFocus.js'
import { HIT } from './landscapeHits.js'

const props=defineProps({season:String, paused:Boolean, night:Boolean, retry:Number, showPoster:Function})
const emit=defineEmits(['ready','loading','error'])
const surface=ref(null)
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
const seasons=new Map()
const frameInterval=1000/30
let renderer, lens, observer, active, frame, last=0, ticket=0
let nextFrame=0, activeNight, blend, resizeTimer, preparing=false
let foreground=false, selectionPending=false
let width=0,height=0,lost=false,disposed=false,keyboardKind=0

function stop() { cancelAnimationFrame(frame); frame=undefined }
function animate(now) {
  frame=undefined
  if (!active || props.paused || !foreground || lost || disposed) return
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
  nextFrame=last
  if (active && !preparing && !blend && !props.paused && foreground && !lost && !disposed) frame=requestAnimationFrame(animate)
}

function syncForeground(event) {
  const visibleAndFocused=event?.type!=='blur' && !document.hidden && document.hasFocus()
  if (foreground===visibleAndFocused) return
  foreground=visibleAndFocused
  if (!foreground) {
    stop()
    active?.resetStroke()
    blend?.pause()
    if (preparing) {
      ticket++
      preparing=false
      selectionPending=true
    }
    return
  }
  blend?.play()
  if (selectionPending) select()
  else resume()
}

function presentCanvas(canvas, relighting) {
  const layer=surface.value
  const top=layer.lastElementChild
  const opacity=blend && top ? Number(getComputedStyle(top).opacity) : 1
  blend?.cancel()
  blend=null
  if ((!relighting && layer.childElementCount<2) || !top ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (layer.childElementCount!==1 || top!==canvas) layer.replaceChildren(canvas)
    return
  }
  let overlay=top, from=opacity, to=0
  if (!layer.contains(canvas)) {
    layer.replaceChildren(top,canvas)
    overlay=canvas; from=0; to=1
  } else if (top===canvas) {
    if (layer.childElementCount===1) return
    to=1
  }
  // Reverse from the currently visible mix if another click arrives mid-fade.
  const animation=overlay.animate([{opacity:from},{opacity:to}],{
    duration:Math.max(1,700*Math.abs(to-from)),easing:'ease-in-out',fill:'forwards'
  })
  blend=animation
  animation.onfinish=()=>{
    if (blend!==animation) return
    layer.replaceChildren(canvas)
    animation.cancel()
    blend=null
    resume()
  }
}

async function fetchModel(id,signal) {
  const base=import.meta.env.BASE_URL+'scenes/'
  const url=base+id+'.glb'
  if (import.meta.env.PROD && typeof DecompressionStream==='function') {
    const response=await fetch(url+'.gz',{signal})
    if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
      const data=await response.arrayBuffer()
      const magic=new Uint8Array(data,0,Math.min(2,data.byteLength))
      // Some hosts send Content-Encoding and the browser already decoded it.
      if (magic[0]===0x67 && magic[1]===0x6c) return loader.parseAsync(data,base)
      if (magic[0]===0x1f && magic[1]===0x8b) {
        const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'),{signal})
        const decoded=await new Response(stream).arrayBuffer()
        signal.throwIfAborted()
        return loader.parseAsync(decoded,base)
      }
    }
  }
  const response=await fetch(url,{signal})
  if (!response.ok) throw new Error('Scene download failed: '+response.status)
  return loader.parseAsync(await response.arrayBuffer(),base)
}
function seasonEntry(id) {
  if (seasons.has(id)) return seasons.get(id)
  const entry={model:null,landscape:null,controller:new AbortController()}
  seasons.set(id,entry)
  entry.loading=fetchModel(id,entry.controller.signal).then(asset=>{
    if (seasons.get(id)===entry) entry.model=asset.scene
    else releaseLandscape(asset.scene)
  }).catch(error=>{
    if (seasons.get(id)===entry) seasons.delete(id)
    throw error
  }).finally(()=>{entry.controller=null})
  return entry
}

async function select() {
  const request=++ticket
  if (disposed || lost) return
  if (!foreground) {selectionPending=true;return}
  selectionPending=false
  if (!renderer && !initRenderer()) {emit('error');return}
  const bounds=surface.value.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  const id=props.season,night=props.night
  const current=()=>request===ticket && !disposed && !lost
  preparing=true
  stop()
  try {
    for (const [other,entry] of seasons) {
      if (other!==id && entry.controller) {
        seasons.delete(other)
        entry.controller.abort()
      }
    }
    const ratio=Math.min(devicePixelRatio,1.6,Math.sqrt(1920*1080/(bounds.width*bounds.height)))
    const relighting=active && active===seasons.get(id)?.landscape && activeNight!==night
    if (!seasons.get(id)?.landscape?.hasView(night,bounds.width,bounds.height,ratio)) {
      if (!relighting) await props.showPoster()
      else if (!document.hidden) await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
      if (request!==ticket || disposed || lost) return
    }
    const entry=seasonEntry(id)
    if (!entry.landscape && !entry.model) await entry.loading
    if (request!==ticket || disposed || lost) return
    active?.resetStroke()
    if (width!==bounds.width || height!==bounds.height || renderer.getPixelRatio()!==ratio) {
      width=bounds.width
      height=bounds.height
      renderer.setDrawingBufferSize(width,height,ratio)
    }
    if (!entry.landscape) {
      const model=entry.model
      entry.model=null
      entry.landscape=createLandscape(renderer,model,id,night,lens)
    }
    const landscape=entry.landscape
    const canvas=await landscape.prepare(night,width,height,current)
    if (!current()) return
    presentCanvas(canvas,relighting)
    active=landscape
    activeNight=night
    emit('ready',id)
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
  } finally {
    if (current()) {preparing=false;resume()}
  }
}

function brush(event) {
  if (!active || props.paused || !foreground || lost || event.isPrimary===false) return
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
  if (!active || props.paused || !foreground || lost || !['Enter',' '].includes(event.key)) return
  event.preventDefault()
  const kinds=[HIT.water,HIT.canopy,HIT.snow]
  for (let n=0;n<kinds.length;n++) if (active.keyboardBrush(kinds[keyboardKind++%kinds.length])) return
}
function clearCache() {
  ticket++
  blend?.cancel()
  blend=null
  stop()
  active=null
  for (const {landscape,model,controller} of seasons.values()) {
    controller?.abort()
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
  syncForeground()
  observer=new ResizeObserver(([entry])=>{
    clearTimeout(resizeTimer)
    if (entry.contentRect.width!==width || entry.contentRect.height!==height) {
      if (!width) select()
      else resizeTimer=setTimeout(select,180)
    }
  })
  observer.observe(surface.value)
  document.addEventListener('visibilitychange',syncForeground)
  window.addEventListener('blur',syncForeground)
  window.addEventListener('focus',syncForeground)
})
watch(()=>[props.season,props.night,props.retry],select)
watch(()=>props.paused,()=>{active?.resetStroke();resume()})
onBeforeUnmount(()=>{
  disposed=true
  clearTimeout(resizeTimer)
  observer?.disconnect()
  document.removeEventListener('visibilitychange',syncForeground)
  window.removeEventListener('blur',syncForeground)
  window.removeEventListener('focus',syncForeground)
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
div :deep(canvas) {position:absolute;inset:0;width:100%;height:100%;display:block}
</style>
