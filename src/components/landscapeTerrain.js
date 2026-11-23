// Keep the water depth, submerged stones and grass roots on the same
// valley floor as the meshes exported by build_landscapes.py.
export function riverCenter(y,season) {
  if (season==='summer') return 1+.13*y+.95*Math.sin(.16*y)+.12*Math.max(0,y-7)**2
  if (season==='autumn') return .6+2.6*Math.sin(y*.12-.45)+Math.sin(y*.062+.4)
  return 2.4+3.6*Math.sin(y*.112)+1.1*Math.sin(y*.27)
}

export function bedHeight(x,z,season) {
  const y=-z
  const offset=x-riverCenter(y,season)
  if (season==='summer') return Math.min(1.65,Math.max(-1,offset*.15))+.07*Math.sin(y)
  if (season==='autumn') {
    const bank=Math.min(1,Math.max(0,(Math.abs(offset)-1.85)/2.5))
    return -.96+bank*(1.95+.34*Math.sin(y*.25+x*.16)+.22*Math.cos(x*.57))
  }
  const bank=Math.min(1,Math.max(0,(Math.abs(offset)-1.15)/2.1))
  return -.72+bank*(1.5+.4*Math.sin(x*.34)+.28*Math.sin(y*.32)+Math.min(2,Math.abs(x)*.065))
}

export function terrainGLSL(season) {
  const channel=season==='autumn'
    ? '.6+2.6*sin(y*.12-.45)+sin(y*.062+.4)'
    : season==='summer' ? '1.+.13*y+.95*sin(.16*y)+.12*pow(max(0.,y-7.),2.)' : '2.4+3.6*sin(y*.112)+1.1*sin(y*.27)'
  const heights={
    summer:'clamp(offset*.15,-1.,1.65)+.07*sin(y)',
    autumn:'-.96+clamp((abs(offset)-1.85)/2.5,0.,1.)*(1.95+.34*sin(y*.25+x*.16)+.22*cos(x*.57))'
  }
  const height=heights[season] || '-.72+clamp((abs(offset)-1.15)/2.1,0.,1.)*(1.5+.4*sin(x*.34)+.28*sin(y*.32)+min(2.,abs(x)*.065))'
  return `
    float riverCenter(float y){return ${channel};}
    float bedHeight(float x,float y){float offset=x-riverCenter(y);return ${height};}
  `
}
