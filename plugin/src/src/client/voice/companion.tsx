/**
 * CompanionWindow: reproduces the original hf-realtime-voice right-side
 * animation in DSH — a full-height column on the right (default 55vw):
 *
 *  - Idle: loops `bg-images` videos, advancing to the next on `ended`.
 *  - Speaking: while the ReplySpeaker is playing, cross-fades in a
 *    `task-videos` video (looping), then fades back to idle.
 *  - Draggable: an inner-edge handle resizes the column (240px–70vw,
 *    persisted) and double-clicking it flips the column to the left edge.
 *  - Toggle: `s2s.voice.companion` ('1'/'0', default on) hides it entirely.
 *
 * pointer-events:none on the column so chat interaction is never blocked;
 * only the drag handle is interactive.
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls ui-conversation's SlotMap merge for PropsRuntime resolution.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { bridgeBase } from '../bridge.ts'
import type { VoiceInjected } from '../contract.ts'
import css from './CompanionWindow.module.css'

const WIDTH_KEY = 's2s.voice.companionW'
const SIDE_KEY = 's2s.voice.companionSide'

const MIN_WIDTH_VW = Math.max(10, 240 / window.innerWidth * 100) // ~240px
const MAX_WIDTH_VW = 70

function readWidth(): number {
  try {
    const value = Number.parseFloat(localStorage.getItem(WIDTH_KEY) ?? '')
    if (Number.isFinite(value) && value >= MIN_WIDTH_VW && value <= MAX_WIDTH_VW) return value
  } catch {
    // fall through to default
  }
  return 55
}

function readSide(): 'left' | 'right' {
  try {
    return localStorage.getItem(SIDE_KEY) === 'left' ? 'left' : 'right'
  } catch {
    return 'right'
  }
}

/** Full props: framework runtime share + `voice` locale seat + injected face. */
export type CompanionWindowProps =
  PropsRuntime<'conversation.input.left'> & PropsLocale<'voice'> & VoiceInjected

/**
 * @param props - framework runtime + locale + injected speaker face.
 */
