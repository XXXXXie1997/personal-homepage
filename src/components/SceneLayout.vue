<script setup>
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useTheme } from '../composables/useTheme.js'
const SeasonLandscape = defineAsyncComponent(()=>import('./SeasonLandscape.vue'))
const { isDark } = useTheme()
const seasons = [
  {id:'spring', name:'春', full:'春日群山', sky:'#a4cfc4', horizon:'#f6edcf'},
  {id:'summer', name:'夏', full:'夏日海岸', sky:'#79c8df', horizon:'#e3f6ed'},
  {id:'autumn', name:'秋', full:'秋日峡谷', sky:'#cbb3a2', horizon:'#ffe2bf'},
  {id:'winter', name:'冬', full:'雪落山村', sky:'#99b7d0', horizon:'#efe9de'}
]
const season = ref(seasons[3])
const displayed = ref(null)
const loading = ref(true)
const failed = ref(false)
const retry = ref(0)
function loadingStarted() {loading.value=true;failed.value=false}
function presented(id) {
  displayed.value=id
  loading.value=failed.value=false
}
function unavailable() {loading.value=false;failed.value=true}

const paused = ref(matchMedia('(prefers-reduced-motion: reduce)').matches)
const motionLabel = computed(() => paused.value ? '播放动态' : '暂停动态')
const styles = computed(()=>({'--sky':season.value.sky,'--horizon':season.value.horizon}))
const poster = id => import.meta.env.BASE_URL+'scenes/'+id+'.webp'
function select(item) {
  if (item!==season.value) season.value=item
  else if (failed.value) retry.value++
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
  <div class="scene-layout" :class="{ reading: !home }" :style="styles">
    <div class="world">
      <img v-if="failed && !displayed" class="poster" :src="poster(season.id)" alt="" />
      <SeasonLandscape ref="landscape" class="landscape" :season="season.id" :paused="paused" :night="isDark" :retry="retry"
        @ready="presented" @loading="loadingStarted" @error="unavailable" />
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
.world {position:fixed;inset:0;z-index:-1;pointer-events:auto;background:linear-gradient(var(--sky),var(--horizon) 60%,var(--sky))}
.poster,.landscape {position:absolute;inset:0;width:100%;height:100%}
.poster {object-fit:cover}
main {flex:1;display:grid;align-items:start;pointer-events:none}
footer {justify-self:center;margin:4px 0 max(8px,env(safe-area-inset-bottom));font-size:12px;pointer-events:none}
footer a {pointer-events:auto;color:#fff;background:#1b303dc9;padding:3px 10px;border-radius:4px}
.scene-dock {
  position:fixed;
  right:max(var(--dock-inset),env(safe-area-inset-right));
  bottom:max(var(--dock-inset),env(safe-area-inset-bottom));
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
:global(body.dark .world) {background:linear-gradient(#091326,#233654)}
:global(body.dark .world .poster) {filter:brightness(.42) sepia(.35) hue-rotate(158deg) saturate(.78)}
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
    grid-template-rows:minmax(0,1fr) calc(var(--header-height) - var(--footer-row)) var(--footer-row);
    padding-bottom:env(safe-area-inset-bottom);
  }
  .reading main {padding-block:calc(12px + env(safe-area-inset-bottom)) 12px}
  .reading main :deep(.reading-panel) {margin-block:0}
  .scene-dock,.reading .scene-dock {position:relative;inset:auto;place-self:center;align-items:center;margin:0;gap:8px}
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
