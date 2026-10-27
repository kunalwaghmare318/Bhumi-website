import './style.css'
import './diary.css'
import confetti from 'canvas-confetti'
import { BIRTHDAY_PHOTOS, BIRTHDAY_STICKERS } from './assets/birthdayData.js'
import { initDiary } from './diary.js'

// ==========================================
// 1. PROCEDURAL SOUND SYNTHESIZER
// ==========================================
class SoundSynth {
  constructor() {
    this.ctx = null
    this.rainNode = null
    this.rainGain = null
    this.isRainPlaying = false
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  playChime(freq = 523.25, type = 'sine', duration = 0.8) {
    try {
      this.init()
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
      
      gain.gain.setValueAtTime(0.16, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration)
      
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + duration)
    } catch (e) {
      // Audio fallback
    }
  }

  playChordUnlock() {
    const notes = [440, 554.37, 659.25, 880, 1108.73]
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playChime(freq, 'sine', 1.6)
      }, idx * 110)
    })
  }

  playPageFlip() {
    this.playChime(659.25, 'triangle', 0.5)
  }

  toggleRain() {
    this.init()
    if (this.isRainPlaying) {
      if (this.rainGain) {
        this.rainGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.8)
        setTimeout(() => {
          if (this.rainNode) {
            this.rainNode.disconnect()
            this.rainNode = null
          }
        }, 800)
      }
      this.isRainPlaying = false
      return false
    } else {
      const bufferSize = this.ctx.sampleRate * 2
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        data[i] = (b0 + b1 + b2) * 0.06
      }

      this.rainNode = this.ctx.createBufferSource()
      this.rainNode.buffer = buffer
      this.rainNode.loop = true

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(800, this.ctx.currentTime)

      this.rainGain = this.ctx.createGain()
      this.rainGain.gain.setValueAtTime(0.001, this.ctx.currentTime)
      this.rainGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 1.2)

      this.rainNode.connect(filter)
      filter.connect(this.rainGain)
      this.rainGain.connect(this.ctx.destination)

      this.rainNode.start()
      this.isRainPlaying = true
      return true
    }
  }
}

const sound = new SoundSynth()
let isUnlocked = false
document.body.classList.add('draw-locked')

// ==========================================
// 2. RENDER DOM STRUCTURE
// ==========================================
const app = document.querySelector('#app')
app.innerHTML = `
  <!-- Full-site Floating Petals & Bioluminescent Canvas -->
  <canvas id="petals-canvas"></canvas>

  <!-- Flash bloom overlay -->
  <div id="flash-overlay"></div>

  <!-- HERO DRAW-A-HEART OVERLAY -->
  <div id="draw-hero-overlay">
    <div class="draw-galaxy-bg">
      <img id="draw-galaxy-img" class="draw-galaxy-img" src="/bhume_bg.png" alt="Bhumee Background" />
      <video id="draw-zoom-video" class="draw-zoom-video" src="/spiral_dive.mp4" playsinline preload="auto" muted></video>
      <div class="galaxy-overlay-vignette"></div>
    </div>
    <div class="hero-draw-container">
      <div class="draw-header">
          <h1 class="draw-title">Draw a heart</h1>
      </div>

      <div class="draw-stage">
        <canvas id="drawing-canvas"></canvas>
        <svg class="guide-svg" viewBox="0 0 360 340">
          <path id="guide-glow" class="guide-glow" d="M 180 100 C 180 50, 95 35, 70 85 C 35 155, 120 230, 180 280 C 240 230, 325 155, 290 85 C 265 35, 180 50, 180 100 Z"/>
          <path id="guide-path" class="guide-path" d="M 180 100 C 180 50, 95 35, 70 85 C 35 155, 120 230, 180 280 C 240 230, 325 155, 290 85 C 265 35, 180 50, 180 100 Z"/>
        </svg>

        <!-- Hand guide icon -->
        <div id="guiding-hand" class="guiding-hand">
          <svg class="hand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
          </svg>
        </div>
      </div>

    </div>
  </div>

  <!-- PAGE 1: Birthday Scroll Animation (from birthday.html) -->
  <div id="wrap">
    <div class="hero">
      <h1>Happy Birthday<em>Bhumee<span class="stop" id="stop"></span></em></h1>
      <div class="hint">scroll ↓</div>
    </div>
    <svg id="svg"><path id="trail"/><circle id="dot" r="7"/></svg>
    <div class="end" id="end" style="display: none;">…and this is only the beginning ✦</div>
  </div>

  <div id="diary-root"></div>

  <input type="file" id="birthday-file-input" accept="image/*" hidden>
`

