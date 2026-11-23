import * as THREE from 'three'
import { breezeGLSL } from './landscapeWind.js'
import { HIT } from './landscapeHits.js'

import { riverCenter, bedHeight, terrainGLSL } from './landscapeTerrain.js'
import { coastalWavesGLSL } from './coastalWaves.js'
import { riverIce } from './riverIce.js'
import { prepareBeachSand } from './beachSand.js'
import { createGroundTrails } from './groundTrails.js'

function gravel(root,season) {
  const ocean=season==='summer'
  let seed=681
  const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)
  const count=ocean ? 1100 : 1700
  const material=new THREE.MeshStandardMaterial({roughness:.72})
  // Winter's shore mesh also has a snow primitive. Only share the rock maps.
  root.getObjectByName('Shore_details')?.traverse(mesh=>{
    if(mesh.material?.name==='Weathered pebble'){
      material.map=mesh.material.map
      material.normalMap=mesh.material.normalMap
      material.normalScale.copy(mesh.material.normalScale).multiplyScalar(.8)
    }
  })
  if(material.map && material.normalMap){
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`
        #include <uv_vertex>
        vec2 stoneOffset=fract(instanceMatrix[3].xz*vec2(.43,.77));
        vMapUv+=stoneOffset;
        vNormalMapUv+=stoneOffset;
      `)
    }
  }
  const stones=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material,count)
  const stone=new THREE.Object3D()
  const white=new THREE.Color(1,1,1)
  const palette=['#9d9e88','#b8ad8c','#aba388','#788f88','#c5bd9e','#899487']
  let used=0
  for (let i=0;i<count;i++) {
    const z=random()*50-33, y=-z
    const river=riverCenter(y,season)
    const x=river+(ocean ? -random()*21 : (random()-.5)*4.9)
    const h=bedHeight(x,z,season)
    if (h>-.24) continue
    const radius=.045+Math.pow(random(),2)*.21
    stone.position.set(x,h+.025,z)
    stone.rotation.set(random()*.4,random()*6,random()*.3)
    stone.scale.set(radius*1.3,radius*.51,radius*.87)
    stone.updateMatrix()
    stones.setMatrixAt(used,stone.matrix)
    const tint=new THREE.Color(palette[Math.floor(random()*palette.length)])
    if(material.map) tint.lerp(white,.5)
    stones.setColorAt(used++,tint)
  }
  stones.count=used
  stones.receiveShadow=true
  return stones
}

const rippleCount=12
const emptyEvents=n=>Array.from({length:n},()=>new THREE.Vector4(0,0,-100,0))

