import { useEffect, useRef } from 'react'
import { describeWeather } from '../lib/weatherCodes'
import { hexToRgb, mixHex } from '../lib/color'
import type { Palette } from '../lib/palettes'

interface AtmosphereProps {
  palette: Palette
  paletteRef: React.RefObject<Palette>
  cloudCover: number
  precipitation: number
  precipProbability: number
  windSpeed: number
  code: number
  stars: number
  reducedMotion: boolean
}

interface Star {
  x: number
  y: number
  r: number
  base: number
  phase: number
  freq: number
}

interface Cloud {
  x: number
  y: number
  scale: number
  speed: number
  alpha: number
  sprite: number
  flip: boolean
  phase: number
}

interface RainDrop {
  x: number
  y: number
  len: number
  speed: number
  alpha: number
}

interface SnowFlake {
  x: number
  y: number
  r: number
  speed: number
  sway: number
  phase: number
  alpha: number
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Soft, layered cloud sprites are painted once per palette and reused. */
function buildCloudSprites(color: string): HTMLCanvasElement[] {
  const sprites: HTMLCanvasElement[] = []
  for (let s = 0; s < 6; s += 1) {
    const width = 560
    const height = 280
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    const random = mulberry32(1177 + s * 89)
    const puffs = 14
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < puffs; i += 1) {
      const cx = 110 + random() * 340
      const cy = 120 + random() * 80
      const radius = 38 + random() * 62
      const gradient = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius)
      gradient.addColorStop(0, rgba(color, 0.34))
      gradient.addColorStop(0.45, rgba(color, 0.16))
      gradient.addColorStop(1, rgba(color, 0))
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    sprites.push(canvas)
  }
  return sprites
}