// ==========================================
// 3. BACKGROUND PETALS & BIOLUMINESCENT GLOW
// ==========================================
const petalsCanvas = document.getElementById('petals-canvas')
const pctx = petalsCanvas.getContext('2d')
let petals = []
let globalBiolumParticles = []
let globalBiolumRipples = []
let globalWavePhase = 0

function resizePetals() {
  petalsCanvas.width = window.innerWidth
  petalsCanvas.height = window.innerHeight
}
resizePetals()
window.addEventListener('resize', resizePetals)

class Petal {
  constructor() {
    this.reset(true)
  }
  reset(init = false) {
    this.x = Math.random() * petalsCanvas.width
    this.y = init ? Math.random() * petalsCanvas.height : -20
    this.size = Math.random() * 8 + 6
    this.speedY = Math.random() * 1.0 + 0.5
    this.speedX = (Math.random() - 0.5) * 0.8
    this.angle = Math.random() * Math.PI * 2
    this.spin = (Math.random() - 0.5) * 0.03
    this.opacity = Math.random() * 0.45 + 0.2
    this.color = Math.random() > 0.4 ? 'rgba(232, 169, 188,' : 'rgba(255, 117, 151,'
  }
  update() {
    this.y += this.speedY
    this.x += Math.sin(this.angle) * 0.8 + this.speedX
    this.angle += this.spin
    if (this.y > petalsCanvas.height + 20) {
      this.reset()
    }
  }
  draw() {
    pctx.save()
    pctx.translate(this.x, this.y)
    pctx.rotate(this.angle)
    pctx.fillStyle = `${this.color}${this.opacity})`
    pctx.beginPath()
    pctx.ellipse(0, 0, this.size, this.size * 0.55, 0, 0, Math.PI * 2)
    pctx.fill()
    pctx.restore()
  }
}

class GlobalBiolumParticle {
  constructor(x, y, isAmbient = false) {
    this.x = x
    this.y = y
    this.size = Math.random() * 3.5 + 1.5
    this.vx = (Math.random() - 0.5) * (isAmbient ? 0.6 : 1.8)
    this.vy = (Math.random() - 0.5) * (isAmbient ? 0.6 : 1.8) - (isAmbient ? 0.2 : 0)
    this.alpha = isAmbient ? Math.random() * 0.6 + 0.3 : 1
    this.decay = isAmbient ? 0.004 : 0.015
    const babyPinks = ['#FFB6C1', '#F8D7E0', '#FFC0CB', '#FFAEC9', '#FFD1DC']
    this.color = babyPinks[Math.floor(Math.random() * babyPinks.length)]
    this.isAmbient = isAmbient
  }
  update() {
    this.x += this.vx
    this.y += this.vy
    this.alpha -= this.decay
    if (this.isAmbient && this.alpha <= 0) {
      this.x = Math.random() * petalsCanvas.width
      this.y = Math.random() * petalsCanvas.height
      this.alpha = Math.random() * 0.6 + 0.2
    }
  }
  draw() {
    pctx.save()
    pctx.shadowColor = this.color
    pctx.shadowBlur = 12
    pctx.fillStyle = this.color
    pctx.globalAlpha = Math.max(0, this.alpha)
    pctx.beginPath()
    pctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    pctx.fill()
    pctx.restore()
  }
}

