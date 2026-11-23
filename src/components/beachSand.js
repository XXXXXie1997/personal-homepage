import * as THREE from 'three'
import { riverCenter, bedHeight, terrainGLSL } from './landscapeTerrain.js'
import { seaHeight } from './coastalWaves.js'

// The texture follows the shoreline. Each texel holds the moisture of a
// particular piece of sand, including after the water no longer covers it.
const columns=128, rows=512
const left=-4, span=6, startY=-24, length=78
const halfLife=36

export const beachCoordinatesGLSL=terrainGLSL('summer')+`
  vec2 beachUV(vec2 xz){
    float along=-xz.y;
    return vec2((xz.x-riverCenter(along)-(${left}.))/${span}.,
                (along-(${startY}.))/${length}.);
  }`

export function prepareBeachSand(banks) {
  const moisture=new Float32Array(columns*rows)
  const bytes=new Uint8Array(moisture.length)
  const texture=new THREE.DataTexture(bytes,columns,rows,THREE.RedFormat)
  const flooded=new Float32Array(moisture.length).fill(-100)
  const lastFlood=new THREE.DataTexture(flooded,columns,rows,THREE.RedFormat,THREE.FloatType)
  lastFlood.needsUpdate=true
  texture.minFilter=texture.magFilter=THREE.LinearFilter
  const material=banks.material.clone()
  banks.material=material
  material.addEventListener('dispose',()=>{texture.dispose();lastFlood.dispose()})
  material.onBeforeCompile=shader=>{
    shader.uniforms.beachMoisture={value:texture}
    shader.vertexShader='varying vec3 sandWorld;\n'+shader.vertexShader.replace('#include <project_vertex>',
      'sandWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>')
    shader.fragmentShader=`uniform sampler2D beachMoisture;
      varying vec3 sandWorld;
      ${beachCoordinatesGLSL}
    `+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec2 uvBeach=beachUV(sandWorld.xz);
      float wet=texture2D(beachMoisture,uvBeach).r;
      diffuseColor.rgb*=mix(vec3(1.),vec3(.57,.57,.55),wet);
    `).replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.44,wet);')
  }

  let last=-48.5
  function update(time,trackFlood=false) {
    if (!trackFlood && time-last<.10) return
    const retention=Math.pow(.5,(time-last)/halfLife)
    for (let j=0;j<rows;j++) {
      const y=startY+(j+.5)*length/rows
      const coast=riverCenter(y,'summer')
      // The beach rises more steeply than the swell, giving one waterline.
      let lo=left, hi=left+span
      for (let k=0;k<9;k++) {
        const mid=(lo+hi)*.5, x=coast+mid
        if (seaHeight(x,-y,time)>bedHeight(x,-y,'summer')) lo=mid
        else hi=mid
      }
      const front=((lo+hi)*.5-left)*columns/span
      for (let i=0;i<columns;i++) {
        const index=j*columns+i
        // Dampness wicks a short distance past the last fully saturated sand.
        const behindFront=(front-i-.5)*span/columns
        if(trackFlood && behindFront>=0) flooded[index]=time
        const coverage=THREE.MathUtils.smoothstep(behindFront,-.30,.065)
        moisture[index]=Math.max(coverage,moisture[index]*retention)
        bytes[index]=Math.round(255*moisture[index])
      }
    }
    last=time
    texture.needsUpdate=true
    if(trackFlood) lastFlood.needsUpdate=true
  }
  // The coast is already wet on arrival, including during a paused first frame.
  for(let t=-48;t<=0;t+=.5) update(t)
  return {update,lastFlood}
}