export const CompanionWindow = memo(function CompanionWindow({ speaker, companion, skinController, livetalking }: CompanionWindowProps) {
  const [visible, setVisible] = useState<boolean>(companion.visible)
  const [widthVw, setWidthVw] = useState<number>(readWidth)
  const [side, setSide] = useState<'left' | 'right'>(readSide)
  const [speaking, setSpeaking] = useState<boolean>(speaker.speaking)
  const [bgMedia, setBgMedia] = useState<{ url: string; type: 'video' | 'image' }[]>([])
  const [taskVideos, setTaskVideos] = useState<string[]>([])
  const [bgIndex, setBgIndex] = useState(0)
  const [taskIndex, setTaskIndex] = useState(0)
  const [mediaTick, setMediaTick] = useState(0)
  const [dhStream, setDhStream] = useState<MediaStream | null>(null)
  // Digital-human mode: show the LiveTalking real-time video when connected;
  // the pre-recorded skins stay available via the toggle (persisted).
  const [dhMode, setDhMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('s2s.voice.livetalkingMode') !== '0'
    } catch {
      return true
    }
  })
  const idleRef = useRef<HTMLVideoElement | null>(null)
  const speakRef = useRef<HTMLVideoElement | null>(null)
  const dhRef = useRef<HTMLVideoElement | null>(null)
  const dragRef = useRef<{ startX: number; startWidth: number; current: number } | null>(null)

  // Follow the shared companion visibility (the toggle flips it live).
  useEffect(() => {
    return companion.subscribe(() => setVisible(companion.visible))
  }, [companion])

  // Connect the real-time digital human and follow its stream.
  useEffect(() => {
    const unsub = livetalking.subscribe(() => {
      setDhStream(livetalking.videoStream)
      setDhMode((mode) => mode || livetalking.connected)
    })
    void livetalking.connect()
    return unsub
  }, [livetalking])

  // Attach the DH stream to the video element when it appears.
  useEffect(() => {
    const vid = dhRef.current
    if (vid === null) return
    vid.srcObject = dhStream
  }, [dhStream])

  const toggleDhMode = useCallback(() => {
    setDhMode((previous) => {
      const next = !previous
      try {
        localStorage.setItem('s2s.voice.livetalkingMode', next ? '1' : '0')
      } catch {
        // persistence unavailable — state still flips for this session
      }
      return next
    })
  }, [])

  // Reload media immediately when the skin picker switches skins/uploads.
  useEffect(() => {
    return skinController.subscribe(() => setMediaTick((t) => t + 1))
  }, [skinController])

  // Load media lists from the bridge on mount, then re-poll every 30 s so
  // videos dropped into the folders are picked up without a page refresh.
  // Only list CHANGES update state (the playing video is not restarted when
  // nothing changed).
  const mediaJsonRef = useRef('')
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const base = bridgeBase()
        const [bg, task] = await Promise.all([
          fetch(`${base}/api/media/bg-images`).then((r) => r.json() as Promise<{ media: { name: string; type: string }[] }>),
          fetch(`${base}/api/media/task-videos`).then((r) => r.json() as Promise<{ videos: string[] }>),
        ])
        if (cancelled) return
        const json = JSON.stringify([bg.media, task.videos])
        if (json === mediaJsonRef.current) return
        mediaJsonRef.current = json
        setBgMedia(bg.media.map((m) => ({
          url: `${base}/media/bg-images/${encodeURIComponent(m.name)}`,
          type: m.type === 'image' ? 'image' : 'video',
        })))
        setTaskVideos(task.videos.map((name) => `${base}/media/task-videos/${encodeURIComponent(name)}`))
      } catch (err) {
        console.error('[ui-voice] companion media list failed:', err)
      }
    }
    void load()
    const timer = window.setInterval(load, 30000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [mediaTick])

  // Follow the speaker's speaking state.
  useEffect(() => {
    return speaker.subscribe(() => setSpeaking(speaker.speaking))
  }, [speaker])

  // Idle layer (video): play bgMedia[bgIndex] when it is a video; advance on
  // ended. `visible` is a dependency because hiding unmounts the <video>
  // element; on re-show the effect must re-run to (re)attach the source,
  // otherwise the window comes back blank.
  useEffect(() => {
    const vid = idleRef.current
    const item = bgMedia[bgIndex % bgMedia.length]
    if (!visible || item === undefined || item.type !== 'video' || vid === null) return
    vid.src = item.url
    void vid.play().catch(() => {})
  }, [bgIndex, bgMedia, visible])

  // Idle layer (image): static images have no `ended` event — advance on a
  // timer instead (only while visible and not speaking).
  useEffect(() => {
    const item = bgMedia[bgIndex % bgMedia.length]
    if (!visible || item === undefined || item.type !== 'image' || speaking || bgMedia.length < 2) return
    const timer = window.setTimeout(() => setBgIndex((i) => (i + 1) % bgMedia.length), 10000)
    return () => window.clearTimeout(timer)
  }, [bgIndex, bgMedia, visible, speaking])

  // Rotate the speaking clip once per new reply (each speaking start).
  const wasSpeakingRef = useRef(false)
  useEffect(() => {
    if (speaking && !wasSpeakingRef.current && taskVideos.length > 0) {
      setTaskIndex((i) => (i + 1) % taskVideos.length)
    }
    wasSpeakingRef.current = speaking
  }, [speaking, taskVideos.length])

  // Speaking layer: play taskVideos[taskIndex] while speaking; stop otherwise.
  // `visible` is a dependency for the same unmount/remount reason as the idle
  // layer: on re-show the effect re-attaches the source and resumes playback.
  useEffect(() => {
    const vid = speakRef.current
    const src = taskVideos[taskIndex % taskVideos.length]
    if (!visible || vid === null || src === undefined) return
    if (speaking) {
      vid.src = src
      void vid.play().catch(() => {})
    } else {
      vid.pause()
      vid.currentTime = 0
    }
  }, [speaking, taskIndex, taskVideos, visible])

  const onIdleEnded = useCallback(() => {
    if (bgMedia.length > 1) setBgIndex((i) => (i + 1) % bgMedia.length)
  }, [bgMedia.length])

  const onSpeakEnded = useCallback(() => {
    // Keep looping the speaking clip while the reply is still playing.
    const vid = speakRef.current
    if (vid !== null && speaking) {
      vid.currentTime = 0
      void vid.play().catch(() => {})
    }
  }, [speaking])

  // Drag: resize on move (persist the live value), flip side on double-click.
  const beginDrag = useCallback((clientX: number) => {
    dragRef.current = { startX: clientX, startWidth: widthVw, current: widthVw }
    const onMove = (move: PointerEvent) => {
      const drag = dragRef.current
      if (drag === null) return
      const deltaVw = ((move.clientX - drag.startX) / window.innerWidth) * 100
      drag.current = Math.min(MAX_WIDTH_VW, Math.max(MIN_WIDTH_VW, drag.startWidth + (side === 'right' ? -deltaVw : deltaVw)))
      setWidthVw(drag.current)
    }
    const onUp = () => {
      const drag = dragRef.current
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (drag !== null) {
        try {
          localStorage.setItem(WIDTH_KEY, String(drag.current))
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [widthVw, side])

  const flipSide = useCallback(() => {
    setSide((previous) => {
      const next = previous === 'right' ? 'left' : 'right'
      try {
        localStorage.setItem(SIDE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  if (!visible) return null
  if (!dhMode && bgMedia.length === 0 && taskVideos.length === 0) return null

  const idleItem = bgMedia[bgIndex % bgMedia.length]
  const idleIsVideo = idleItem !== undefined && idleItem.type === 'video'

  return (
    <div
      className={side === 'right' ? css.companion : `${css.companion} ${css.left}`}
      style={{ width: `${widthVw}vw`, right: side === 'right' ? 0 : undefined, left: side === 'left' ? 0 : undefined }}
      aria-hidden="true"
    >
      {dhMode && dhStream !== null && (
        <video ref={dhRef} className={css.video} muted autoPlay playsInline />
      )}
      {!dhMode && bgMedia.length > 0 && idleIsVideo && (
        <video ref={idleRef} className={speaking ? `${css.video} ${css.hidden}` : css.video} muted playsInline preload="auto" onEnded={onIdleEnded} />
      )}
      {!dhMode && bgMedia.length > 0 && idleItem !== undefined && !idleIsVideo && (
        <img src={idleItem.url} className={speaking ? `${css.video} ${css.hidden}` : css.video} alt="" draggable={false} />
      )}
      {!dhMode && taskVideos.length > 0 && (
        <video ref={speakRef} className={speaking ? css.video : `${css.video} ${css.hidden}`} muted playsInline preload="auto" onEnded={onSpeakEnded} />
      )}
      <button
        type="button"
        className={css.dhToggle}
        title={dhMode ? '数字人模式（点击切回皮肤）' : '皮肤模式（点击切换数字人）'}
        onClick={toggleDhMode}
      >
        {dhMode ? '🤖' : '🎨'}
      </button>
      <div
        className={css.handle}
        onPointerDown={(event) => {
          event.preventDefault()
          beginDrag(event.clientX)
        }}
        onDoubleClick={flipSide}
        title="拖动调宽,双击换边"
      />
    </div>
  )
})
