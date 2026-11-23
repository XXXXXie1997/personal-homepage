import * as THREE from 'three'

import { terrainGLSL } from './landscapeTerrain.js'
import { bendInWind, breezeGLSL } from './landscapeWind.js'

const VIEWS = 4
const TILE = 384
const yAxis = new THREE.Vector3(0, 1, 0)

// Photograph the actual template from four directions under this season's lights.
// Baking once at load also keeps the distant silhouette in sync with model edits.
function bakeViews(renderer, lighting, source, material=source.material) {
  const studio = new THREE.Scene()
  for (const light of lighting.children) {
    if (light.isHemisphereLight) studio.add(light.clone())
    if (light.isDirectionalLight) {
      const key = light.clone()
      key.position.sub(light.target.position).normalize()
      key.target.position.set(0, 0, 0)
      key.castShadow = false
      studio.add(key, key.target)
    }
  }
  const mesh = new THREE.Mesh(source.geometry, material)
  studio.add(mesh)
  source.geometry.computeBoundingBox()
  const { min, max } = source.geometry.boundingBox
  const center = new THREE.Vector3(0, (max.y + min.y) / 2, 0)
  const radius = Math.hypot(Math.max(-min.x, max.x), Math.max(-min.z, max.z))
  const size = Math.max(2 * radius, max.y - min.y + radius * .48) * 1.06
  const camera = new THREE.OrthographicCamera(-size/2, size/2, size/2, -size/2, .01, 12*size)
  const target = new THREE.WebGLRenderTarget(TILE*2, TILE*2, {
    colorSpace: THREE.SRGBColorSpace, samples: 4
  })
  const previous = renderer.getRenderTarget()
  const clear = renderer.getClearColor(new THREE.Color())
  const alpha = renderer.getClearAlpha()
  const autoClear = renderer.autoClear
  try {
    target.viewport.set(0,0,TILE*2,TILE*2)
    renderer.setRenderTarget(target)
    renderer.setClearColor(0, 0)
    renderer.clear()
    renderer.autoClear = false
    for (let i = 0; i < VIEWS; i++) {
      const angle = i * Math.PI / 2
      camera.position.set(Math.sin(angle)*size*3, size*.76, Math.cos(angle)*size*3).add(center)
      camera.lookAt(center)
      // Set the target viewport directly to avoid canvas pixel-ratio scaling.
      target.viewport.set((i%2)*TILE, Math.floor(i/2)*TILE, TILE, TILE)
      renderer.setRenderTarget(target)
      renderer.render(studio, camera)
    }
    // Keep only the resolved atlas. Depth and multisample storage are needed
    // during baking, but retaining them for every season and light is costly.
    const texture=new THREE.FramebufferTexture(TILE*2,TILE*2)
    texture.colorSpace=THREE.SRGBColorSpace
    texture.magFilter=THREE.LinearFilter
    texture.minFilter=THREE.LinearMipmapLinearFilter
    texture.generateMipmaps=true
    renderer.setRenderTarget(previous)
    renderer.copyTextureToTexture(target.texture,texture)
    return {texture,size,center}
  } finally {
    renderer.setRenderTarget(previous)
    renderer.setClearColor(clear, alpha)
    renderer.autoClear = autoClear
    target.dispose()
  }
}