class GlobalBiolumRipple {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.radius = 4
    this.maxRadius = 90
    this.alpha = 0.85
  }
  update() {
    this.radius += 2.4
    this.alpha -= 0.02
  }
  draw() {
    pctx.save()
    pctx.strokeStyle = `rgba(255, 182, 193, ${Math.max(0, this.alpha)})`
    pctx.shadowColor = '#FFB6C1'
    pctx.shadowBlur = 16
    pctx.lineWidth = 1.8
    pctx.beginPath()
    pctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    pctx.stroke()
    pctx.restore()
  }
}

for (let i = 0; i < 30; i++) {
  petals.push(new Petal())
}
for (let i = 0; i < 35; i++) {
  globalBiolumParticles.push(new GlobalBiolumParticle(Math.random() * window.innerWidth, Math.random() * window.innerHeight, true))
}

function spawnGlobalBiolum(x, y, count = 4) {
  if (!isUnlocked) return
  for (let i = 0; i < count; i++) {
    globalBiolumParticles.push(new GlobalBiolumParticle(
      x + (Math.random() - 0.5) * 20,
      y + (Math.random() - 0.5) * 20,
      false
    ))
  }
}

window.addEventListener('pointermove', (e) => {
  spawnGlobalBiolum(e.clientX, e.clientY, 3)
})

window.addEventListener('pointerdown', (e) => {
  spawnGlobalBiolum(e.clientX, e.clientY, 8)
  if (isUnlocked) {
    globalBiolumRipples.push(new GlobalBiolumRipple(e.clientX, e.clientY))
  }
})

function animateBackground() {
  pctx.clearRect(0, 0, petalsCanvas.width, petalsCanvas.height)

  if (isUnlocked) {
    globalWavePhase += 0.015
    pctx.save()
    pctx.lineWidth = 1.5
    pctx.shadowColor = '#FF7597'
    pctx.shadowBlur = 8
    pctx.strokeStyle = 'rgba(255, 117, 151, 0.08)'

    const waveCount = 3
    for (let w = 0; w < waveCount; w++) {
      pctx.beginPath()
      const baseWaveY = petalsCanvas.height * (0.25 + w * 0.3)
      for (let x = 0; x <= petalsCanvas.width; x += 30) {
        const y = baseWaveY + Math.sin(x * 0.005 + globalWavePhase + w * 1.5) * 25
        if (x === 0) pctx.moveTo(x, y)
        else pctx.lineTo(x, y)
      }
      pctx.stroke()
    }
    pctx.restore()
  }

  for (let i = globalBiolumRipples.length - 1; i >= 0; i--) {
    const rip = globalBiolumRipples[i]
    rip.update()
    rip.draw()
    if (rip.alpha <= 0) globalBiolumRipples.splice(i, 1)
  }

  for (let i = globalBiolumParticles.length - 1; i >= 0; i--) {
    const p = globalBiolumParticles[i]
    p.update()
    p.draw()
    if (!p.isAmbient && p.alpha <= 0) {
      globalBiolumParticles.splice(i, 1)
    }
  }

  for (const p of petals) {
    p.update()
    p.draw()
  }

  requestAnimationFrame(animateBackground)
}
animateBackground()

// ==========================================
// 4. DRAW-A-HEART INTERACTION
// ==========================================
const drawOverlay = document.getElementById('draw-hero-overlay')
const drawCanvas = document.getElementById('drawing-canvas')
const guidePath = document.getElementById('guide-path')
const guidingHand = document.getElementById('guiding-hand')
const flashOverlay = document.getElementById('flash-overlay')
const skipDrawBtn = document.getElementById('skip-draw-btn')

const dctx = drawCanvas.getContext('2d')
let isDrawing = false
let drawnPoints = []
let sparklerParticles = []

let samplePoints = []
const numSamples = 24

