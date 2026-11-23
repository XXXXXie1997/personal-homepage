import * as THREE from 'three'
import { breezeGLSL } from './landscapeWind.js'

export function createChimneySmoke(model, wind, night) {
  const outlets=model.getObjectsByProperty('type','Object3D').filter(node=>node.userData.chimneyScale)
  if (!outlets.length) return null
  const origins=[], scales=[]
  for (const node of outlets) {
    origins.push(...node.getWorldPosition(new THREE.Vector3()).toArray())
    scales.push(node.userData.chimneyScale)
  }
  // Five staggered puffs share the outlet attributes and a single draw call.
  const puffCount=5
  const quad=new THREE.PlaneGeometry(1,1)
  const geometry=new THREE.InstancedBufferGeometry()
  geometry.setIndex(quad.index)
  geometry.setAttribute('uv',quad.attributes.uv)
  geometry.setAttribute('position',quad.attributes.position)
  geometry.setAttribute('outlet',new THREE.InstancedBufferAttribute(new Float32Array(origins),3,false,puffCount))
  geometry.setAttribute('size',new THREE.InstancedBufferAttribute(new Float32Array(scales),1,false,puffCount))
  geometry.instanceCount=outlets.length*puffCount
  const material=new THREE.ShaderMaterial({
    uniforms:{...wind,night},
    transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
    vertexShader:`${breezeGLSL}
      attribute vec3 outlet;
      attribute float size;
      varying vec2 puff;
      varying float age,seed;
      void main() {
        float chimney=dot(outlet.xz,vec2(.77,.39));
        float slot=mod(float(gl_InstanceID),${puffCount}.0);
        float cycle=windTime*(.17+.012*sin(chimney))+fract(chimney)+slot/${puffCount}.0;
        age=fract(cycle);
        seed=chimney+slot*2.41+floor(cycle)*1.73;
        vec3 center=outlet;
        center.y+=(.06+age*2.45)*size;
        center.xz+=size*age*(windDirection*age*(1.45+.32*gustAt(outlet.xz))
          +vec2(-windDirection.y,windDirection.x)*sin(seed+age*3.)*.20);
        vec4 p=viewMatrix*vec4(center,1.);
        float width=size*(.28+1.05*age)*(.98+.13*sin(seed));
        p.xy+=position.xy*vec2(width,width*(.73+.09*cos(seed)));
        puff=uv*2.-1.;
        gl_Position=projectionMatrix*p;
      }`,
    fragmentShader:`
      uniform float night;
      varying vec2 puff;
      varying float age,seed;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                   mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      void main() {
        vec2 flow=puff*2.+vec2(seed,age*.8);
        float billow=.68*noise(flow)+.32*noise(2.4*flow+seed);
        vec2 q=puff;
        q.y+=.28*sin(seed+age*2.)*q.x;
        float edge=min(length(q+vec2(.29,.11)),length(q-vec2(.23,.12))*.93);
        float density=(1.-smoothstep(.20,.64,edge+(billow-.5)*.45))*(.28+.35*billow);
        density*=smoothstep(0.,.05,age)*(1.-smoothstep(.47,1.,age));
        vec3 daylight=mix(vec3(.22,.24,.26),vec3(.42,.44,.46),age);
        vec3 tint=mix(daylight,vec3(.23,.29,.39),night);
        gl_FragColor=vec4(tint,density);
        #include <colorspace_fragment>
      }`
  })
  const smoke=new THREE.Mesh(geometry,material)
  smoke.frustumCulled=false
  return smoke
}
