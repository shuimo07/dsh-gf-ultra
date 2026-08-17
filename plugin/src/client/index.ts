/**
 * Browser voice plugin: the composer tool-row seat for the mic control.
 *
 * T5: capture (embedded mic-capture worklet) + silence endpointing ->
 * bridge /api/stt -> conversation.send(text). T6 adds reply TTS playback;
 * T7 the toggles; plus the voice (timbre) manager.
 *
 * NOTE: the digital-human / skin / companion / QQ-push / busy-toggle features
 * were removed when the companion project was abandoned (see repo README).
 */
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls ui-conversation's SlotMap merge so PropsRuntime resolves.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { MicButton } from './MicButton.tsx'
import { BridgeStatus } from './BridgeStatus.tsx'
import { ReplySpeakerMount } from './voice/reply-listener.tsx'
import { ReplySpeaker } from './voice/speaker.ts'
import { VoiceToggle } from './VoiceToggle.tsx'
import { VoiceManager } from './VoiceManager.tsx'
import { bridgeBase } from './bridge.ts'
import type { VoiceInjected } from './contract.ts'
import { en, zh, type VoiceKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The voice control's copy. */
    voice: VoiceKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'voice'

/** Required services: the slot registry, this plugin's copy, and the sessions service. */
export const inject = ['slots', 'locale', 'sessions']

/**
 * Client plugin body: register the `voice` dictionaries and the mic control
 * into the composer tool row (`conversation.input.left`, a list seat beside
 * the resident chrome — never replaces it). The injected `sendText` resolves
 * the session-scoped conversation service at call time (scope addressing).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  // Diagnostic stamp: tells us which bundle build the browser actually runs.
  console.log('[ui-voice] loaded, bridge =', bridgeBase())

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-voice: dictionaries')

  // One shared speaker per plugin fiber: the reply listener plays through it.
  const speaker = new ReplySpeaker()
  ctx.effect(() => () => speaker.dispose(), 'ui-voice: speaker teardown')

  // One shared TTS abort holder: the reply listener registers its current
  // AbortController; the voice toggle aborts it when turned off so the bridge
  // stops synthesizing (client disconnect) instead of draining its queue.
  let activeTtsController: AbortController | null = null
  // Barge-in handler registered by the reply listener (swallow the current
  // reply when the user starts speaking).
  let interruptHandler: (() => void) | null = null

  const injectFace = (sessionId: SessionId | undefined): VoiceInjected => ({
    sendText: async (text: string) => {
      if (sessionId === undefined) throw new Error('[ui-voice] no session scope for sendText')
      const binding = ctx.sessions.binding(sessionId)
      const session = binding?.session
      if (session === undefined) throw new Error('[ui-voice] session unavailable for sendText')
      // Voice input must send IMMEDIATELY: when the agent's turn is still
      // running (my reply streaming), a plain queue would sit as a pending
      // item in the input dock, needing a manual send — the "second sentence
      // stuck" bug. Default: steer, which interrupts the running turn.
      const running = session.getSnapshot()?.running === true
      const mode = running ? 'steer' : 'queue'
      const result = await session.prompt([{ type: 'text', text }], mode)
      if (!result.ok) {
        throw new Error(`[ui-voice] prompt failed: ${result.error.code}: ${result.error.message}`)
      }
    },
    speaker,
    abortTts: () => {
      activeTtsController?.abort()
      activeTtsController = null
    },
    // Internal wiring for the reply listener (not part of the public face
    // contract, but typed as the shared holders the listener fills in).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _registerTtsAbort: (controller: AbortController | null) => {
      activeTtsController = controller
    },
    interruptReply: () => {
      // Mic barge-in: stop playback, abort the in-flight TTS request, and ask
      // the reply listener to swallow the rest of the current reply.
      speaker.stop()
      activeTtsController?.abort()
      activeTtsController = null
      interruptHandler?.()
    },
    _registerInterruptHandler: (handler: (() => void) | null) => {
      interruptHandler = handler
    },
  })

  ctx.slots.inject('conversation.input.left', () => ctx.slots.register(
    {
      name: 'conversation.input.left',
      id: 'voice-mic',
      order: 80,
      locale: NS,
      inject: injectFace,
    },
    MicButton,
  ))

  // Bridge-down warning (order 83): shows a ⚠ button when the voice bridge is
  // unreachable — the plugin alone is a hollow UI without the main repo.
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register(
    {
      name: 'conversation.input.left',
      id: 'voice-bridge-status',
      order: 83,
      locale: NS,
      inject: injectFace,
    },
    BridgeStatus,
  ))

  // Reply-reading toggle (s2s.voice.enabled; mic input stays independent).
  // Turning it OFF interrupts any reply currently being read aloud.
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register(
    {
      name: 'conversation.input.left',
      id: 'voice-toggle',
      order: 85,
      locale: NS,
      inject: injectFace,
    },
    VoiceToggle,
  ))

  // Voice manager: toolbar seat that opens the timbre panel (list / switch /
  // rename / delete / upload reference audio for TTS voice cloning).
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register(
    {
      name: 'conversation.input.left',
      id: 'voice-manager',
      order: 89,
      locale: NS,
      inject: injectFace,
    },
    VoiceManager,
  ))

  // Hidden per-session reply listener: speaks finalized assistant text.
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register(
    {
      name: 'conversation.input.left',
      id: 'voice-reply',
      order: 90,
      locale: NS,
      inject: injectFace,
    },
    ReplySpeakerMount,
  ))
}
