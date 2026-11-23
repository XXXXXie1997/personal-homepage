import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'

const vertexShader = `
  varying vec2 uvScreen;
  void main() {
    uvScreen=uv;
    gl_Position=vec4(position.xy,0.,1.);
  }`

const lensShader = `
  uniform sampler2D image, sceneDepth, backdropDepth;
  uniform vec2 clipRange, pixel;
  uniform float focusDistance, aperture;
  varying vec2 uvScreen;

  // The far-side circle of confusion is proportional to 1 - focus / distance.
  // For a perspective camera inverse distance is affine in window depth.
  float radiusAt(vec2 p) {
    float depth=texture2D(sceneDepth,p).r;
    if(depth>=1.) depth=texture2D(backdropDepth,p).r;
    float inverseZ=mix(1./clipRange.x,1./clipRange.y,depth);
    return max(0.,1.-focusDistance*inverseZ);
  }
  float tapWeight(float offset,float reach,float sampleReach) {
    float gaussian=exp(-2.*offset*offset);
    // A focused object cannot spread its colour across the background.
    return gaussian*smoothstep(-.5,.5,(sampleReach-abs(offset)*reach)*aperture);
  }`

export function createLandscapeFocus(renderer) {
  const type=renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType
  function buffers(samples) {
    const color=new THREE.WebGLRenderTarget(1,1,{
      type, samples, depthTexture:new THREE.DepthTexture(1,1,THREE.UnsignedIntType)
    })
    const blur=new THREE.WebGLRenderTarget(1,1,{type,depthBuffer:false})
    return {color,blur}
  }
  // These working buffers are shared by all cached seasons and lighting states.
  const main=buffers(Math.min(2,renderer.capabilities.maxSamples)), mirror=buffers(0)
  const uniforms={
    image:{value:null}, sceneDepth:{value:null}, backdropDepth:{value:null}, filtered:{value:null},
    clipRange:{value:new THREE.Vector2()}, pixel:{value:new THREE.Vector2()},
    focusDistance:{value:16}, aperture:{value:10}
  }
  function pass(fragment) {
    return new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms, vertexShader, fragmentShader:lensShader+fragment, depthTest:false,depthWrite:false
    }))
  }
  const horizontal=pass(`
    void main() {
      float reach=radiusAt(uvScreen);
      if(reach*aperture<.35){gl_FragColor=vec4(0.);return;}
      vec3 sum=texture2D(image,uvScreen).rgb;
      float weight=1.;
      for(int i=-5;i<=5;i++){
        if(i==0)continue;
        float offset=float(i)/5.;
        vec2 p=uvScreen+vec2(offset*pixel.x*aperture*reach,0.);
        float w=tapWeight(offset,reach,radiusAt(p));
        sum+=texture2D(image,p).rgb*w;
        weight+=w;
      }
      // Premultiply by reach so bilinear upsampling cannot introduce a
      // sharp foreground branch or its black padding into the blurred layer.
      gl_FragColor=vec4(sum*(reach/weight),reach);
    }`)
  const composite=pass(`
    uniform sampler2D filtered;
    void main() {
      vec3 color=texture2D(image,uvScreen).rgb;
      float reach=radiusAt(uvScreen);
      if(reach*aperture>.35){
        vec3 sum=vec3(0.);
        float weight=0.;
        for(int i=-5;i<=5;i++){
          float offset=float(i)/5.;
          vec2 p=uvScreen+vec2(0.,offset*pixel.y*aperture*reach);
          vec4 sampleColor=texture2D(filtered,p);
          float w=tapWeight(offset,reach,sampleColor.a);
          sum+=sampleColor.rgb*w;
          weight+=sampleColor.a*w;
        }
        if(weight>.001) color=mix(color,sum/weight,smoothstep(.35,1.75,reach*aperture));
      }
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`)
  return {
    render(scene,camera,view,focusDistance,reflection=false) {
      const {color,blur}=reflection ? mirror : main
      const output=reflection ? view.reflection : null
      const width=output?.width ?? view.canvas.width, height=output?.height ?? view.canvas.height
      color.setSize(width,height)
      blur.setSize(Math.max(1,Math.ceil(width/2)),Math.max(1,Math.ceil(height/2)))
      uniforms.image.value=color.texture
      uniforms.sceneDepth.value=color.depthTexture
      uniforms.backdropDepth.value=(reflection ? view.mirrorBackdrop : view.backdrop).depthTexture
      uniforms.filtered.value=blur.texture
      uniforms.pixel.value.set(1/view.width,1/view.height)
      uniforms.clipRange.value.set(camera.near,camera.far)
      uniforms.focusDistance.value=focusDistance
      uniforms.aperture.value=THREE.MathUtils.clamp(view.height*.014,7,15)
      const previous=renderer.getRenderTarget()
      try {
        renderer.setRenderTarget(color)
        renderer.render(scene,camera)
        renderer.setRenderTarget(blur)
        horizontal.render(renderer)
        renderer.setRenderTarget(output)
        composite.render(renderer)
      } finally {
        renderer.setRenderTarget(previous)
      }
    },
    dispose() {
      for(const {color,blur} of [main,mirror]){color.dispose();blur.dispose()}
      horizontal.material.dispose()
      composite.material.dispose()
      horizontal.dispose()
      composite.dispose()
    }
  }
}