function clearWater(season,time,ripples,uniforms,wind) {
  const ocean=season==='summer'
  return new THREE.ShaderMaterial({
    transparent:ocean,
    uniforms:{
      ...uniforms,...wind,time,ripples:{value:ripples}
    },
    vertexShader:`
      varying vec3 world;
      ${ocean ? 'uniform float time;'+coastalWavesGLSL : ''}
      void main() {
        world=(modelMatrix*vec4(position,1.)).xyz;
        ${ocean ? 'world.y=swellAt(travelAt(world.xz),time).x;' : ''}
        gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
      }`,
    fragmentShader:`
      varying vec3 world;
      ${breezeGLSL}
      uniform sampler2D underlay,reflection;
      uniform mat4 reflectedView;
      ${ocean ? 'uniform mat4 projectionMatrix;' : ''}
      uniform float night;
      uniform vec2 viewport;
      uniform float time;
      uniform vec4 ripples[${rippleCount}];
      uniform vec3 sunDir,sunlight;
      ${ocean ? coastalWavesGLSL : terrainGLSL(season)}
      void main() {
        vec2 p=world.xz;
        ${ocean ? `
          float range=distance(p,cameraPosition.xz);
          float haze=1.-exp(-range/280.);
          vec3 openSea=mix(vec3(.035,.21,.28),vec3(.20,.39,.48),haze);
          openSea*=mix(vec3(1.),vec3(.13,.20,.31),night);
          if(range>=100.){
            gl_FragColor=vec4(openSea,1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            return;
          }
        ` : ''}
        float y=-p.y;
        float channel=riverCenter(y);
        float bed=bedHeight(p.x,y);
        float depth=clamp(world.y-bed,0.,1.3);
        vec2 side=vec2(-windDirection.y,windDirection.x);
        float along=dot(p,windDirection), across=dot(p,side);
        float gust=gustAt(p);
        float wave1=sin(along*4.8-time*2.1+.72*sin(across*1.25));
        float wave2=sin(along*8.3+across*.65-time*3.45);
        vec2 slope=windDirection*(wave1*.036+wave2*.017)*(.52+.78*gust)
                  +side*.008*cos(across*1.65+along*.67-time*.8);
        ${ocean ? `
          float travel=travelAt(p);
          vec3 swell=swellAt(travel,time);
          slope*=mix(.20,.85,smoothstep(.015,.65,depth));
          slope-=swell.y*vec2(1.,(travelAt(p+vec2(0.,.1))-travel)*10.);
        ` : ''}
        float crest=0.;
        for(int i=0;i<${rippleCount};i++){
          vec2 offset=p-ripples[i].xy;
          float age=time-ripples[i].z, d=length(offset);
          float radius=age*.98;
          float phase=d-radius;
          float wave=exp(-phase*phase*13.)*exp(-age*1.15)*smoothstep(0.,.10,age);
          wave*=1.-smoothstep(2.6,3.2,age);
          slope+=offset/max(.015,d)*cos(phase*24.)*wave*.24;
          crest+=pow(max(0.,cos(phase*24.)),5.)*wave;
        }
        vec3 n=normalize(vec3(slope.x,1.,slope.y));
        vec3 eye=normalize(cameraPosition-world);
        vec2 screen=gl_FragCoord.xy/viewport;
        ${ocean ? `
          vec3 through=refract(-eye,n,1./1.333);
          vec3 floorPoint=world+through*(depth/max(.20,-through.y));
          vec4 floorClip=projectionMatrix*viewMatrix*vec4(floorPoint,1.);
          // Keep the transmitted image registered with exposed stones while
          // the thin film blends into the shore; bend it only in deeper water.
          vec2 bedUV=mix(screen,.5+.5*floorClip.xy/floorClip.w,smoothstep(.24,.62,depth));
        ` : `
          vec2 bedUV=screen+(mat3(viewMatrix)*vec3(slope.x,0.,slope.y)).xy*.011*depth;
        `}
        vec3 bottom=texture2D(underlay,clamp(bedUV,.001,.999)).rgb;
        float opticalDepth=depth+${season==='summer' ? 'max(0.,channel-p.x-5.)*.13' : '0.'};
        float path=opticalDepth/max(.42,dot(eye,n));
        vec3 transmission=exp(-vec3(.94,.41,.28)*path);
        vec3 scatter=${season==='summer' ? 'vec3(.025,.25,.29)' : 'vec3(.048,.195,.202)'};
        scatter*=mix(vec3(1.),vec3(.17,.24,.38),night);
        vec3 color=bottom*transmission+scatter*(1.-transmission);
        vec3 mirrorPoint=${ocean ? 'world+reflect(-eye,n)*mix(5.,12.,smoothstep(.10,1.,depth))' : 'vec3(world.x,-.20,world.z)'};
        vec4 mirrored=reflectedView*vec4(mirrorPoint,1.);
        vec2 mirrorUV=mirrored.xy/mirrored.w*.5+.5;
        ${ocean ? '' : 'mirrorUV+=vec2(dot(slope,vec2(.92,.39)),dot(slope,vec2(-.39,.92)))*.052;'}
        vec3 reflectionColor=texture2D(reflection,clamp(mirrorUV,.001,.999)).rgb;
        ${ocean ? `
          // Beyond the mirror camera's footprint the open coast reflects sky.
          vec2 edge=min(mirrorUV,1.-mirrorUV);
          float inMirror=smoothstep(.002,.055,min(edge.x,edge.y))*step(0.,mirrored.w);
          vec3 seaSky=mix(vec3(.52,.73,.83),vec3(.026,.048,.095),night);
          reflectionColor=mix(seaSky,reflectionColor,inMirror);
        ` : ''}
        float grazing=1.-max(0.,dot(n,eye));
        float fresnel=${ocean ? '.022+.90*pow(grazing,5.)' : 'mix(.105,.19,night)+.76*pow(grazing,3.)'};
        color=mix(color,reflectionColor,fresnel);
        float glint=pow(max(0.,dot(n,normalize(eye+sunDir))),mix(170.,245.,night));
        color+=sunlight*(glint*mix(.9,.28,night)+min(crest,1.2)*mix(.32,.22,night));
        float opacity=1.;
        ${ocean ? `
          // The crest, its slope and the aerated leading face all refer to the
          // same travelling swell. The last film shows the live wet beach.
          float steepFace=smoothstep(.012,.085,-swell.y);
          float breaking=steepFace*smoothstep(-.21,-.085,swell.x)
                        *(1.-smoothstep(.06,.56,depth));
          float foamPhase=travel*.46-time*1.04;
          vec2 foamUV=p-vec2(.50*sin(foamPhase),.07*cos(foamPhase+p.y*.41));
          float flecks=.50+.26*sin(foamUV.y*4.1+sin(foamUV.x*3.5))
                           +.24*sin(dot(foamUV,vec2(3.8,1.7)));
          float foam=.44*breaking*smoothstep(.26,.83,flecks);
          vec3 aerated=mix(vec3(.77,.88,.84),vec3(.14,.20,.29),night);
          color=mix(color,aerated,foam);
          opacity=smoothstep(.0,.26,depth);
          opacity+=foam*(1.-opacity)*smoothstep(.0,.035,depth);
          float offshore=smoothstep(24.,68.,range);
          color=mix(color,openSea,offshore);
          opacity=mix(opacity,1.,offshore);
          if(opacity<.004)discard;
        ` : ''}
        gl_FragColor=vec4(color,opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  })
}

function debris(season,wind) {
  const snow=season==='winter'
  const geo=snow ? new THREE.IcosahedronGeometry(.07,0) : new THREE.BufferGeometry()
  if (!snow) {
    geo.setAttribute('position',new THREE.Float32BufferAttribute(
      [0,0,0,-.066,.023,.10,0,.057,.12,.066,.023,.10,0,-.015,.25],3))
    geo.setIndex([0,2,1,0,3,2,1,2,4,2,3,4])
    geo.computeVertexNormals()
  }
  const pool=48, mesh=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({
    side:THREE.DoubleSide,roughness:.78
  }),pool)
  mesh.count=0
  mesh.frustumCulled=false
  const palette=snow ? ['#eef6fa','#c9dfe8'] : season==='autumn' ? ['#f7ab37','#d66a36','#e9ba57'] :
    season==='summer' ? ['#759c51','#a4b364'] : ['#ecc3cd','#a3bd70','#91b665']
  const floating=[]
  const pose=new THREE.Object3D()
  return {
    mesh,
    shed(point,t) {
      for(let i=0;i<(snow?7:3);i++){
        if(floating.length>=pool)floating.shift()
        floating.push({ x:point.x+(Math.random()-.5)*.25,y:point.y,z:point.z, born:t,
          drift:Math.random()*6.28,color:new THREE.Color(palette[Math.floor(Math.random()*palette.length)]) })
      }
    },
    update(t) {
      let written=0
      for(let i=floating.length-1;i>=0;i--){
        const leaf=floating[i], age=t-leaf.born, phase=leaf.drift
        const x=leaf.x+age*.26*wind.windDirection.value.x+(Math.sin(phase+age*2.6)-Math.sin(phase))*.24
        const y=leaf.y-age*(snow ? .95 : .68)-age*age*.1
        const z=leaf.z+age*.26*wind.windDirection.value.y+(Math.cos(phase+age*2.)-Math.cos(phase))*.19
        if(age>3.4 || y<Math.max(-.17,bedHeight(x,z,season))){floating.splice(i,1);continue}
        pose.position.set(x,y,z)
        pose.rotation.set(age*2.8+phase,age*1.8+phase,Math.sin(age*3+phase))
        pose.scale.setScalar((1+.16*Math.sin(phase)) * Math.min(1,(3.4-age)*3))
        pose.updateMatrix()
        mesh.setMatrixAt(written,pose.matrix)
        mesh.setColorAt(written++,leaf.color)
      }
      mesh.count=written
      mesh.instanceMatrix.needsUpdate=true
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true
    }
  }
}

export function createResponses(renderer,root,season,lighting,time,wind) {
  const ripples=emptyEvents(rippleCount)
  const winter=season==='winter'
  const water=(winter && root.getObjectByName('Ice')) || root.getObjectByName('Water')
  const uniforms={
    night:{value:0},reflection:{value:null},reflectedView:{value:new THREE.Matrix4()},
    underlay:{value:null},viewport:{value:new THREE.Vector2(1,1)},
    sunlight:{value:lighting.sun.color},sunDir:{value:new THREE.Vector3()}
  }
  water.material.dispose()
  water.material=winter ? riverIce(uniforms) : clearWater(season,time,ripples,uniforms,wind)
  water.userData.water=!winter
  water.castShadow=false
  const wetSand=season==='summer' ? prepareBeachSand(root.getObjectByName('Banks')) : null
  const trails=winter || wetSand ? createGroundTrails(renderer,root.getObjectByName('Banks'),root.getObjectByName('Snow_on_ice'),wetSand) : null
  root.add(gravel(root,season))
  const falling=debris(season,wind)
  let ripple=0, lastTime=-10, previous=null, lastStrokeTime=0
  return {
    water, falling:falling.mesh,
    showTrails(show){trails?.show(show)},
    resetStroke(){ previous=null },
    brush(hit,t){
      if(!hit){previous=null;return}
      const p=hit.point, kind=hit.kind
      if(kind===HIT.snow || kind===HIT.sand){
        const now=wetSand ? t : trails.clock()
        const start=previous?.kind===kind ? previous.point : p
        if (previous?.kind!==kind || !start.equals(p))
          trails.add(start,p,previous?.kind===kind && now-lastStrokeTime<.15 ? lastStrokeTime : now,now)
        previous=hit
        lastStrokeTime=now
        return
      }
      const continuous=previous?.kind===kind && t-lastTime<.5
      const distance=continuous ? p.distanceTo(previous.point) : Infinity
      if(distance<.075 || (continuous && t-lastTime<(kind===HIT.canopy ? .19 : kind===HIT.water ? .09 : .028)))return
      if(kind===HIT.water){
        ripples[ripple].set(p.x,p.z,t,1)
        ripple=(ripple+1)%rippleCount
      }else if(kind===HIT.canopy)falling.shed(p,t)
      previous=hit
      lastTime=t
    },
    update(t){falling.update(t);wetSand?.update(t,trails.active);trails?.update(wetSand ? t : undefined)}
  }
}