function initDrawCanvas() {
  if (!drawCanvas.parentElement) return
  const rect = drawCanvas.parentElement.getBoundingClientRect()
  drawCanvas.width = rect.width
  drawCanvas.height = rect.height
  initSamplePoints()
}

function initSamplePoints() {
  samplePoints = []
  const totalLength = guidePath.getTotalLength()
  const scaleX = drawCanvas.width / 360
  const scaleY = drawCanvas.height / 340
  for (let i = 0; i < numSamples; i++) {
    const p = guidePath.getPointAtLength((totalLength / numSamples) * i)
    samplePoints.push({
      x: p.x * scaleX,
      y: p.y * scaleY,
      visited: false
    })
  }
}

initDrawCanvas()
window.addEventListener('resize', initDrawCanvas)

const totalGuideLength = guidePath.getTotalLength()
let handProgress = 0

function animateHand() {
  if (isUnlocked) return
  if (!isDrawing) {
    handProgress = (handProgress + 1.2) % totalGuideLength
    const pt = guidePath.getPointAtLength(handProgress)
    const scaleX = drawCanvas.width / 360
    const scaleY = drawCanvas.height / 340
    guidingHand.style.left = `${pt.x * scaleX}px`
    guidingHand.style.top = `${pt.y * scaleY}px`
    guidingHand.classList.remove('hidden')
  } else {
    guidingHand.classList.add('hidden')
  }
  requestAnimationFrame(animateHand)
}
requestAnimationFrame(animateHand)

function triggerUnlock() {
  if (isUnlocked) return
  isUnlocked = true

  sound.playChordUnlock()

  const drawContainer = document.querySelector('.hero-draw-container')
  if (drawContainer) {
    drawContainer.classList.add('fading')
  }

  const vignette = document.querySelector('.galaxy-overlay-vignette')
  if (vignette) {
    vignette.classList.add('fading')
  }

  const zoomVideo = document.getElementById('draw-zoom-video')
  const galaxyImg = document.getElementById('draw-galaxy-img')

  let hasFlashed = false
  const executeWhiteFlash = () => {
    if (hasFlashed) return
    hasFlashed = true

    flashOverlay.classList.add('active')

    setTimeout(() => {
      document.body.classList.remove('draw-locked')
      drawOverlay.classList.add('unlocked')
      if (zoomVideo) {
        zoomVideo.pause()
      }
      setTimeout(() => {
        flashOverlay.classList.remove('active')
        confetti({
          particleCount: 140,
          spread: 95,
          origin: { y: 0.38 },
          colors: ['#F8D7E0', '#FF7597', '#E5A99B', '#6D1F3A', '#FFE4E6']
        })
        buildBirthday()
      }, 500)
    }, 450)
  }

  if (zoomVideo) {
    zoomVideo.playbackRate = 1.8
    zoomVideo.classList.add('playing')
    zoomVideo.currentTime = 0
    const playPromise = zoomVideo.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        if (galaxyImg) galaxyImg.classList.add('zoom-active')
        setTimeout(executeWhiteFlash, 900)
      })
    }

    const onTimeUpdate = () => {
      if (zoomVideo.duration && zoomVideo.currentTime >= Math.max(0.3, zoomVideo.duration - 0.25)) {
        zoomVideo.removeEventListener('timeupdate', onTimeUpdate)
        executeWhiteFlash()
      }
    }
    zoomVideo.addEventListener('timeupdate', onTimeUpdate)
    zoomVideo.addEventListener('ended', executeWhiteFlash)

    const getAdjustedMs = () => Math.max(500, ((zoomVideo.duration * 1000) / 1.8) - 50)
    if (zoomVideo.duration) {
      setTimeout(executeWhiteFlash, getAdjustedMs())
    } else {
      zoomVideo.addEventListener('loadedmetadata', () => {
        setTimeout(executeWhiteFlash, getAdjustedMs())
      }, { once: true })
      setTimeout(executeWhiteFlash, 3000)
    }
  } else {
    if (galaxyImg) galaxyImg.classList.add('zoom-active')
    setTimeout(executeWhiteFlash, 700)
  }
}

