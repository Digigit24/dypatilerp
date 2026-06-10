/**
 * SecureVideoPlayer — enterprise-grade Video.js player with:
 *  • YouTube-like custom skin (gradient control bar, accent progress ring)
 *  • HTTP-range streaming via signed session token (seek without full download)
 *  • Poster / thumbnail shown before playback starts
 *  • Playback-rate selector  (0.5 → 2×)
 *  • MutationObserver watermark tamper-guard
 *  • Throttled watch-progress heartbeat
 *  • Clean React + StrictMode lifecycle (video element created imperatively)
 *  • Picture-in-Picture survives route changes — player stays alive while PiP
 *    is active and is only disposed after the user exits PiP. Clicking
 *    "Back to tab" in the PiP window navigates back to the lecture page.
 */
import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import { buildStreamUrl, reportProgress } from '../../api/services/videoService.js'
import { useAuthStore } from '../../store/authStore.js'

// ─── Custom Video.js skin ─────────────────────────────────────────────────────
const PLAYER_STYLE = `
.vjs-dypatil {
  font-family: system-ui, -apple-system, sans-serif;
  border-radius: 12px;
  overflow: hidden;
}
.vjs-dypatil .vjs-tech { border-radius: 0; }

/* Control bar */
.vjs-dypatil .vjs-control-bar {
  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
  height: 48px;
  padding: 0 8px;
  align-items: center;
  display: flex;
}
.vjs-dypatil.vjs-user-inactive:not(.vjs-paused) .vjs-control-bar { opacity: 0; transition: opacity .3s; }
.vjs-dypatil.vjs-user-active .vjs-control-bar,
.vjs-dypatil.vjs-paused .vjs-control-bar { opacity: 1; }

/* Progress bar */
.vjs-dypatil .vjs-progress-control {
  position: absolute;
  bottom: 44px;
  left: 0; right: 0;
  width: 100%;
  height: 4px;
  padding: 0;
}
.vjs-dypatil .vjs-progress-control:hover { height: 6px; bottom: 43px; }
.vjs-dypatil .vjs-progress-holder { height: 100%; border-radius: 2px; }
.vjs-dypatil .vjs-play-progress { background: #6366f1; border-radius: 2px; }
.vjs-dypatil .vjs-play-progress:before { display: none; }
.vjs-dypatil .vjs-load-progress { background: rgba(255,255,255,0.2); border-radius: 2px; }
.vjs-dypatil .vjs-slider { background: rgba(255,255,255,0.15); border-radius: 2px; }

/* Big play button */
.vjs-dypatil .vjs-big-play-button {
  background: rgba(99,102,241,0.85) !important;
  border: none;
  border-radius: 50%;
  width: 72px;
  height: 72px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  backdrop-filter: blur(8px);
  transition: background .2s, transform .15s;
  box-shadow: 0 4px 32px rgba(0,0,0,0.4);
}
.vjs-dypatil:hover .vjs-big-play-button { background: rgba(99,102,241,1) !important; transform: translate(-50%, -50%) scale(1.06); }
.vjs-dypatil .vjs-big-play-button .vjs-icon-placeholder:before { line-height: 72px; font-size: 32px; }

/* Control buttons */
.vjs-dypatil .vjs-button > .vjs-icon-placeholder:before { font-size: 18px; line-height: 48px; }
.vjs-dypatil .vjs-mute-control .vjs-icon-placeholder:before { font-size: 16px; }

/* Volume bar */
.vjs-dypatil .vjs-volume-bar { margin: 18px 6px; }
.vjs-dypatil .vjs-volume-level { background: #6366f1; }

/* Time display */
.vjs-dypatil .vjs-time-control { font-size: 12px; font-weight: 500; padding: 0 4px; }
.vjs-dypatil .vjs-current-time { color: #fff; }
.vjs-dypatil .vjs-duration  { color: rgba(255,255,255,0.55); }
.vjs-dypatil .vjs-time-divider { color: rgba(255,255,255,0.35); padding: 0; min-width: 10px; }

/* Playback rate menu */
.vjs-dypatil .vjs-playback-rate .vjs-playback-rate-value { font-size: 12px; font-weight: 600; line-height: 48px; }
.vjs-dypatil .vjs-menu-button-popup .vjs-menu { bottom: 3em; }
.vjs-dypatil .vjs-menu-content { background: rgba(15,23,42,0.95); border-radius: 8px; backdrop-filter: blur(12px); }
.vjs-dypatil .vjs-menu-item { font-size: 13px; padding: 8px 20px; }
.vjs-dypatil .vjs-menu-item:hover,
.vjs-dypatil .vjs-menu-item.vjs-selected { background: rgba(99,102,241,0.3); color: #fff; }

/* Loading spinner */
.vjs-dypatil .vjs-loading-spinner { border-color: rgba(99,102,241,0.2); }
.vjs-dypatil .vjs-loading-spinner:before,
.vjs-dypatil .vjs-loading-spinner:after { border-top-color: #6366f1; }

/* Error display */
.vjs-dypatil .vjs-error-display .vjs-modal-dialog-content {
  background: rgba(15,23,42,0.9);
  display: flex; align-items: center; justify-content: center;
}
.vjs-dypatil .vjs-error-display p { font-size: 14px; color: rgba(255,255,255,0.7); text-align: center; max-width: 320px; }

/* Poster image */
.vjs-dypatil .vjs-poster { background-size: cover; background-position: center; border-radius: 0; }

/* Suppress Chrome's native video overlay (Enhance, Cast, Download buttons).
   We add Video.js's own pictureInPictureToggle to the control bar instead,
   so PiP functionality is preserved through our custom controls. */
.vjs-dypatil .vjs-tech::-webkit-media-controls { display: none !important; }
.vjs-dypatil .vjs-tech::-webkit-media-controls-enclosure { display: none !important; }
.vjs-dypatil .vjs-tech::-webkit-media-controls-overlay-enclosure { display: none !important; }

/* Picture-in-picture toggle button */
.vjs-dypatil .vjs-picture-in-picture-control .vjs-icon-placeholder:before { font-size: 17px; line-height: 48px; }
`

