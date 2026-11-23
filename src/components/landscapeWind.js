import * as THREE from 'three'

// Direction is in world XZ, so differently rotated plant instances bend downwind.
export const breezeGLSL = `
  uniform vec2 windDirection;
  uniform float windTime;
  float gustAt(vec2 p) {
    float travel=dot(p,windDirection);
    float crosswind=dot(p,vec2(-windDirection.y,windDirection.x));
    return .53+.31*sin(travel*.34-windTime*1.27+sin(crosswind*.23))
              +.16*sin(travel*.71-windTime*2.08);
  }
`

export function createBreeze(time) {
  return { windTime:time, windDirection:{value:new THREE.Vector2(.94,-.34).normalize()} }
}

export function bendInWind(material, kind, wind) {
  // The crown is centered on the upright palm trunk (maximum radius .054).
  // Flex increases along each frond, including tips that droop below its root.
  const masked=kind==='tree' || kind==='pine'
  const weight=masked ? '_wind_weight' : kind==='palm' ? 'smoothstep(.06,.70,length(position.xz))'
    : kind==='grass' ? 'smoothstep(.0,.45,position.y)' : '0.'
  const amplitude={grass:'.17',palm:'.067',tree:'.019',pine:'.009'}[kind] || '0.'
  const prepare = material.onBeforeCompile.bind(material)
  const baseKey = material.customProgramCacheKey()
  material.onBeforeCompile = shader => {
    prepare(shader)
    Object.assign(shader.uniforms,wind)
    shader.vertexShader=(masked ? 'attribute float _wind_weight;\n' : '')+breezeGLSL+shader.vertexShader.replace('#include <project_vertex>', `
      vec3 vertexWorld=(instanceMatrix*vec4(transformed,1.)).xyz;
      float flex=${weight};
      float gust=gustAt(vertexWorld.xz);
      float flutter=sin(windTime*3.8-dot(vertexWorld.xz,windDirection)*2.4+position.y*4.);
      float lean=flex*(gust-.23+.12*flutter)*${amplitude};
      vec2 sideways=vec2(-windDirection.y,windDirection.x)*flutter*.15;
      vec3 offset=vec3((windDirection.x+sideways.x)*lean,0.,(windDirection.y+sideways.y)*lean)*length(instanceMatrix[1].xyz);
      transformed.x+=dot(offset,instanceMatrix[0].xyz)/dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz);
      transformed.z+=dot(offset,instanceMatrix[2].xyz)/dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz);
      ${kind==='palm' ? 'transformed.y+=flex*(gust-.5+.22*flutter)*.035;' : ''}
      #include <project_vertex>
    `)
  }
  material.customProgramCacheKey=()=>baseKey+'-wind-'+kind
  return material
}
