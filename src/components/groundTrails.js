import * as THREE from 'three'
import { beachCoordinatesGLSL } from './beachSand.js'

const radius = .19
const lifetime = 7

// Draw all living brush segments into a world-space height field in one pass.
// MAX blending gives overlapping segments a single continuous indentation.
export function createGroundTrails(renderer, banks, drifts, beach=null) {
  const bounds = new THREE.Box3().setFromObject(banks)
  if (drifts) bounds.expandByObject(drifts)
  const padding = radius * 2
  const origin = new THREE.Vector2(bounds.min.x - padding, bounds.min.z - padding)
  const size = new THREE.Vector2(bounds.max.x - bounds.min.x + 2 * padding,
    bounds.max.z - bounds.min.z + 2 * padding)
  const density = Math.min(24, renderer.capabilities.maxTextureSize / Math.max(size.x, size.y))
  const target = new THREE.WebGLRenderTarget(Math.ceil(size.x * density), Math.ceil(size.y * density), {
    format: THREE.RGFormat, depthBuffer: false, stencilBuffer: false
  })
  const uniforms = { origin: {value: origin}, fieldSize: {value: size}, now: {value: 0} }
  if (beach) uniforms.lastFlood={value:beach.lastFlood}
  const material = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    vertexShader: `
      attribute vec4 endpoints;
      attribute vec2 birth;
      uniform vec2 origin,fieldSize;
      varying vec2 alongAcross,created;
      varying float span;
      ${beach ? 'varying vec2 strokeWorld;' : ''}
      void main(){
        vec2 delta=endpoints.zw-endpoints.xy;
        span=length(delta);
        vec2 axis=span>.00001 ? delta/span : vec2(1.,0.);
        float pad=${padding};
        alongAcross=vec2(mix(-pad,span+pad,position.x),position.y*pad);
        vec2 world=endpoints.xy+axis*alongAcross.x+vec2(-axis.y,axis.x)*alongAcross.y;
        ${beach ? 'strokeWorld=world;' : ''}
        created=birth;
        gl_Position=vec4((world-origin)/fieldSize*2.-1.,0.,1.);
      }`,
    fragmentShader: `
      uniform float now;
      varying vec2 alongAcross,created;
      varying float span;
      ${beach ? 'varying vec2 strokeWorld; uniform sampler2D lastFlood;'+beachCoordinatesGLSL : ''}
      void main(){
        float along=clamp(alongAcross.x,0.,span);
        float d=length(alongAcross-vec2(along,0.))/${radius};
        float born=mix(created.x,created.y,along/max(span,.00001));
        ${beach ? `
          vec2 shore=beachUV(strokeWorld);
          if(shore.x<1. && texture2D(lastFlood,shore).r>=born)discard;
        ` : ''}
        float fade=(1.-smoothstep(2.,${lifetime.toFixed(1)},now-born))*(1.-smoothstep(1.6,2.,d));
        gl_FragColor=vec4(exp(-1.6*d*d)*fade,exp(-.7*d*d)*fade,0.,1.);
      }`
  })
  const segments = []
  let capacity = 64, dirty = false, needsClear = true
  function geometry() {
    const geo = new THREE.InstancedBufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0,-1,0, 1,-1,0, 1,1,0, 0,1,0], 3))
    geo.setIndex([0,1,2, 0,2,3])
    for (const [name, components] of [['endpoints',4], ['birth',2]]) {
      geo.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(capacity * components), components)
        .setUsage(THREE.DynamicDrawUsage))
    }
    geo.instanceCount = 0
    return geo
  }
  const mesh = new THREE.Mesh(geometry(), material)
  mesh.frustumCulled = false
  const scene = new THREE.Scene(), camera = new THREE.Camera()
  scene.add(mesh)
  const painted = new THREE.Box2()
  const visible = {value: false}
  const snow = beach ? banks.material : banks.material.clone()
  const prepare=snow.onBeforeCompile.bind(snow)
  snow.customProgramCacheKey=()=>beach ? 'sand-grooves' : 'snow-grooves'
  snow.onBeforeCompile = shader => {
    prepare(shader)
    shader.uniforms.hasSnowTrails = visible
    shader.uniforms.snowField = {value: target.texture}
    shader.uniforms.snowOrigin = uniforms.origin
    shader.uniforms.snowSize = uniforms.fieldSize
    shader.vertexShader = 'varying vec2 snowXZ;\n' + shader.vertexShader.replace(
      '#include <worldpos_vertex>', '#include <worldpos_vertex>\nsnowXZ=(modelMatrix*vec4(transformed,1.)).xz;')
    shader.fragmentShader = 'varying vec2 snowXZ; uniform sampler2D snowField; uniform vec2 snowOrigin,snowSize; uniform bool hasSnowTrails;\n' +
      shader.fragmentShader.replace('#include <normal_fragment_maps>', `
        #include <normal_fragment_maps>
        if(hasSnowTrails){
          vec2 uvSnow=(snowXZ-snowOrigin)/snowSize;
          vec2 stepUV=1./vec2(textureSize(snowField,0));
          vec2 mark=texture2D(snowField,uvSnow).rg;
          if(mark.g>0.){
            vec2 slope=vec2(texture2D(snowField,uvSnow+vec2(stepUV.x,0.)).r-texture2D(snowField,uvSnow-vec2(stepUV.x,0.)).r,
                            texture2D(snowField,uvSnow+vec2(0.,stepUV.y)).r-texture2D(snowField,uvSnow-vec2(0.,stepUV.y)).r);
            normal=normalize(normal+mat3(viewMatrix)*vec3(slope.x,0.,slope.y)*.027/(stepUV.x*snowSize.x));
            diffuseColor.rgb*=mix(vec3(1.),${beach ? 'vec3(.53,.42,.32)' : 'vec3(.49,.66,.80)'},mark.r);
            diffuseColor.rgb+=vec3(${beach ? '.095' : '.22'})*max(0.,mark.g-mark.r);
          }
        }
      `)
  }
  for (const surface of [banks, drifts].filter(Boolean)) {
    surface.material = snow
    if (!beach) surface.userData.snow = true
  }
  const start = performance.now()
  const clock = () => (performance.now() - start) / 1000
  const clearColor = new THREE.Color()
  const corner = new THREE.Vector2()
  snow.addEventListener('dispose', () => {
    mesh.geometry.dispose()
    material.dispose()
    target.dispose()
  })
  return {
    clock,
    get active(){return segments.length>0},
    show(show){visible.value=show && segments.length>0},
    add(a, b, from, to) {
      segments.push({a,b,from,to})
      painted.expandByPoint(corner.set(a.x,a.z))
      painted.expandByPoint(corner.set(b.x,b.z))
      dirty = true
    },
    update(now=clock()) {
      let expired = 0
      while (expired < segments.length && now - segments[expired].to >= lifetime) expired++
      if (expired) {
        segments.splice(0, expired)
        dirty = true
      }
      if (!segments.length && !needsClear) return
      visible.value = segments.length > 0
      if (segments.length > capacity) {
        while (capacity < segments.length) capacity *= 2
        mesh.geometry.dispose()
        mesh.geometry = geometry()
      }
      if (dirty) {
        const geo = mesh.geometry
        const {endpoints, birth} = geo.attributes
        segments.forEach(({a,b,from,to}, i) => {
          endpoints.setXYZW(i,a.x,a.z,b.x,b.z)
          birth.setXY(i,from,to)
        })
        geo.instanceCount = segments.length
        for (const attr of [endpoints,birth]) {
          if (segments.length) attr.addUpdateRange(0, segments.length * attr.itemSize)
          attr.needsUpdate = true
        }
        dirty = false
      }
      uniforms.now.value = now
      if (!painted.isEmpty()) {
        const sx = target.width / size.x, sy = target.height / size.y
        const left = Math.floor((painted.min.x - padding - origin.x) * sx)
        const bottom = Math.floor((painted.min.y - padding - origin.y) * sy)
        target.scissor.set(left, bottom, Math.ceil((painted.max.x + padding - origin.x) * sx) - left,
          Math.ceil((painted.max.y + padding - origin.y) * sy) - bottom)
        target.scissorTest = true
      }
      const previous = renderer.getRenderTarget(), alpha = renderer.getClearAlpha()
      renderer.getClearColor(clearColor)
      try {
        renderer.setRenderTarget(target)
        renderer.setClearColor(0,0)
        if (segments.length) renderer.render(scene,camera)
        else renderer.clear()
      } finally {
        renderer.setClearColor(clearColor,alpha)
        renderer.setRenderTarget(previous)
      }
      needsClear = segments.length > 0
      if (!needsClear) painted.makeEmpty()
    }
  }
}
