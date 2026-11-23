import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { gzip } from 'node:zlib'
import { prerenderPages } from './scripts/prerender-pages.js'

const compress=promisify(gzip)
export default defineConfig({
  plugins: [vue(), {
    name:'inline-scene-preview',
    transformIndexHtml: {
      order:'post',
      async handler(html) {
        const [script, samples] = await Promise.all(['./src/scenePreview.js','./src/assets/dots-winter.json']
          .map(path => readFile(new URL(path, import.meta.url), 'utf8')))
        return html.replace('/* inline-scene-preview */', () => script)
          .replace('/* winter-samples */{}', () => samples.trim())
      }
    }
  }, {
    name:'compressed-landscapes',
    apply:'build',
    async generateBundle() {
      await Promise.all(['spring','summer','autumn','winter'].map(async id=>{
        const name='scenes/'+id+'.glb'
        const data=await readFile(new URL('./public/'+name,import.meta.url))
        this.emitFile({type:'asset',fileName:name+'.gz',source:await compress(data,{level:9})})
      }))
    }
  }, prerenderPages()],
})