// Keep the distant silhouette fixed. Only shift the colour within leaf pixels
// of the atlas, so an exposed trunk or a snow cap cannot travel with the wind.
function animateLeafPixels(renderer,scene,source,painted,size,wind) {
  const maskMaterial=new THREE.ShaderMaterial({
    side:source.material.side,
    vertexShader:`attribute float _wind_weight;
      varying float flex;
      void main(){flex=_wind_weight;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying float flex;
      void main(){
        gl_FragColor=vec4(vec3(flex),1.);
        #include <colorspace_fragment>
      }`
  })
  let mask
  try { mask=bakeViews(renderer,scene,source,maskMaterial).texture }
  finally { maskMaterial.dispose() }
  painted.addEventListener('dispose',()=>mask.dispose())
  painted.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,wind,{leafMask:{value:mask},atlasScale:{value:.5/size}})
    shader.vertexShader=breezeGLSL+'uniform float atlasScale; varying vec2 leafDrift;\n'+
      shader.vertexShader.replace('#include <project_vertex>',`
        vec2 plantXZ=instanceMatrix[3].xz;
        float gust=gustAt(plantXZ)-.35;
        float horizontal=dot(windDirection,normalize(instanceMatrix[0].xz));
        leafDrift=atlasScale*vec2(horizontal*gust*.019,sin(windTime*2.8+plantXZ.x)*.005);
        #include <project_vertex>
      `)
    shader.fragmentShader='uniform sampler2D leafMask; varying vec2 leafDrift;\n'+
      shader.fragmentShader.replace('#include <map_fragment>',`
        #include <map_fragment>
        float flex=textureLod(leafMask,vMapUv,0.).r;
        vec2 shifted=vMapUv-leafDrift*flex;
        float movable=flex*textureLod(leafMask,shifted,0.).r;
        diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(map,shifted).rgb,movable);
      `)
  }
  painted.customProgramCacheKey=()=>'leaf-atlas'
}

function batch(geometry, material, count) {
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.count = 0
  mesh.frustumCulled = false
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function viewPlane(size, view) {
  const geometry = new THREE.PlaneGeometry(size, size, 1, 3)
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) + view%2)/2, (uv.getY(i) + Math.floor(view/2))/2)
  }
  return geometry
}