function handleStart(e) {
  if (isUnlocked) return
  sound.init()
  isDrawing = true
  const rect = drawCanvas.getBoundingClientRect()
  const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0)
  const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0)
  const x = clientX - rect.left
  const y = clientY - rect.top
  drawnPoints = [{ x, y }]
  samplePoints.forEach(sp => { sp.visited = false })
}

function checkHeartCompletion(currentX, currentY) {
  if (isUnlocked || drawnPoints.length < 35) return
  const visitedCount = samplePoints.filter(s => s.visited).length
  const distToStart = Math.hypot(currentX - drawnPoints[0].x, currentY - drawnPoints[0].y)
  const loopClosed = distToStart < 65
  if (visitedCount >= 20 && loopClosed) {
    triggerUnlock()
  }
}

function handleMove(e) {
  if (!isDrawing || isUnlocked) return
  const rect = drawCanvas.getBoundingClientRect()
  const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left
  const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
  drawnPoints.push({ x, y })

  sparklerParticles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    size: Math.random() * 4 + 2,
    alpha: 1,
    color: Math.random() > 0.3 ? '#FF7597' : '#FFFFFF'
  })

  samplePoints.forEach(sp => {
    const dist = Math.hypot(sp.x - x, sp.y - y)
    if (dist < 45) {
      sp.visited = true
    }
  })

  renderDrawCanvas()
  checkHeartCompletion(x, y)
}

function handleEnd() {
  if (!isDrawing || isUnlocked) return
  isDrawing = false
  if (drawnPoints.length > 0) {
    const last = drawnPoints[drawnPoints.length - 1]
    checkHeartCompletion(last.x, last.y)
  }
}

function renderDrawCanvas() {
  dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height)

  if (drawnPoints.length > 1) {
    dctx.beginPath()
    dctx.moveTo(drawnPoints[0].x, drawnPoints[0].y)
    for (let i = 1; i < drawnPoints.length; i++) {
      dctx.lineTo(drawnPoints[i].x, drawnPoints[i].y)
    }
    dctx.strokeStyle = 'rgba(255, 117, 151, 0.45)'
    dctx.lineWidth = 10
    dctx.lineCap = 'round'
    dctx.lineJoin = 'round'
    dctx.shadowColor = '#FF7597'
    dctx.shadowBlur = 18
    dctx.stroke()

    dctx.strokeStyle = '#FFFFFF'
    dctx.lineWidth = 3
    dctx.shadowBlur = 0
    dctx.stroke()
  }

  for (let i = sparklerParticles.length - 1; i >= 0; i--) {
    const sp = sparklerParticles[i]
    sp.x += sp.vx
    sp.y += sp.vy
    sp.alpha -= 0.03
    if (sp.alpha <= 0) {
      sparklerParticles.splice(i, 1)
      continue
    }
    dctx.save()
    dctx.fillStyle = sp.color
    dctx.globalAlpha = sp.alpha
    dctx.beginPath()
    dctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2)
    dctx.fill()
    dctx.restore()
  }

  if (isDrawing || sparklerParticles.length > 0) {
    requestAnimationFrame(renderDrawCanvas)
  }
}

drawCanvas.addEventListener('mousedown', handleStart)
window.addEventListener('mousemove', handleMove)
window.addEventListener('mouseup', handleEnd)

drawCanvas.addEventListener('touchstart', handleStart, { passive: false })
window.addEventListener('touchmove', handleMove, { passive: false })
window.addEventListener('touchend', handleEnd)

if (skipDrawBtn) {
  skipDrawBtn.addEventListener('click', () => {
    triggerUnlock()
  })
}

