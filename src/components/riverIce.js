import * as THREE from 'three'
import { terrainGLSL } from './landscapeTerrain.js'

export function riverIce(uniforms) {
  return new THREE.ShaderMaterial({
    name:'Clear river ice',
    uniforms,
    vertexShader:`
      varying vec3 world;
      void main(){
        world=(modelMatrix*vec4(position,1.)).xyz;
        world.y=-.20;
        gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
      }`,
    fragmentShader:`
      varying vec3 world;
      uniform sampler2D underlay,reflection;
      uniform mat4 reflectedView,projectionMatrix;
      uniform vec2 viewport;
      uniform vec3 sunDir,sunlight;
      uniform float night;
      ${terrainGLSL('winter')}

      // A tapered fissure within the sheet. Its ends fade separately so the
      // small fractures never join into a repeating network across the ice.
      float fissure(vec2 p,vec2 a,vec2 b){
        vec2 axis=b-a;
        float t=clamp(dot(p-a,axis)/dot(axis,axis),0.,1.);
        float bend=sin(t*3.14159)*(.039*sin(t*8.)+.017*sin(t*21.));
        vec2 line=a+t*axis+bend*normalize(vec2(-axis.y,axis.x));
        float d=length(p-line);
        float pixel=max(.005,fwidth(d));
        return (1.-smoothstep(.006,.006+pixel,d))*min(1.,.012/pixel)
               *smoothstep(0.,.17,t)*(1.-smoothstep(.70,1.,t));
      }
      float trappedAir(vec2 p){
        vec2 cell=floor(p);
        vec2 seed=fract(sin(vec2(dot(cell,vec2(19.3,73.1)),dot(cell,vec2(57.1,31.7))))*4375.17);
        vec2 offset=fract(p)-(.18+.64*seed);
        float d=min(length(offset*vec2(1.,1.4))-.029,
                    length((offset-vec2(.045,.032))*vec2(1.,1.25))-.012);
        float pixel=max(.004,fwidth(d));
        return step(.76,seed.y)*(1.-smoothstep(-pixel,pixel,d))*min(1.,.016/pixel);
      }
      void main(){
        vec2 p=world.xz;
        vec3 eye=normalize(cameraPosition-world);
        float depth=max(0.,world.y-bedHeight(p.x,-p.y));
        float grazing=1.-clamp(eye.y,0.,1.);
        float thickness=min(depth,.21);
        vec3 ray=refract(-eye,vec3(0.,1.,0.),1./1.31);
        vec3 through=world+ray*thickness/max(.30,-ray.y);
        vec4 exitClip=projectionMatrix*viewMatrix*vec4(through,1.);
        vec2 exitUV=.5+.5*exitClip.xy/exitClip.w;
        vec2 uv=gl_FragCoord.xy/viewport;
        vec3 bed=texture2D(underlay,clamp(mix(uv,exitUV,.65),.001,.999)).rgb;
        float pathLength=thickness/max(.45,-ray.y);
        vec3 transmission=exp(-vec3(2.65,.98,.42)*pathLength);
        vec3 frostLight=mix(vec3(.55,.83,.91),vec3(.085,.16,.25),night);
        vec3 body=mix(vec3(.08,.22,.30),vec3(.016,.045,.075),night);
        vec3 ice=bed*transmission+body*(1.-exp(-1.8*pathLength));
        ice=mix(ice,frostLight,.43*trappedAir(through.xz*2.6)*smoothstep(.05,.18,depth));

        vec4 projected=reflectedView*vec4(world,1.);
        vec2 mirrorUV=.5+.5*projected.xy/projected.w;
        vec3 mirror=texture2D(reflection,clamp(mirrorUV,.001,.999)).rgb;
        ice=mix(ice,mirror,.14+.68*pow(grazing,3.));

        vec2 local=vec2(through.x-riverCenter(-through.z),-through.z);
        float seam=fissure(local,vec2(-1.7,-14.8),vec2(.72,-12.5))
                  +fissure(local,vec2(-.80,-13.95),vec2(-.32,-12.6))
                  +fissure(local,vec2(.35,-8.8),vec2(1.65,-10.0))
                  +fissure(local,vec2(-1.6,-3.3),vec2(.56,-1.8))
                  +fissure(local,vec2(.1,7.5),vec2(1.7,5.8));
        float rim=1.-smoothstep(.015,.31,depth);
        ice=mix(ice,frostLight,.36*rim+.52*clamp(seam,0.,1.));
        float gleam=pow(max(dot(reflect(-sunDir,vec3(0.,1.,0.)),eye),0.),320.);
        gl_FragColor=vec4(ice+sunlight*gleam*.34,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  })
}