// Every blade in a shared clump follows the height field used by Blender, even
// when part of the clump extends over a steep bank.
function groundGrass(material, season) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = terrainGLSL(season)+shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec3 world=(instanceMatrix*vec4(transformed,1.)).xyz;
      float y=-world.z;
      float soil=bedHeight(world.x,y);
      transformed.y+=(soil-instanceMatrix[3].y-.035)/length(instanceMatrix[1].xyz);
    `)
  }
  material.customProgramCacheKey=()=>'conform-grass-'+season
  return material
}
export function prepareVegetation(root, scene, renderer, season, wind, night) {
  const templates = new Map()
  root.updateMatrixWorld(true)
  root.traverse(mesh => {
    if (!mesh.userData.vegetation || !mesh.isMesh) return
    if (!templates.has(mesh.geometry)) templates.set(mesh.geometry, [])
    templates.get(mesh.geometry).push(mesh)
  })
  const batches = []
  const depthMaterials=[]
  for (const originals of templates.values()) {
    const source = originals[0]
    const grass = source.userData.vegetation === 'grass'
    const kind=source.userData.vegetation
    const woody=kind==='tree' || kind==='pine'
    // Previously exported trees have no authored mask. Lock their vertices.
    if (woody && !source.geometry.hasAttribute('_wind_weight')) {
      const count=source.geometry.attributes.position.count
      source.geometry.setAttribute('_wind_weight',new THREE.BufferAttribute(new Uint8Array(count),1))
    }
    const surface=source.material.clone()
    const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide})
    if (grass) { groundGrass(surface,season); groundGrass(depth,season) }
    const near=batch(source.geometry,bendInWind(surface,kind,wind),originals.length)
    near.customDepthMaterial=bendInWind(depth,kind,wind)
    depthMaterials.push(near.customDepthMaterial)
    near.userData.canopy=!grass
    // All fourteen palms share instanced geometry, so distant fronds can flex
    // independently without bending a billboard containing the trunk.
    if (kind==='palm') {
      for (const mesh of originals) {
        near.setMatrixAt(near.count++,mesh.matrixWorld)
        mesh.removeFromParent()
      }
      near.instanceMatrix.needsUpdate=true
      root.add(near)
      continue
    }
    const { texture, size, center } = bakeViews(renderer, scene, source)
    const painted = new THREE.MeshBasicMaterial({
      map: texture, alphaTest: .27, side: THREE.DoubleSide
    })
    if (woody) animateLeafPixels(renderer,scene,source,painted,size,wind)
    if (grass) bendInWind(painted,'grass',wind)
    const cards = Array.from({ length: VIEWS }, (_, view) =>
      batch(viewPlane(size, view), painted, originals.length))
    const instances = originals.map(mesh => {
      const matrix = mesh.matrixWorld.clone()
      const position = center.clone().applyMatrix4(matrix)
      const scale = mesh.getWorldScale(new THREE.Vector3())
      const forward = new THREE.Vector3(0, 0, 1).transformDirection(matrix)
      mesh.removeFromParent()
      return { matrix, position, scale, yaw: Math.atan2(forward.x,forward.z), far: false }
    })
    root.add(near, ...cards)
    batches.push({ near, cards, instances, grass, source, painted, atlases:new Map([[night,texture]]) })
  }
  const previousProjection = new THREE.Matrix4()
  const previousCamera = new THREE.Matrix4()
  const proxy = new THREE.Object3D()
  return {
    relight(night) {
      for (const {source,painted,atlases} of batches) {
        if (!atlases.has(night)) atlases.set(night,bakeViews(renderer,scene,source).texture)
        painted.map=atlases.get(night)
      }
    },
    update(camera,mirrorCamera) {
      if (previousProjection.equals(camera.projectionMatrix) && previousCamera.equals(camera.matrixWorld)) return
      previousProjection.copy(camera.projectionMatrix)
      previousCamera.copy(camera.matrixWorld)
      const frusta=[camera,mirrorCamera].map(view=>new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(view.projectionMatrix,view.matrixWorldInverse)))
      const bounds=new THREE.Sphere()
      for (const entry of batches) {
        const {near,cards,instances,grass}=entry
        if (!near.geometry.boundingSphere) near.geometry.computeBoundingSphere()
        const offscreen=[]
        near.count = 0
        for (const card of cards) card.count = 0
        for (const instance of instances) {
          const { position, matrix, scale, yaw } = instance
          const distance = position.distanceTo(camera.position)
          // A larger tree stays geometric further away. Hysteresis prevents
          // repeated toggles when the camera hovers at the boundary.
          const boundary = grass ? 24 : 24 + Math.min(scale.y,6)*1.5
          instance.far = distance > boundary + (instance.far ? -1.5 : 1.5)
          if (!instance.far) {
            bounds.copy(near.geometry.boundingSphere).applyMatrix4(matrix)
            // Include wind and the grass shader's vertical adjustment on sloped banks.
            bounds.radius+=grass ? 5 : .03*scale.y
            if (frusta.some(frustum=>frustum.intersectsSphere(bounds))) near.setMatrixAt(near.count++,matrix)
            else offscreen.push(matrix)
            continue
          }
          const bearing = Math.atan2(camera.position.x-position.x,camera.position.z-position.z)
          const view = THREE.MathUtils.euclideanModulo(Math.round((bearing-yaw)/(Math.PI/2)), VIEWS)
          proxy.position.copy(position)
          proxy.quaternion.setFromAxisAngle(yAxis, bearing)
          proxy.scale.copy(scale)
          proxy.updateMatrix()
          cards[view].setMatrixAt(cards[view].count++, proxy.matrix)
        }
        // Keep the offscreen suffix for the once-per-view shadow bake.
        entry.visibleCount=near.count
        entry.shadowCount=near.count+offscreen.length
        offscreen.forEach((matrix,index)=>near.setMatrixAt(entry.visibleCount+index,matrix))
        near.instanceMatrix.needsUpdate = true
        for (const card of cards) card.instanceMatrix.needsUpdate = true
      }
      renderer.shadowMap.needsUpdate = true
    },
    includeOffscreenCasters(include) {
      for (const entry of batches) entry.near.count=include ? entry.shadowCount : entry.visibleCount
    },
    dispose() {
      for (const depth of depthMaterials) depth.dispose()
      for (const {atlases,painted} of batches) {
        painted.map=null
        for (const texture of atlases.values()) texture.dispose()
      }
    }
  }
}