// Inject style once
let styleInjected = false
const injectStyle = () => {
  if (styleInjected) return
  styleInjected = true
  const el = document.createElement('style')
  el.textContent = PLAYER_STYLE
  document.head.appendChild(el)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SecureVideoPlayer({
  videoId,
  sessionToken,
  posterUrl = null,
  durationSec = 0,
  startPosition = 0,
  autoplay = false,
  onProgress,
  onEnded,
  className = '',
}) {
  const navigate      = useNavigate()
  const navigateRef   = useRef(navigate)
  useEffect(() => { navigateRef.current = navigate }, [navigate])

  const containerRef  = useRef(null)
  const playerRef     = useRef(null)
  const watermarkRef  = useRef(null)
  const observerRef   = useRef(null)
  const lastReported  = useRef(0)
  const intervalRef   = useRef(null)
  const currentUser   = useAuthStore((s) => s.currentUser)

  // ── Heartbeat ───────────────────────────────────────────────────────────────
  const sendHeartbeat = useCallback((player) => {
    const pos  = player.currentTime()
    const prev = lastReported.current
    if (Math.abs(pos - prev) < 1) return
    const range = [Math.min(prev, pos), Math.max(prev, pos)]
    lastReported.current = pos
    reportProgress(videoId, pos, range, durationSec)
    onProgress?.(pos, durationSec)
  }, [videoId, durationSec, onProgress])

  // ── Watermark tamper guard ──────────────────────────────────────────────────
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
        if (m.type === 'childList') {
          for (const node of m.removedNodes) {
            if (node === watermarkRef.current || node.contains?.(watermarkRef.current)) {
              stopPlayback(); return
            }
          }
        }
        if (m.type === 'attributes' && m.target === watermarkRef.current) {
          const el    = watermarkRef.current
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

  // ── Player lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !sessionToken) return

    injectStyle()

    const streamUrl = buildStreamUrl(videoId, sessionToken)

    // Create video element imperatively — this sidesteps React StrictMode
    // double-invoke issues where Video.js disposes + removes the original element.
    const videoEl = document.createElement('video')
    videoEl.className = 'video-js vjs-dypatil vjs-big-play-centered vjs-fill'
    containerRef.current.insertBefore(videoEl, containerRef.current.firstChild)

    const player = videojs(videoEl, {
      controls:      true,
      autoplay:      false, // we handle autoplay manually in player.ready() below
      preload:       'metadata',
      fluid:         false,
      fill:          true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      poster:        posterUrl || undefined,
      sources:       [{ src: streamUrl, type: 'video/mp4' }],
      html5: {
        vhs: { overrideNative: false },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
      },
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'progressControl',
          'playbackRateMenuButton',
          'pictureInPictureToggle',
          'fullscreenToggle',
        ],
      },
    })
    playerRef.current = player

    player.ready(() => {
      if (startPosition > 0) player.currentTime(startPosition)
      // Resume playing when returning from PiP via "Back to tab"
      if (autoplay) player.play().catch(() => {})
      armWatermarkGuard(player)
    })

    // Heartbeat every 10 s while playing
    intervalRef.current = setInterval(() => {
      if (!player.paused() && !player.ended()) sendHeartbeat(player)
    }, 10000)

    player.on('ended', () => { sendHeartbeat(player); onEnded?.() })
    player.on('pause', () => sendHeartbeat(player))

    // Keyboard shortcuts
    const onKey = (e) => {
      if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.code === 'Space') { e.preventDefault(); player.paused() ? player.play() : player.pause() }
        if (e.code === 'ArrowRight') { e.preventDefault(); player.currentTime(Math.min(player.currentTime() + 10, player.duration())) }
        if (e.code === 'ArrowLeft')  { e.preventDefault(); player.currentTime(Math.max(player.currentTime() - 10, 0)) }
        if (e.code === 'ArrowUp')    { e.preventDefault(); player.volume(Math.min(player.volume() + 0.1, 1)) }
        if (e.code === 'ArrowDown')  { e.preventDefault(); player.volume(Math.max(player.volume() - 0.1, 0)) }
        if (e.code === 'KeyF')       { e.preventDefault(); player.isFullscreen() ? player.exitFullscreen() : player.requestFullscreen() }
        if (e.code === 'KeyM')       { e.preventDefault(); player.muted(!player.muted()) }
      }
    }
    document.addEventListener('keydown', onKey)

    // Capture the route the player was mounted on so "Back to tab" can return here
    const mountedPath = window.location.pathname

    return () => {
      clearInterval(intervalRef.current)
      observerRef.current?.disconnect()
      document.removeEventListener('keydown', onKey)

      const dispose = () => {
        if (playerRef.current && !playerRef.current.isDisposed()) {
          playerRef.current.dispose()
          playerRef.current = null
        }
        if (videoEl.parentNode) videoEl.remove()
      }

      // ── PiP survival ──────────────────────────────────────────────────────
      // If the video is currently in Picture-in-Picture (user navigated away
      // while PiP was playing), DO NOT destroy the player yet. Instead, keep
      // the video element alive and dispose only after PiP exits.
      // When the user clicks "Back to tab" in the PiP window, navigate them
      // back to the lecture page they came from.
      if (document.pictureInPictureElement === videoEl) {
        videoEl.addEventListener('leavepictureinpicture', () => {
          // Capture position *before* dispose so the player can resume there
          const resumeAt = videoEl.currentTime || 0
          if (window.location.pathname !== mountedPath) {
            // Pass pipResumeAt as route state — AdminLectureDetailPage reads this
            // to set startPosition + autoplay so playback continues seamlessly
            navigateRef.current(mountedPath, { state: { pipResumeAt: resumeAt } })
          }
          dispose()
        }, { once: true })
      } else {
        dispose()
      }
    }
  }, [videoId, sessionToken])

  // ── Watermark ───────────────────────────────────────────────────────────────
  const email = currentUser?.email || 'unknown'
  const now   = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })

  return (
    <div ref={containerRef} className={`relative aspect-video bg-[#0a0f1a] overflow-hidden rounded-xl ${className}`}>
      {/* Video.js mounts here imperatively */}

      {/* Watermark — MutationObserver protected */}
      <div
        ref={watermarkRef}
        className="pointer-events-none absolute inset-0 z-30 select-none"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <span className="absolute top-3 right-3 rounded-lg bg-black/50 px-2 py-1 font-mono text-[10px] text-white/60 backdrop-blur-sm" style={{ letterSpacing: '0.04em' }}>
          {email}
        </span>
        <span className="absolute bottom-14 left-4 rounded bg-black/30 px-2 py-0.5 font-mono text-[9px] text-white/30">
          {email} · {now}
        </span>
      </div>
    </div>
  )
}
