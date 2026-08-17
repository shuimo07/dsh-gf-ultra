/**
 * Bridge reachability helper for the 朗读 toggle.
 *
 * The browser cannot start processes — the plugin's node half (running inside
 * dsh web) watchdogs the bridge process and re-spawns it when down. This side
 * only checks /api/health and, when the bridge is down, waits for the
 * watchdog to bring it back (polling until ready or the timeout expires).
 */
import { bridgeBase } from '../bridge.ts'

async function bridgeHealthy(timeoutMs = 2000): Promise<boolean> {
  try {
    const resp = await fetch(`${bridgeBase()}/api/health`, { signal: AbortSignal.timeout(timeoutMs) })
    return resp.ok
  } catch {
    return false
  }
}

/** Single-flight guard so concurrent callers share one wait. */
let readyPromise: Promise<boolean> | null = null

/**
 * Make sure the bridge is reachable: quick probe; if down, poll until the
 * node-half watchdog has re-spawned it (or the timeout expires).
 */
export function ensureBridgeReady(timeoutMs = 30000): Promise<boolean> {
  if (readyPromise !== null) return readyPromise
  readyPromise = (async () => {
    try {
      if (await bridgeHealthy(1500)) return true
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        if (await bridgeHealthy(1500)) return true
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      return await bridgeHealthy(1500)
    } finally {
      readyPromise = null
    }
  })()
  return readyPromise
}