// ==========================================
// 5. BIRTHDAY SCROLL ANIMATION (birthday.html)
// ==========================================
const bWrap = document.querySelector('#wrap')
const bSvg = document.querySelector('#svg')
const bTrail = document.querySelector('#trail')
const bDot = document.querySelector('#dot')
const bStop = document.querySelector('#stop')
const bEnd = document.querySelector('#end')
const bFileInput = document.querySelector('#birthday-file-input')

let bS = [], bTotal = 0, bStops = [], bCards = [], bSts = [], bH = 0
const bSm = t => t * t * (3 - 2 * t)

function buildBirthday() {
  if (!bWrap || !bStop || !bSvg || !bTrail || !bDot) return
  bWrap.querySelectorAll('.card, .st').forEach(c => c.remove())
  bCards = []
  bSts = []
  bS = []
  bStops = []

  const W0 = window.innerWidth
  const vh = window.innerHeight
  const wide = W0 > 800
  const W = wide ? Math.min(W0, 1000) : W0
  const ox = (W0 - W) / 2
  const bw = W * 0.4
  const bh = wide ? Math.min(vh * 0.5, 360) : Math.min(vh * 0.32, 300)
  const cw = wide ? Math.min(W * 0.34, 290) : Math.min(W * 0.46, 230)

  const dim = BIRTHDAY_STICKERS.map(s => {
    const k = Math.min(bw / s.w, bh / s.h)
    return [s.w * k, s.h * k]
  })

  const maxH = Math.max(...dim.map(d => d[1]))
  const gap = wide ? Math.max(maxH + 110, cw + 150) : Math.max(maxH + 270, vh * 0.75)

  const r = bStop.getBoundingClientRect()
  const sx = r.left + r.width / 2
  const sy = r.top + window.scrollY + r.height / 2

  let l = 0
  const add = (x, y) => {
    if (bS.length) {
      const p = bS[bS.length - 1]
      l += Math.hypot(x - p.x, y - p.y)
    }
    bS.push({ x, y, l })
  }

  add(sx, sy)
  let cx = sx, cy = sy

  const seg = (x1, y1) => {
    const N = 70
    const amp = Math.min(24, (y1 - cy) / 18)
    for (let k = 1; k <= N; k++) {
      const t = k / N
      add(
        cx + (x1 - cx) * bSm(t),
        cy + (y1 - cy) * t + amp * Math.sin(t * Math.PI * 4) * Math.sin(t * Math.PI) * (Math.abs(x1 - cx) > 5 ? 1 : 0)
      )
    }
    cx = x1
    cy = y1
  }

  BIRTHDAY_PHOTOS.forEach((p, i) => {
    const left = i % 2 === 0
    const [sw, sh] = dim[i]
    const y = sy + gap * (i + 1)
    const sl = ox + (left ? W * 0.04 : W * 0.96 - sw)
    const x = sl + sw * [0.5, 0.66, 0.5, 0.5, 0.5][i]

    seg(x, y)
    bStops.push(bS[bS.length - 1].l)

    const st = document.createElement('img')
    st.className = 'st'
    st.src = BIRTHDAY_STICKERS[i].src
    st.alt = ''
    st.style.cssText = `left:${sl}px;top:${y - 2}px;width:${sw}px;height:${sh}px`
    bWrap.appendChild(st)
    bSts.push(st)

    const cl = left ? sl + sw + W * 0.02 : sl - W * 0.02 - cw
    const c = document.createElement('div')
    c.className = 'card'
    c.style.cssText = `width:${cw}px;left:${cl}px;top:${y + 40}px;--r:${left ? 3 : -3}deg`
    c.innerHTML = `<div class="ph" data-i="${i}">${p.src ? `<img src="${p.src}" alt="">` : '＋ photo'}</div><p>${p.cap || ''}</p>`
    bWrap.appendChild(c)
    bCards.push(c)

    if (i < BIRTHDAY_PHOTOS.length - 1) {
      seg(x, y + sh * 0.5 + 20)
    }
  })

  if (bS.length) {
    const lastPhotoPt = bS[bS.length - 1]
    const lastSh = dim[dim.length - 1][1]
    const trailEndY = lastPhotoPt.y + lastSh * 0.5 + 40
    seg(W0 / 2, trailEndY)
  }

  bS.forEach((p, i) => (p.m = i ? Math.max(bS[i - 1].m, p.y) : p.y))
  const last = bS[bS.length - 1]
  bTotal = last.l
  const cardBottom = last.y + cw + 40
  bH = Math.max(last.y, cardBottom) + 20
  bWrap.style.height = bH + 'px'

  bSvg.setAttribute('width', W0)
  bSvg.setAttribute('height', bH)
  bSvg.setAttribute('viewBox', `0 0 ${W0} ${bH}`)
  bTrail.setAttribute('d', 'M' + bS.map(p => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('L'))

  renderBirthday()
}

function renderBirthday() {
  if (!bS.length) return
  const ty = window.scrollY + window.innerHeight * 0.4
  let lo = 0, hi = bS.length - 1
  while (lo < hi) {
    const m = (lo + hi) >> 1
    bS[m].m < ty ? (lo = m + 1) : (hi = m)
  }
  const i = Math.max(1, lo)
  const a = bS[i - 1], b = bS[i]
  const f = b.y === a.y ? 0 : Math.min(1, Math.max(0, (ty - a.y) / (b.y - a.y)))
  const x = a.x + (b.x - a.x) * f
  const y = a.y + (b.y - a.y) * f
  const l = ty <= bS[0].y ? 0 : a.l + (b.l - a.l) * f

  bDot.setAttribute('cx', ty <= bS[0].y ? bS[0].x : x)
  bDot.setAttribute('cy', ty <= bS[0].y ? bS[0].y : y)
  bTrail.setAttribute('stroke-dasharray', `${l} ${bTotal + 10}`)

  bCards.forEach((c, k) => {
    const on = l >= bStops[k] - 30
    c.classList.toggle('show', on)
    if (bSts[k]) bSts[k].classList.toggle('hit', on)
  })
}

window.addEventListener('scroll', renderBirthday, { passive: true })
let bRt
window.addEventListener('resize', () => {
  clearTimeout(bRt)
  bRt = setTimeout(buildBirthday, 150)
})

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    bStop.style.visibility = 'hidden'
    buildBirthday()
  })
} else {
  bStop.style.visibility = 'hidden'
  buildBirthday()
}

