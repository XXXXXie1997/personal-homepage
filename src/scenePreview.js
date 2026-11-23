// Inlined by Vite so the first landscape can paint before Vue or the poster arrives.
function startScenePreview(root, winter, base) {
  let dots = root.querySelector('.dots')
  const lens = root.querySelector('.dot-colour')
  let poster = root.querySelector('img')
  let currentKey
  let sample, night, posterReady, supersedePoster, resizeFrame
  let listeners, hoverFrame, pointerX, pointerY

  function reveal() {
    hoverFrame = 0
    // Match the centred object-fit:cover crop, including on ultrawide screens.
    const scale = Math.max(root.clientWidth / dots.width, root.clientHeight / dots.height)
    const size = lens.clientWidth
    const left = pointerX - size / 2, top = pointerY - size / 2
    const sx = (left - (root.clientWidth - dots.width * scale) / 2) / scale
    const sy = (top - (root.clientHeight - dots.height * scale) / 2) / scale
    const ctx = lens.getContext('2d')
    ctx.clearRect(0, 0, lens.width, lens.height)
    ctx.drawImage(dots, sx, sy, size / scale, size / scale, 0, 0, lens.width, lens.height)
    lens.style.transform = 'translate(' + left + 'px,' + top + 'px)'
    lens.classList.add('revealed')
  }

  function hideColour() {
    cancelAnimationFrame(hoverFrame)
    hoverFrame = 0
    lens.classList.remove('revealed')
  }

  function track(event) {
    if (event.pointerType === 'touch' ||
        event.target.closest?.('.navigation,.profile,.reading-panel,.scene-dock,footer')) {
      hideColour()
      return
    }
    pointerX = event.clientX
    pointerY = event.clientY
    if (!hoverFrame) hoverFrame = requestAnimationFrame(reveal)
  }

  function startHover() {
    if (listeners || poster.classList.contains('decoded')) return
    listeners = new AbortController()
    const options = {passive:true, signal:listeners.signal}
    window.addEventListener('pointermove', track, options)
    window.addEventListener('pointerout', event => { if (!event.relatedTarget) hideColour() }, options)
    window.addEventListener('pointercancel', hideColour, options)
    window.addEventListener('blur', hideColour, options)
    window.addEventListener('resize', () => {
      hideColour()
      if (!resizeFrame) resizeFrame = requestAnimationFrame(paintDots)
    }, options)
  }

  function stopHover() {
    listeners?.abort()
    listeners = null
    hideColour()
    cancelAnimationFrame(resizeFrame)
    resizeFrame = 0
  }

  function unpack([width, height, palette, runs]) {
    const sample = document.createElement('canvas')
    sample.width = width
    sample.height = height
    const source = sample.getContext('2d')
    const pixels = source.createImageData(width, height)
    const colors = palette.match(/.{6}/g).map(hex =>
      [...hex.match(/../g).map(pair => parseInt(pair, 16)), 255])
    let offset = 0
    for (const token of atob(runs)) {
      const byte = token.charCodeAt(0)
      for (let i = 0; i <= (byte >> 4); i++) {
        pixels.data.set(colors[byte & 15], offset)
        offset += 4
      }
    }
    source.putImageData(pixels, 0, 0)
    return sample
  }

  function paintDots() {
    resizeFrame = 0
    const scale = Math.max(root.clientWidth / sample.width, root.clientHeight / sample.height)
    // Match the cover crop but keep the printed pitch at four CSS pixels.
    const resolution = Math.min(devicePixelRatio || 1, 1.5, 4608 / (Math.max(sample.width, sample.height) * scale))
    dots.width = Math.max(1, Math.round(sample.width * scale * resolution))
    dots.height = Math.max(1, Math.round(sample.height * scale * resolution))
    const pitch = Math.max(2, Math.round(4 * resolution))
    const tile = document.createElement('canvas')
    tile.width = pitch
    tile.height = pitch * 2
    const stamp = tile.getContext('2d')
    stamp.beginPath()
    for (const [x, y] of [[.25,.5],[1.25,.5],[-.25,1.5],[.75,1.5]]) {
      stamp.moveTo((x + .38) * pitch, y * pitch)
      stamp.arc(x * pitch, y * pitch, .38 * pitch, 0, 2 * Math.PI)
    }
    stamp.fill()
    const ctx = dots.getContext('2d')
    ctx.drawImage(sample, 0, 0, dots.width, dots.height)
    ctx.globalCompositeOperation = 'destination-in'
    ctx.fillStyle = ctx.createPattern(tile, 'repeat')
    ctx.fillRect(0, 0, dots.width, dots.height)
    ctx.globalCompositeOperation = 'destination-over'
    // Keep the paper between the dots close to the poster's local colour.
    ctx.globalAlpha = night ? 0.78 : 0.70
    ctx.drawImage(sample, 0, 0, dots.width, dots.height)
    ctx.globalAlpha = 1
    ctx.fillStyle = night ? '#101c2a' : '#f0eee7'
    ctx.fillRect(0, 0, dots.width, dots.height)
  }

  function show(key, seasons) {
    if (key === currentKey) {
      startHover()
      return posterReady
    }
    // A detached image's pending decode must never hold up the latest selection.
    supersedePoster?.()
    const relighting = currentKey && currentKey.replace(/-(day|night)-/, '-') === key.replace(/-(day|night)-/, '-')
    currentKey = key
    hideColour()
    const image = new Image()
    image.alt = ''
    image.fetchPriority = 'low'
    root.insertBefore(image, poster)
    if (relighting && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const previous = document.createElement('div')
      // Older fades stay above this one when the switch is clicked repeatedly.
      root.insertBefore(previous, root.querySelector('.previous-preview'))
      previous.className = 'previous-preview'
      previous.append(dots)
      dots = document.createElement('canvas')
      dots.className = 'dots'
      root.prepend(dots)
      if (poster.classList.contains('decoded')) {
        poster.style.opacity = getComputedStyle(poster).opacity
        poster.style.transition = 'none'
        previous.append(poster)
      }
      const fade = previous.animate([{opacity:1},{opacity:0}], {duration:700,easing:'ease-in-out',fill:'forwards'})
      fade.onfinish = () => previous.remove()
    } else {
      root.querySelectorAll('.previous-preview').forEach(layer => layer.remove())
    }
    if (poster.parentElement === root) {
      poster.removeAttribute('srcset')
      poster.removeAttribute('src')
      poster.remove()
    }
    poster = image
    night = key.includes('-night-')
    sample = unpack(winter[key] || seasons[key])
    paintDots()
    startHover()
    const decoded = new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))).then(async () => {
      if (poster !== image) return
      const name = 'poster-' + key + '.webp'
      const small = base + 'scenes/' + name
      const mobile = key.endsWith('-mobile')
      const connection = navigator.connection
      if (!connection?.saveData && !['slow-2g','2g','3g'].includes(connection?.effectiveType)) {
        // object-fit:cover can use more source pixels than the viewport width.
        image.sizes = mobile ? 'max(100vw, 50vh)' : 'max(100vw, 200vh)'
        image.srcset = small + (mobile ? ' 384w, ' : ' 960w, ') +
          base + 'scenes/hd/' + name + (mobile ? ' 864w' : ' 2560w')
      }
      image.src = small
      try {
        await image.decode()
      } catch (error) {
        if (poster !== image || !image.currentSrc.includes('/scenes/hd/')) throw error
        image.removeAttribute('srcset')
        image.src = small
        await image.decode()
      }
      if (poster !== image) return
      image.classList.add('decoded')
      stopHover()
    }).catch(() => { /* The dots remain available while the renderer loads. */ })
    posterReady = Promise.race([decoded, new Promise(resolve => { supersedePoster = resolve })])
    return posterReady
  }

  const dark = document.body.classList.contains('dark')
  const frame = matchMedia('(max-width: 649px)').matches ? 'mobile' : 'wide'
  root.show = show
  root.stopHover = stopHover
  if (document.getElementById('app').hasChildNodes()) show('winter-' + (dark ? 'night-' : 'day-') + frame)
}
