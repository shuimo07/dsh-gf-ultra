/**
 * Voice chat plugin, node half.
 *
 * Host-side watchdog for the local voice bridge: while this plugin is loaded
 * (i.e. while dsh web runs) it keeps an eye on the bridge (:8765) and
 * re-spawns it whenever it is down — so turning reading ON always finds the
 * bridge reachable again. The browser half only polls /api/health and waits;
 * it cannot start processes, the host half does that.
 *
 * Paths are hardcoded for this single-machine deployment (all storage on E:).
 */
import { Context } from '@deepseek-ai/cordis'

declare const process: { env: Record<string, string | undefined> }

const BRIDGE_DIR = 'E:\\AI\\dsh-voice-ai-girlfriend\\bridge'
const VENV_PY = 'E:\\AI\\dsh-voice-ai-girlfriend\\venv-speech\\Scripts\\python.exe'
const SCRATCH = 'E:\\AI\\dsh-voice-ai-girlfriend\\.scratch'
const BRIDGE_PORT = 8765

// Dynamic imports are typed `any` (the package builds without @types/node);
// the specifier strings stay literal so the node runtime resolves the builtins.
async function bridgeListening(): Promise<boolean> {
  try {
    const net = await import('node:net' as string)
    return await new Promise<boolean>((resolve) => {
      const sock = net.createConnection({ port: BRIDGE_PORT, host: '127.0.0.1' })
      sock.setTimeout(1500)
      let done = false
      const finish = (ok: boolean) => {
        if (done) return
        done = true
        try { sock.destroy() } catch { /* already closed */ }
        resolve(ok)
      }
      sock.once('connect', () => finish(true))
      sock.once('error', () => finish(false))
      sock.once('timeout', () => finish(false))
    })
  } catch {
    return false
  }
}

let starting = false

async function ensureBridge(): Promise<boolean> {
  if (await bridgeListening()) return true
  if (starting) return false
  starting = true
  try {
    const fs = await import('node:fs' as string)
    const { spawn } = await import('node:child_process' as string)
    try { fs.mkdirSync(SCRATCH, { recursive: true }) } catch { /* scratch exists */ }
    let logFd: number | undefined
    try { logFd = fs.openSync(SCRATCH + '\\voice-bridge.log', 'a') } catch { /* log best-effort */ }
    const env = {
      ...process.env,
      TMP: SCRATCH,
      TEMP: SCRATCH,
      HF_HOME: SCRATCH + '\\hf-home',
      PYTHONIOENCODING: 'utf-8',
    }
    const child = spawn(
      VENV_PY,
      ['-m', 'uvicorn', 'voice_bridge:app', '--host', '127.0.0.1', '--port', String(BRIDGE_PORT)],
      {
        cwd: BRIDGE_DIR,
        env,
        stdio: logFd !== undefined ? ['ignore', logFd, logFd] : 'ignore',
        detached: true,
        windowsHide: true,
      },
    )
    child.unref()
    const deadline = Date.now() + 25000
    while (Date.now() < deadline) {
      if (await bridgeListening()) return true
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    return false
  } catch (err) {
    console.error('[ui-voice] failed to spawn voice bridge:', err)
    return false
  } finally {
    starting = false
  }
}

/** Host plugin body — watchdogs the local voice bridge process. */
export function apply(ctx: Context): void {
  void ensureBridge()
  const timer = setInterval(() => {
    void ensureBridge()
  }, 15000)
  ;(ctx as unknown as { on(event: string, listener: () => void): unknown }).on('dispose', () => {
    clearInterval(timer)
  })
}
