/**
 * SecureVideoPlayer — Video.js-powered player with:
 *  • Zata proxy stream via sessionToken
 *  • MutationObserver-protected watermark (email + timestamp)
 *  • Automatic playback pause if watermark is tampered
 *  • Throttled watch-progress heartbeat every 10 s
 */
import { useEffect, useRef, useCallback } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import { buildStreamUrl, reportProgress } from '../../api/services/videoService.js'
import { useAuthStore } from '../../store/authStore.js'

export default function SecureVideoPlayer({
  videoId,
  sessionToken,
  durationSec = 0,
  startPosition = 0,
  onProgress,
  onEnded,
  className = '',
}) {
  const containerRef = useRef(null)
  const playerRef    = useRef(null)
  const watermarkRef = useRef(null)
  const observerRef  = useRef(null)
  const lastReported = useRef(0)
  const intervalRef  = useRef(null)
  const currentUser  = useAuthStore((s) => s.currentUser)

  // ── Heartbeat ────────────────────────────────────────────────────────────
  const sendHeartbeat = useCallback((player) => {
    const pos = player.currentTime()
    const prev = lastReported.current
    if (Math.abs(pos - prev) < 1) return
    const range = [Math.min(prev, pos), Math.max(prev, pos)]
    lastReported.current = pos
    reportProgress(videoId, pos, range, durationSec)
    onProgress?.(pos, durationSec)
  }, [videoId, durationSec, onProgress])

  // ── Watermark tamper guard ────────────────────────────────────────────────
  const armWatermarkGuard = useCallback((player) => {
    if (observerRef.current) observerRef.current.disconnect()
    const container = containerRef.current
    if (!container || !watermarkRef.current) return

    const stopPlayback = () => {
      player.pause()
      player.error({ code: 0, message: 'Security violation — playback stopped.' })
    }

    observerRef.current = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // Node removed
        if (m.type === 'childList') {
          for (const node of m.removedNodes) {
            if (node === watermarkRef.current || node.contains?.(watermarkRef.current)) {
              stopPlayback(); return
            }
          }
        }
        // Attribute changed (display, opacity, visibility)
        if (m.type === 'attributes' && m.target === watermarkRef.current) {
          const el = watermarkRef.current
          const style = window.getComputedStyle(el)
          if (
            el.style.display === 'none' ||
            parseFloat(el.style.opacity) < 0.01 ||
            el.style.visibility === 'hidden' ||
            parseFloat(style.opacity) < 0.01
          ) { stopPlayback(); return }
        }
      }
    })

    observerRef.current.observe(container, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['style', 'class'],
    })
  }, [])

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !sessionToken) return

    const videoEl = containerRef.current.querySelector('video')
    if (!videoEl || playerRef.current) return

    const streamUrl = buildStreamUrl(videoId, sessionToken)

    const player = videojs(videoEl, {
      controls: true,
      autoplay: false,
      preload: 'metadata',
      fluid: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      sources: [{ src: streamUrl, type: 'video/mp4' }],
      html5: { vhs: { overrideNative: false } },
    })
    playerRef.current = player

    // Seek to last known position
    player.ready(() => {
      if (startPosition > 0) player.currentTime(startPosition)
      armWatermarkGuard(player)
    })

    // Throttled heartbeat every 10 s
    intervalRef.current = setInterval(() => {
      if (!player.paused() && !player.ended()) sendHeartbeat(player)
    }, 10000)

    player.on('ended', () => {
      sendHeartbeat(player)
      onEnded?.()
    })

    player.on('pause', () => sendHeartbeat(player))

    return () => {
      clearInterval(intervalRef.current)
      observerRef.current?.disconnect()
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose()
        playerRef.current = null
      }
    }
  }, [videoId, sessionToken])

  // ── Watermark content ─────────────────────────────────────────────────────
  const email = currentUser?.email || 'unknown'
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })

  return (
    <div ref={containerRef} className={`relative bg-black overflow-hidden rounded-2xl ${className}`}>
      {/* Video.js target element */}
      <div data-vjs-player>
        <video className="video-js vjs-big-play-centered vjs-theme-city w-full" />
      </div>

      {/* Watermark overlay — protected by MutationObserver */}
      <div
        ref={watermarkRef}
        className="pointer-events-none absolute inset-0 z-30 select-none"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {/* Corner watermark */}
        <span
          className="absolute top-3 right-3 rounded-lg bg-black/50 px-2 py-1 font-mono text-[10px] text-white/70 backdrop-blur-sm"
          style={{ letterSpacing: '0.04em' }}
        >
          {email}
        </span>
        {/* Diagonal repeat (subtle) */}
        <span
          className="absolute bottom-12 left-4 rounded bg-black/30 px-2 py-0.5 font-mono text-[9px] text-white/40"
        >
          {email} · {now}
        </span>
      </div>
    </div>
  )
}