export function Atmosphere(props: AtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const spritesRef = useRef<HTMLCanvasElement[]>([])

  const light = props.palette.mode === 'light'
  const tint = light ? mixHex(props.palette.cloud, '#4a4234', 0.55) : props.palette.cloud

  useEffect(() => {
    spritesRef.current = buildCloudSprites(tint)
  }, [tint])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let stars: Star[] = []
    let clouds: Cloud[] = []
    let rain: RainDrop[] = []
    let snow: SnowFlake[] = []
    let cloudLevel = 0
    let precipLevel = 0
    let starLevel = 0
    let raf = 0
    let last = performance.now()
    let lastStatic = 0
    let quietPainted = false
    let pointerX = 0
    let pointerY = 0
    let easedX = 0
    let easedY = 0

    const random = mulberry32(20261115)

    const buildStars = () => {
      const density = Math.min(1, (width * height) / (1440 * 900))
      const count = Math.round(170 * density)
      stars = Array.from({ length: count }, () => ({
        x: random(),
        y: Math.pow(random(), 1.25) * 0.92,
        r: 0.4 + random() * 1.15,
        base: 0.25 + random() * 0.65,
        phase: random() * Math.PI * 2,
        freq: 0.5 + random() * 1.6,
      }))
    }

    const buildClouds = () => {
      clouds = Array.from({ length: 9 }, (_, i) => ({
        x: -0.25 + (i / 9) * 1.4 + random() * 0.16,
        y: 0.02 + random() * 0.52,
        scale: 0.34 + random() * 0.85,
        speed: 4 + random() * 13,
        alpha: 0.32 + random() * 0.38,
        sprite: i % 6,
        flip: random() > 0.5,
        phase: random() * Math.PI * 2,
      }))
    }

    const buildPrecip = () => {
      rain = Array.from({ length: 460 }, () => ({
        x: random() * (width || 1),
        y: random() * (height || 1),
        len: 7 + random() * 14,
        speed: 520 + random() * 680,
        alpha: 0.1 + random() * 0.26,
      }))
      snow = Array.from({ length: 300 }, () => ({
        x: random() * (width || 1),
        y: random() * (height || 1),
        r: 0.8 + random() * 2.1,
        speed: 22 + random() * 55,
        sway: 8 + random() * 22,
        phase: random() * Math.PI * 2,
        alpha: 0.35 + random() * 0.55,
      }))
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      if (width * height > 2_300_000) dpr = Math.min(dpr, 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildStars()
      buildPrecip()
    }

    buildStars()
    buildClouds()
    buildPrecip()
    resize()

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2
    }

    const onLeave = () => {
      pointerX = 0
      pointerY = 0
    }

    const targetClouds = () => {
      const p = propsRef.current
      return Math.max(0, Math.min(9, (p.cloudCover / 100) * 9.2))
    }

    const targetPrecip = () => {
      const p = propsRef.current
      const group = describeWeather(p.code).group
      const isSnowy = group === 'snow'
      const wet = group === 'rain' || group === 'drizzle' || group === 'storm'
      if (!wet && !isSnowy) return { rain: 0, snow: 0 }
      const probability = Math.max(0, Math.min(1, p.precipProbability / 100))
      const amount = Math.max(0, p.precipitation)
      const base = Math.min(1, 0.16 + amount * 0.22 + probability * 0.5)
      if (isSnowy) return { rain: 0, snow: base }
      return { rain: group === 'drizzle' ? base * 0.45 : base, snow: 0 }
    }

    const draw = (now: number, dt: number) => {
      const p = propsRef.current
      const palette = p.paletteRef.current
      const animate = !p.reducedMotion
      // Reduced motion keeps a still sky: freeze every ambient oscillation as
      // well as the cloud, rain and snow drift.
      const visualNow = animate ? now : 0
      const ease = (current: number, target: number, ms: number) =>
        current + (target - current) * (animate ? 1 - Math.exp(-dt / ms) : 1)

      cloudLevel = ease(cloudLevel, targetClouds(), 1200)
      starLevel = ease(starLevel, p.stars, 800)
      const precipTargets = targetPrecip()
      precipLevel = ease(precipLevel, Math.max(precipTargets.rain, precipTargets.snow), 1400)

      easedX = ease(easedX, animate ? pointerX : 0, 900)
      easedY = ease(easedY, animate ? pointerY : 0, 900)

      ctx.clearRect(0, 0, width, height)

      if (starLevel > 0.015) {
        ctx.fillStyle = palette.star
        for (const star of stars) {
          const twinkle = 0.55 + 0.45 * Math.sin(visualNow * 0.001 * star.freq + star.phase)
          const alpha = star.base * starLevel * twinkle
          ctx.globalAlpha = alpha
          const x = star.x * width + easedX * 4
          const y = star.y * height + easedY * 3
          if (star.r > 1.25) {
            ctx.fillRect(x - 0.5, y - 3, 1, 6)
            ctx.fillRect(x - 3, y - 0.5, 6, 1)
          }
          ctx.beginPath()
          ctx.arc(x, y, star.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      const sprites = spritesRef.current
      if (sprites.length > 0) {
        ctx.globalCompositeOperation = 'source-over'
        for (let i = 0; i < clouds.length; i += 1) {
          const cloud = clouds[i]
          const visibility = Math.max(0, Math.min(1, cloudLevel - i))
          if (visibility <= 0.01) continue
          if (animate) {
            cloud.x += (cloud.speed * dt) / 1000 / width
            if (cloud.x > 1.3) cloud.x = -0.32
          }
          const sprite = sprites[cloud.sprite % sprites.length]
          const drawWidth = Math.min(width * 0.82, 780) * cloud.scale
          const drawHeight = drawWidth * 0.5
          const cx = cloud.x * width + easedX * (4 + cloud.scale * 8)
          const cy = cloud.y * height + Math.sin(visualNow * 0.00004 + cloud.phase) * 6 + easedY * 4
          ctx.globalAlpha = cloud.alpha * visibility * (palette.mode === 'light' ? 0.48 : 0.42)
          ctx.save()
          ctx.translate(cx, cy)
          if (cloud.flip) ctx.scale(-1, 1)
          ctx.drawImage(sprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
          ctx.restore()
        }
      }

      const group = describeWeather(p.code).group
      const isSnowy = group === 'snow'
      if (precipLevel > 0.01) {
        if (isSnowy) {
          const active = Math.round(snow.length * Math.min(1, 0.25 + precipLevel * 0.9))
          ctx.fillStyle = palette.precip
          for (let i = 0; i < active; i += 1) {
            const flake = snow[i]
            if (animate) {
              flake.y += (flake.speed * dt) / 1000
              if (flake.y > height + 12) {
                flake.y = -12
                flake.x = random() * width
              }
            }
            const x = flake.x + Math.sin(visualNow * 0.0007 + flake.phase) * flake.sway
            ctx.globalAlpha = Math.min(1, flake.alpha * precipLevel * 0.9 + 0.05)
            ctx.beginPath()
            ctx.arc(x, flake.y, flake.r, 0, Math.PI * 2)
            ctx.fill()
          }
        } else {
          const slant = Math.max(-42, Math.min(42, p.windSpeed * 0.9))
          const active = Math.round(rain.length * Math.min(1, 0.2 + precipLevel * 0.95))
          ctx.strokeStyle = palette.precip
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.1 + precipLevel * 0.24
          ctx.beginPath()
          for (let i = 0; i < active; i += 1) {
            const drop = rain[i]
            if (animate) {
              drop.y += (drop.speed * dt) / 1000
              drop.x += (slant * dt) / 1000
              if (drop.y > height + 24) {
                drop.y = -24 - random() * 40
                drop.x = random() * (width + 80) - 40
              }
              if (drop.x > width + 30) drop.x = -30
              if (drop.x < -30) drop.x = width + 30
            }
            const dx = slant * 0.012
            ctx.moveTo(drop.x, drop.y)
            ctx.lineTo(drop.x + dx, drop.y + drop.len)
          }
          ctx.stroke()
        }
      }

      if (group === 'fog') {
        const fogColor = palette.mode === 'light' ? mixHex(palette.cloud, '#5a5244', 0.45) : palette.cloud
        for (let i = 0; i < 5; i += 1) {
          const bandY = height * (0.38 + i * 0.1)
          const drift = animate ? Math.sin(visualNow * 0.000045 + i * 1.7) * width * 0.09 : 0
          const bandX = width * (0.5 + Math.sin(i * 2.1) * 0.18) + drift
          const radius = width * (0.34 + (i % 3) * 0.08)
          const gradient = ctx.createRadialGradient(bandX, bandY, radius * 0.1, bandX, bandY, radius)
          gradient.addColorStop(0, rgba(fogColor, 0.07))
          gradient.addColorStop(0.6, rgba(fogColor, 0.04))
          gradient.addColorStop(1, rgba(fogColor, 0))
          ctx.globalAlpha = 1
          ctx.fillStyle = gradient
          ctx.save()
          ctx.translate(bandX, bandY)
          ctx.scale(1, 0.35)
          ctx.beginPath()
          ctx.arc(0, 0, radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      raf = window.requestAnimationFrame(frame)
      if (document.hidden) return
      const dt = Math.min(60, now - last)
      last = now

      const p = propsRef.current
      const group = describeWeather(p.code).group
      const weatherQuiet =
        p.stars < 0.01 &&
        p.cloudCover < 2 &&
        group !== 'fog' &&
        group !== 'rain' &&
        group !== 'drizzle' &&
        group !== 'snow' &&
        group !== 'storm'
      const settled =
        starLevel < 0.004 &&
        cloudLevel < 0.004 &&
        precipLevel < 0.004 &&
        Math.abs(easedX) < 0.001 &&
        Math.abs(easedY) < 0.001
      if (weatherQuiet && settled) {
        if (!quietPainted) {
          ctx.clearRect(0, 0, width, height)
          quietPainted = true
        }
        return
      }
      quietPainted = false

      if (p.reducedMotion) {
        if (now - lastStatic < 320) return
        lastStatic = now
        draw(now, 0)
      } else {
        draw(now, dt)
      }
    }

    // Apply the live palette immediately, then begin.
    draw(performance.now(), 0)
    raf = window.requestAnimationFrame(frame)

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    const onVisibility = () => {
      last = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className="sky-canvas" aria-hidden="true" />
}
