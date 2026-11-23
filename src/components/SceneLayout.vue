<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useTheme } from '../composables/useTheme.js'
import seasonDots from '../assets/dots-seasons.json'
const SeasonLandscape = shallowRef(null)
const { isDark } = useTheme()
const seasons = [
  {id:'spring', name:'春', full:'春日群山'},
  {id:'summer', name:'夏', full:'夏日海岸'},
  {id:'autumn', name:'秋', full:'秋日峡谷'},
  {id:'winter', name:'冬', full:'雪落山村'}
]
const season = ref(seasons[3])
const displayed = ref(null)
const loading = ref(true)
const failed = ref(false)
const retry = ref(0)
const preview=import.meta.env.SSR ? null : document.getElementById('scene-preview')
const mobileQuery=import.meta.env.SSR ? null : matchMedia('(max-width: 649px)')
const mobile=ref(mobileQuery?.matches)
const previewKey=computed(()=>season.value.id+'-'+(isDark.value?'night':'day')+'-'+(mobile.value?'mobile':'wide'))
function updateSize(){mobile.value=mobileQuery.matches}
watch(previewKey, key => {
  if (loading.value || failed.value) preview.show(key,seasonDots)
})
async function showPoster() {
  loading.value=true
  failed.value=false
  await preview.show(previewKey.value,seasonDots)
  if (!document.hidden) await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
}
let importing=false
async function loadRenderer() {
  if (import.meta.env.SSR || SeasonLandscape.value || importing) return
  importing=true
  try {
    let key
    do {key=previewKey.value; await showPoster()} while (key!==previewKey.value)
    SeasonLandscape.value=(await import('./SeasonLandscape.vue')).default
  } catch {unavailable()}
  finally {importing=false}
}
onMounted(()=>{
  paused.value=matchMedia('(prefers-reduced-motion: reduce)').matches
  mobileQuery.addEventListener('change',updateSize)
  loadRenderer()
})
onBeforeUnmount(()=>mobileQuery.removeEventListener('change',updateSize))
function presented(id) {
  preview.stopHover()
  displayed.value=id
  loading.value=failed.value=false
}
function unavailable() {
  preview.show(previewKey.value,seasonDots)
  loading.value=false
  failed.value=true
}

const paused = ref(false)
const motionLabel = computed(() => paused.value ? '播放动态' : '暂停动态')
function select(item) {
  if (item!==season.value) season.value=item
  else if (failed.value) retry.value++
  loadRenderer()
}

const route = useRoute()
const home = computed(() => route.name === 'home')
const scrollArea = ref(null)
const landscape = ref(null)
function brushGutter(event) {
  if (event.target === scrollArea.value) landscape.value?.brush(event)
  else landscape.value?.resetStroke()
}
watch(() => route.path, () => scrollArea.value?.scrollTo({top: 0, behavior: 'instant'}), {flush: 'post'})
</script>

<template>
  <div class="scene-layout" :class="{ reading: !home, 'scene-loading': loading }">
    <div class="world">
      <component v-if="SeasonLandscape" :is="SeasonLandscape" ref="landscape" class="landscape"
        :class="{presented: !loading && !failed}" :inert="loading || failed"
        :season="season.id" :paused="paused" :night="isDark" :retry="retry" :show-poster="showPoster"
        @ready="presented" @loading="showPoster" @error="unavailable" />
    </div>
    <div ref="scrollArea" class="page-scroll" @pointermove="brushGutter" @pointerdown="brushGutter"
      @pointerleave="landscape?.resetStroke()" @pointercancel="landscape?.resetStroke()">
      <main><slot /></main>
    </div>
    <section class="scene-dock" aria-label="场景选择">
      <div v-if="failed" class="scene-status" role="status">
        场景暂不可用 <button @click="select(season)">重试</button>
      </div>
      <button class="motion-toggle" type="button" :aria-label="motionLabel" :title="motionLabel"
        :disabled="!displayed" @click="paused = !paused">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path v-if="paused" d="M7 4.8v14.4L19 12z" />
          <path v-else d="M6 5h4v14H6zm8 0h4v14h-4z" />
        </svg>
      </button>
      <div class="chooser" role="group" aria-label="切换季节">
        <button v-for="item in seasons" :key="item.id" type="button" :title="item.full" :data-season="item.id"
          :aria-label="item.full" :aria-pressed="item.id === season.id" :aria-busy="loading && item.id === season.id"
          @click="select(item)">
          <span v-if="loading && item.id === season.id" class="scene-spinner" aria-hidden="true"></span>
          <template v-else>{{ item.name }}</template>
        </button>
      </div>
      <span v-if="loading" class="loading-note" role="status">场景加载中，带宽有限还请稍候...</span>
    </section>
    <footer><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">蒙ICP备2024018901号-1</a></footer>
  </div>
</template>

