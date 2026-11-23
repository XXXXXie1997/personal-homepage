import { riverCenter, terrainGLSL } from './landscapeTerrain.js'

// Metres, radians per metre, radians per second. The shorter harmonic shapes
// the face of each swell; a slower second swell varies successive run-ups.
const amplitudes=[.17,.024,.046]
const waveNumbers=[.46,.92,.29]
const frequencies=[1.04,2.08,.63]
const phases=[0,-.8,1.3]
const seaLevel=-.20

export function seaHeight(x,z,time) {
  const y=-z
  const travel=x-.72*riverCenter(y,'summer')+.52*Math.sin(y*.32)
  let height=seaLevel
  for(let i=0;i<amplitudes.length;i++) {
    height+=amplitudes[i]*Math.sin(waveNumbers[i]*travel-frequencies[i]*time+phases[i])
  }
  return height
}

export const coastalWavesGLSL=`
  ${terrainGLSL('summer')}
  const vec3 amplitudes=vec3(${amplitudes.join(',')});
  const vec3 waveNumbers=vec3(${waveNumbers.join(',')});
  const vec3 frequencies=vec3(${frequencies.join(',')});
  float travelAt(vec2 p) {
    float y=-p.y;
    return p.x-.72*riverCenter(y)+.52*sin(y*.32);
  }
  // Height, shoreward slope and vertical speed.
  vec3 swellAt(float travel,float t) {
    vec3 phase=waveNumbers*travel-frequencies*t+vec3(${phases.join(',')});
    vec3 derivative=amplitudes*cos(phase);
    return vec3(${seaLevel}+dot(amplitudes,sin(phase)),
                dot(derivative,waveNumbers),-dot(derivative,frequencies));
  }
`
