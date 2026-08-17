/**
 * LiveTalkingClient: WebRTC bridge to the local LiveTalking lip-sync engine
 * (http://127.0.0.1:8010 by default, overridable via localStorage
 * `s2s.voice.livetalking`).
 *
 * connect() exchanges SDP to create a session and exposes the rendered
 * digital-human stream; speak(wav) uploads one reply clip whose audio drives
 * the mouth. When connected, the companion window renders the live video
 * instead of the pre-recorded skins.
 */
export class LiveTalkingClient {
  private pc: RTCPeerConnection | null = null
  private stream: MediaStream | null = null
  private sessionId = ''
  private _connected = false
  private listeners = new Set<() => void>()
  private pendingWav: ArrayBuffer[] = []

  /** True once the WebRTC session is established. */
  get connected(): boolean {
    return this._connected
  }

  /** The rendered digital-human media stream (video + audio tracks). */
  get videoStream(): MediaStream | null {
    return this.stream
  }

  base(): string {
    try {
      return localStorage.getItem('s2s.voice.livetalking')?.trim() || 'http://127.0.0.1:8010'
    } catch {
      return 'http://127.0.0.1:8010'
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }

  /** Establish the WebRTC session (best-effort; skins remain the fallback). */
  async connect(): Promise<void> {
    if (this.pc !== null) return
    const pc = new RTCPeerConnection()
    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })
    const stream = new MediaStream()
    pc.addEventListener('track', (evt) => {
      stream.addTrack(evt.track)
    })
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') resolve()
        else pc.addEventListener('icegatheringstatechange', () => {
          if (pc.iceGatheringState === 'complete') resolve()
        })
      })
      const local = pc.localDescription
      if (local === null) throw new Error('no local description')
      const resp = await fetch(`${this.base()}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: local.sdp, type: local.type }),
      })
      if (!resp.ok) throw new Error(`offer failed: ${resp.status}`)
      const answer = (await resp.json()) as { sdp: string; type: RTCSdpType; sessionid?: string }
      await pc.setRemoteDescription(answer)
      this.sessionId = answer.sessionid ?? ''
      this.pc = pc
      this.stream = stream
      this._connected = true
      for (const wav of this.pendingWav.splice(0)) void this.speak(wav)
      this.emit()
    } catch (err) {
      console.warn('[ui-voice] LiveTalking connect failed (falling back to skins):', err)
      this.pc = null
      this.stream = null
      this._connected = false
      try { pc.close() } catch { /* already closed */ }
    }
  }

  /** Drive the digital human's mouth with one reply clip (16k mono PCM16 WAV). */
  async speak(wav: ArrayBuffer): Promise<void> {
    if (!this._connected || this.sessionId === '') {
      // Not ready yet — remember the clip for when the session appears.
      if (this.pendingWav.length < 8) this.pendingWav.push(wav)
      return
    }
    try {
      const body = new FormData()
      body.append('file', new Blob([wav], { type: 'audio/wav' }), 'reply.wav')
      await fetch(`${this.base()}/humanaudio?sessionid=${encodeURIComponent(this.sessionId)}`, {
        method: 'POST',
        body,
      })
    } catch (err) {
      console.warn('[ui-voice] LiveTalking speak failed:', err)
    }
  }

  /** Tear down the session (plugin teardown). */
  dispose(): void {
    this.pendingWav = []
    this._connected = false
    this.stream = null
    const pc = this.pc
    this.pc = null
    if (pc !== null) {
      try { pc.close() } catch { /* already closed */ }
    }
    this.listeners.clear()
  }
}