<style scoped>
.scene-layout {
  --dock-inset: clamp(16px, 2vw, 32px);
  height: 100vh;
  height: 100dvh;
  padding-top: var(--header-height);
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  isolation: isolate;
}
.page-scroll {min-height:0;overflow-y:auto;scrollbar-gutter:stable both-edges;display:flex;flex-direction:column}
.world {position:fixed;inset:0;z-index:-1;pointer-events:auto}
.landscape {position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .2s ease-out}
.landscape.presented {opacity:1;transition:opacity .65s ease-in-out}
@media (prefers-reduced-motion:reduce) {.landscape,.landscape.presented {transition:none}}
main {flex:1;display:grid;align-items:start;pointer-events:none}
footer {justify-self:center;margin:4px 0 max(8px,env(safe-area-inset-bottom));font-size:12px;pointer-events:none}
footer a {pointer-events:auto;color:#fff;background:#1b303dc9;padding:3px 10px;border-radius:4px}
.scene-dock {
  position:fixed;
  right:max(var(--dock-inset),env(safe-area-inset-right));
  bottom:max(var(--dock-inset),calc(25px + env(safe-area-inset-bottom)));
  z-index:2;
  display:flex;
  align-items:flex-end;
  gap:14px;
  color:#f6f7f4;
  pointer-events:none;
}
.chooser,.motion-toggle,.scene-status {
  pointer-events:auto;
  border:1px solid #ffffff57;
  border-radius:8px;
  background:#192d3bcc;
  backdrop-filter:blur(10px);
  box-shadow:0 3px 14px #10233026;
}
.chooser {
  display:grid;
  grid-template-columns:repeat(2,1fr);
  grid-template-rows:repeat(2,1fr);
  width:108px;
  aspect-ratio:1;
  padding:5px;
  gap:2px;
}
.chooser button {display:grid;place-items:center;border-radius:4px;color:inherit;font:500 21px/1 "Songti SC","SimSun",serif}
.chooser button:hover,.motion-toggle:hover:enabled {background-color:#405660}
.chooser [data-season="spring"] {--season-accent:#98d69d}
.chooser [data-season="summer"] {--season-accent:#f5d46b}
.chooser [data-season="autumn"] {--season-accent:#f38a67}
.chooser button[aria-pressed="true"] {background:var(--season-accent,#e7ede5);color:#20353f}
.scene-spinner {
  width:20px;
  height:20px;
  border:2px solid #20353f40;
  border-top-color:currentColor;
  border-radius:50%;
  animation:scene-spin .8s linear infinite;
}
@keyframes scene-spin {to {transform:rotate(1turn)}}
@media (prefers-reduced-motion:reduce) {.scene-spinner {animation:none}}
.motion-toggle {display:grid;place-items:center;width:40px;height:40px;color:inherit}
.motion-toggle:disabled {opacity:.65;cursor:default}
.scene-dock button:focus-visible {outline:2px solid #fff;outline-offset:2px}
.scene-status {position:absolute;right:0;bottom:calc(100% + 6px);padding:4px 8px;white-space:nowrap;font-size:12px}
.scene-status button {color:inherit;text-decoration:underline}
.loading-note {
  position:absolute;top:calc(100% + 3px);right:0;white-space:nowrap;
  padding:1px 6px;border-radius:4px;background:#1b303dd9;color:#fafaf7;
  font-size:11px;line-height:15px;pointer-events:none;
}
@media (prefers-reduced-motion:no-preference) {
  .loading-note {animation:loading-nudge 7s ease-in-out infinite}
  @keyframes loading-nudge {
    0%,90%,100% {transform:none}
    93% {transform:rotate(-1.2deg)}
    96% {transform:rotate(1deg)}
  }
}
@media screen {
  .reading .page-scroll {display:grid;grid-template-rows:minmax(0,1fr);overflow:clip;scrollbar-gutter:auto}
  .reading main {min-height:0;grid-template-rows:minmax(0,1fr);align-items:stretch}
  .reading main :deep(.reading-panel) {min-height:0;overflow-y:auto;overscroll-behavior-y:contain}
}
@media (max-width:1439px) {
  .reading {grid-template-rows:minmax(0,1fr) auto auto}
  .reading .scene-dock {position:relative;inset:auto;justify-self:end;margin:6px var(--dock-inset) 4px}
}
@media screen and (max-width:767px), screen and (pointer:coarse) and (max-height:540px) {
  .scene-layout {
    --footer-row:24px;
    --note-space:0px;
    grid-template-rows:minmax(0,1fr) calc(var(--header-height) - var(--footer-row) + var(--note-space)) var(--footer-row);
    padding-bottom:env(safe-area-inset-bottom);
  }
  .scene-loading {--note-space:19px}
  .reading main {padding-block:calc(12px + env(safe-area-inset-bottom)) 12px}
  .reading main :deep(.reading-panel) {margin-block:0}
  .scene-dock,.reading .scene-dock {position:relative;inset:auto;place-self:center;align-items:center;margin:0;gap:8px;padding-bottom:var(--note-space)}
  .loading-note {top:auto;bottom:0;right:auto;left:0;width:100%;text-align:center}
  .chooser {grid-template:34px / repeat(4,44px);width:auto;aspect-ratio:auto;padding:2px}
  .chooser button {font-size:19px}
  .motion-toggle {width:40px;height:40px}
  footer {align-self:center;margin:0;line-height:16px}
  footer a {display:block;padding-block:2px}
}
@media print {
  .scene-layout {display:block;height:auto;padding:0}
  .page-scroll {display:block;overflow:visible}
  main {display:block}
  .world,.scene-dock,footer {display:none}
}
</style>
