import * as THREE from 'three'

const seasons = {
  winter: { sun: '#ffd4a2', altitude: .44, x: .65, sky: '#7198bc', horizon: '#f4d9c3', ground: '#a8bbd3', strength: 2.65, fill: 1.05 },
  spring: { sun: '#ffebbf', altitude: .67, x: -.62, sky: '#91bed1', horizon: '#f4edda', ground: '#a6b894', strength: 2.4, fill: 1.15 },
  summer: { sun: '#fff2d8', altitude: 1.25, x: -.58, sky: '#599dc9', horizon: '#e0f2ef', ground: '#dbc499', strength: 3.15, fill: 1.22 },
  autumn: { sun: '#ffcf99', altitude: .94, x: -.49, sky: '#8ba9b9', horizon: '#f7d5ae', ground: '#ba9c89', strength: 2.85, fill: .99 }
}

function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      night: { value:0 }, zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
      sunlight: { value: new THREE.Color() }, direction: { value: new THREE.Vector3() }
    },
    vertexShader: `
      varying vec3 ray;
      void main() {
        ray = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      varying vec3 ray;
      uniform float night;
      uniform vec3 zenith, horizon, sunlight, direction;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise2(vec2 p) {
        vec2 i=floor(p), f=fract(p);
        f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                   mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      void main() {
        vec3 d=normalize(ray);
        float h=max(d.y,0.);
        vec3 color=mix(horizon,zenith,smoothstep(-.02,.72,h));
        vec2 uv=d.xz/max(.09,h+.09)*2.3;
        float cloud=.55*noise2(uv)+.28*noise2(uv*2.08)+.17*noise2(uv*4.19);
        vec3 vapor=mix(vec3(1.,.98,.94),vec3(.057,.083,.15),night);
        color=mix(color,vapor,smoothstep(.50,.78,cloud)*.43*smoothstep(.015,.14,h));
        float angle=max(dot(d,direction),0.);
        if(night>.5) {
          vec2 starUV=vec2(atan(d.x,-d.z),asin(d.y))*196.;
          vec2 cell=floor(starUV);
          vec2 center=.2+.6*vec2(hash(cell),hash(cell+17.));
          float dist=length(fract(starUV)-center);
          float star=step(.963,hash(cell+91.))*exp(-dist*dist*56.);
          color+=vec3(.46,.60,.9)*star*smoothstep(-.01,.12,h)*(1.-cloud*.65);
          float radius=length(d-direction);
          float disc=1.-smoothstep(.0138,.0149,radius);
          float craters=.8+.20*noise2((d.xy-direction.xy)*290.);
          color+=sunlight*(disc*craters*2.4+.24*exp(-radius*42.)+.048*exp(-radius*9.));
        } else {
          color+=sunlight*(.32*pow(angle,20.)+.79*pow(angle,320.)+2.6*smoothstep(.99965,.99989,angle));
        }
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  })
  const sky=new THREE.Mesh(new THREE.SphereGeometry(115,32,16),material)
  sky.renderOrder=-10
  return sky
}

export function createLighting(scene, renderer, model) {
  const sky=createSky()
  const fill=new THREE.HemisphereLight()
  const sun=new THREE.DirectionalLight()
  sun.castShadow=true
  const shadow=sun.shadow
  shadow.mapSize.setScalar(window.innerWidth<700 ? 1024 : 2048)
  Object.assign(shadow.camera,{left:-32,right:32,top:30,bottom:-30,near:1,far:118})
  shadow.camera.updateProjectionMatrix()
  shadow.bias=-.00018
  shadow.normalBias=.024
  shadow.radius=2
  sun.target.position.set(0,0,-7)
  const porchLights=model.getObjectsByProperty('type','Object3D')
    .filter(anchor=>anchor.userData.porchLamp)
    .map(anchor=>{
      const light=new THREE.PointLight('#ffb968',0,5,2)
      anchor.add(light)
      return light
    })
  scene.add(sky,fill,sun,sun.target)
  renderer.shadowMap.enabled=true
  renderer.shadowMap.type=THREE.PCFShadowMap
  renderer.shadowMap.autoUpdate=false
  renderer.toneMapping=THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure=1.12

  return {
    sky, sun,
    apply(id,night) {
      const preset=seasons[id]
      for(const lamp of porchLights) {
        lamp.intensity=night ? 3.2 : .7
      }
      const direction=night ? new THREE.Vector3(.19,.11,-1) : new THREE.Vector3(preset.x,preset.altitude,-.64)
      direction.normalize()
      const uniforms=sky.material.uniforms
      uniforms.night.value=Number(night)
      uniforms.zenith.value.set(night ? '#09162d' : preset.sky)
      uniforms.horizon.value.set(night ? '#324965' : preset.horizon)
      uniforms.direction.value.copy(direction)
      uniforms.sunlight.value.set(night ? '#d6e7ff' : preset.sun)
      fill.color.set(night ? '#a6c6ff' : '#e0efff')
      fill.groundColor.set(night ? '#47577e' : preset.ground)
      fill.intensity=night ? .65 : preset.fill
      sun.color.set(night ? '#c7ddff' : preset.sun)
      sun.intensity=night ? 1.10 : preset.strength
      sun.position.copy(sun.target.position).addScaledVector(direction,57)
      renderer.shadowMap.needsUpdate=true
      scene.fog=new THREE.Fog(night ? '#273e5a' : preset.horizon,night ? 22 : 35,night ? 97 : 115)
    },
    follow(position) { sky.position.copy(position) },
    dispose() { sky.geometry.dispose(); sky.material.dispose(); sun.shadow.dispose() }
  }
}
