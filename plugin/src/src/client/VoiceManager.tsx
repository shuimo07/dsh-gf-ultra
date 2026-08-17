/**
 * VoiceManager: composer tool-row seat that opens the companion voice manager.
 *
 * Lists every voice (name + reference text), switches the active voice with
 * one click, and uploads a new reference clip (audio + its verbatim text) to
 * create or update a voice. Switching takes effect on the next TTS synthesis
 * (the bridge reloads its TTS handler with the new reference audio).
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls ui-conversation's SlotMap merge for PropsRuntime resolution.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { bridgeBase } from './bridge.ts'
import type { VoiceInjected } from './contract.ts'
import css from './VoiceManager.module.css'

/** One voice entry as served by GET /api/voices. */
interface VoiceEntry {
  name: string
  ref_text: string
}

interface VoicesResponse {
  voices: VoiceEntry[]
  active: string | null
}

/** Full props: framework runtime share + `voice` locale seat + injected face. */
export type VoiceManagerProps =
  PropsRuntime<'conversation.input.left'> & PropsLocale<'voice'> & VoiceInjected

/** Waveform glyph (inline, follows currentColor). */
function WaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12h2" />
      <path d="M6 8v8" />
      <path d="M10 5v14" />
      <path d="M14 9v6" />
      <path d="M18 3v18" />
      <path d="M22 12h0" />
    </svg>
  )
}

/**
 * @param props - framework runtime + locale + injected face.
 */
export const VoiceManager = memo(function VoiceManager({ t }: VoiceManagerProps) {
  const [open, setOpen] = useState(false)
  const [voices, setVoices] = useState<VoiceEntry[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newName, setNewName] = useState('')
  const [newText, setNewText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const reload = useCallback(async () => {
    try {
      const data = await fetch(`${bridgeBase()}/api/voices`).then((r) => r.json() as Promise<VoicesResponse>)
      setVoices(data.voices ?? [])
      setActive(data.active ?? null)
    } catch {
      // bridge unreachable — leave the current list as-is
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const switchVoice = useCallback(
    async (name: string) => {
      if (name === active) return
      try {
        const data = await fetch(`${bridgeBase()}/api/voices/active`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice: name }),
        }).then((r) => r.json() as Promise<VoicesResponse>)
        setVoices(data.voices ?? voices)
        setActive(data.active ?? name)
      } catch {
        // ignore — the next poll/refresh will reconcile
      }
    },
    [active, voices],
  )

  const renameVoice = useCallback(
    async (name: string) => {
      const next = window.prompt(t('voice.renamePrompt'), name)
      if (next === null || next.trim() === '' || next.trim() === name) return
      try {
        const data = await fetch(`${bridgeBase()}/api/voices/rename`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ old: name, new: next.trim() }),
        }).then((r) => r.json() as Promise<VoicesResponse>)
        setVoices(data.voices ?? voices)
        setActive(data.active ?? active)
      } catch (err) {
        console.error('[ui-voice] rename voice failed:', err)
      }
    },
    [voices, active],
  )

  const onUpload = useCallback(async () => {
    if (selectedFile === null) return
    const name = newName.trim()
    const text = newText.trim()
    if (name === '' || text === '') return
    setBusy(true)
    try {
      const body = new FormData()
      body.append('file', selectedFile)
      const res = await fetch(
        `${bridgeBase()}/api/voices/upload?voice=${encodeURIComponent(name)}&text=${encodeURIComponent(text)}`,
        { method: 'POST', body },
      )
      if (!res.ok) {
        const detail = await res.json().catch(() => ({ detail: String(res.status) }))
        console.error('[ui-voice] voice upload failed:', detail)
        return
      }
      setNewName('')
      setNewText('')
      setSelectedFile(null)
      if (fileRef.current !== null) fileRef.current.value = ''
      await reload()
    } catch (err) {
      console.error('[ui-voice] voice upload failed:', err)
    } finally {
      setBusy(false)
    }
  }, [selectedFile, newName, newText, reload])

  return (
    <>
      <button
        type="button"
        className={open ? css.pickerOn : css.pickerOff}
        title={t('voice.openHint')}
        aria-label={t('voice.openHint')}
        aria-pressed={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((previous) => !previous)}
      >
        <WaveIcon />
      </button>
      {open && (
        <div className={css.overlay} role="dialog" aria-label={t('voice.title')}>
          <div className={css.panel}>
            <div className={css.header}>
              <span className={css.title}>{t('voice.title')}</span>
              <button type="button" className={css.close} aria-label={t('voice.close')} onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            {voices.length === 0 && <div className={css.empty}>{t('voice.empty')}</div>}

            <ul className={css.voiceList}>
              {voices.map((entry) => {
                const isActive = entry.name === active
                return (
                  <li key={entry.name} className={isActive ? `${css.voiceRow} ${css.active}` : css.voiceRow}>
                    <div className={css.voiceInfo}>
                      <span className={css.voiceName}>{entry.name}</span>
                      {entry.ref_text !== '' && <span className={css.voiceText}>{entry.ref_text.slice(0, 60)}{entry.ref_text.length > 60 ? '…' : ''}</span>}
                    </div>
                    {isActive ? (
                      <span className={css.activeBadge}>{t('voice.active')}</span>
                    ) : (
                      <button type="button" className={css.useBtn} onClick={() => void switchVoice(entry.name)}>
                        {t('voice.switch')}
                      </button>
                    )}
                    <button
                      type="button"
                      className={css.renameBtn}
                      title={t('voice.rename')}
                      aria-label={t('voice.rename')}
                      onClick={() => void renameVoice(entry.name)}
                    >
                      ✏️
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className={css.uploadSection}>
              <div className={css.uploadTitle}>{t('voice.uploadTitle')}</div>
              <input
                className={css.input}
                type="text"
                placeholder={t('voice.namePlaceholder')}
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
              <textarea
                className={css.textarea}
                placeholder={t('voice.textPlaceholder')}
                value={newText}
                onChange={(event) => setNewText(event.target.value)}
                rows={2}
              />
              <div className={css.uploadRow}>
                <button
                  type="button"
                  className={css.uploadBtn}
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {selectedFile !== null ? `${t('voice.fileChosen')}: ${selectedFile.name}` : t('voice.chooseFile')}
                </button>
                <button
                  type="button"
                  className={css.submitBtn}
                  disabled={busy || selectedFile === null || newName.trim() === '' || newText.trim() === ''}
                  onClick={() => void onUpload()}
                >
                  {busy ? t('voice.uploading') : t('voice.upload')}
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="audio/wav,audio/mpeg,audio/flac,audio/ogg,audio/mp4,audio/x-m4a,audio/webm"
                hidden
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              <div className={css.hint}>{t('voice.hint')}</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
})
