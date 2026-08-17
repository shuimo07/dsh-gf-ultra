/**
 * Companion service lifecycle: a tiny always-on launcher (:8768) owns the
 * heavy processes. The voice bridge (FunASR + TTS) runs only while voice
 * reading is on OR the companion window is shown; LiveTalking + llama run
 * only while the window is shown. Turning everything off stops the processes
 * so RAM/VRAM returns to idle.
 */

const LAUNCHER_KEY = 's2s.voice.launcher'
const VOICE_ENABLED_KEY = 's2s.voice.enabled'
const COMPANION_KEY = 's2s.voice.companion'

/** Resolve the launcher base URL (localStorage override wins). */
export function launcherBase(): string {
  try {
    return localStorage.getItem(LAUNCHER_KEY)?.trim() || 'http://127.0.0.1:8768'
  } catch {
    return 'http://127.0.0.1:8768'
  }
}

function flag(key: string): boolean {
  try {
    return localStorage.getItem(key) !== '0'
  } catch {
    return true
  }
}

/** Fire-and-forget POST to the launcher. */
export function postLauncher(path: string): void {
  fetch(`${launcherBase()}${path}`, { method: 'POST' }).catch(() => {
    // launcher not reachable — nothing to do (services stay as they are)
  })
}

/**
 * Reconcile the voice bridge state against the current flags: the bridge
 * runs while reading is enabled OR the companion window is visible.
 */
export function syncBridge(): void {
  const needed = flag(VOICE_ENABLED_KEY) || flag(COMPANION_KEY)
  postLauncher(needed ? '/api/bridge/start' : '/api/bridge/stop')
}

/** Companion window shown -> start LiveTalking + llama; hidden -> stop. */
export function syncCompanion(visible: boolean): void {
  postLauncher(visible ? '/api/companion/start' : '/api/companion/stop')
}