// Birthday photo replace
let bPick = null
bWrap.addEventListener('click', e => {
  const h = e.target.closest('.ph')
  if (h) {
    bPick = +h.dataset.i
    bFileInput.click()
  }
})

bFileInput.onchange = e => {
  const fl = e.target.files[0]
  if (!fl || bPick === null) return
  const u = URL.createObjectURL(fl)
  BIRTHDAY_PHOTOS[bPick].src = u
  bCards[bPick].querySelector('.ph').innerHTML = `<img src="${u}" alt="">`
  e.target.value = ''
  confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } })
}

// ==========================================
// 6. INITIALIZE DIARY MODULE
// ==========================================
const diaryRoot = document.getElementById('diary-root')
if (diaryRoot) {
  initDiary(diaryRoot)
}

// ==========================================
// 7. AMBIENT AUDIO TOGGLE
// ==========================================
const audioBtn = document.querySelector('#audio-toggle')
if (audioBtn) {
  audioBtn.addEventListener('click', () => {
    const isPlaying = sound.toggleRain()
    if (isPlaying) {
      audioBtn.classList.add('playing')
      audioBtn.querySelector('.audio-text').textContent = 'Rain Drizzle: Playing'
    } else {
      audioBtn.classList.remove('playing')
      audioBtn.querySelector('.audio-text').textContent = 'Rain Drizzle: Off'
    }
  })
}
