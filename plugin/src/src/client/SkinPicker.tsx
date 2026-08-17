/**
 * SkinPicker: composer tool-row seat that opens the companion skin manager.
 *
 * The panel lists every skin (with its idle/talking clip counts), switches the
 * active skin with one click, and uploads new videos into the active skin's
 * bg (idle) or talk (speaking) folders. It renders as a fixed overlay from the
 * toolbar seat, exactly like the CompanionWindow does from its own seat.
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls ui-conversation's SlotMap merge for PropsRuntime resolution.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { bridgeBase } from './bridge.ts'
import type { VoiceInjected } from './contract.ts'
import css from './SkinPicker.module.css'

/** One skin entry as served by GET /api/skins. */
interface SkinEntry {
  name: string
  bg: string[]
  talk: string[]
}

interface SkinsResponse {
  skins: SkinEntry[]
  active: string | null
}

/** Full props: framework runtime share + `voice` locale seat + injected face. */
export type SkinPickerProps =
  PropsRuntime<'conversation.input.left'> & PropsLocale<'voice'> & VoiceInjected

/** Palette glyph (inline, follows currentColor). */
function PaletteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.8 3-3.5 3H16a2.5 2.5 0 0 0-2 4c.6.8.5 2-2 3Z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * @param props - framework runtime + locale + injected skinController.
 */
export const SkinPicker = memo(function SkinPicker({ t, skinController }: SkinPickerProps) {
  const [open, setOpen] = useState(false)
  const [skins, setSkins] = useState<SkinEntry[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [newSkinName, setNewSkinName] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const pendingSlotRef = useRef<'bg' | 'talk'>('bg')

  const reload = useCallback(async () => {
    try {
      const data = await fetch(`${bridgeBase()}/api/skins`).then((r) => r.json() as Promise<SkinsResponse>)
      setSkins(data.skins ?? [])
      setActive(data.active ?? null)
    } catch {
      // bridge unreachable — leave the current list as-is
    }
  }, [])

  // Refresh on open and while the panel is visible, so skins created or media
  // uploaded elsewhere show up without a page reload.
  useEffect(() => {
    if (!open) return
    void reload()
    const timer = window.setInterval(reload, 15000)
    return () => window.clearInterval(timer)
  }, [open, reload])

  useEffect(() => {
    void reload()
  }, [reload])

  const switchSkin = useCallback(
    async (name: string) => {
      if (name === active) return
      try {
        const data = await fetch(`${bridgeBase()}/api/skins/active`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skin: name }),
        }).then((r) => r.json() as Promise<SkinsResponse>)
        setSkins(data.skins ?? skins)
        setActive(data.active ?? name)
        skinController.bump()
      } catch {
        // ignore — the next poll/refresh will reconcile
      }
    },
    [active, skins, skinController],
  )

  const createSkin = useCallback(async () => {
    const name = newSkinName.trim()
    if (name === '') return
    try {
      const data = await fetch(`${bridgeBase()}/api/skins/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then((r) => r.json() as Promise<SkinsResponse>)
      setSkins(data.skins ?? skins)
      setNewSkinName('')
      // Switch straight to the fresh skin so uploads land in it.
      await switchSkin(name)
    } catch (err) {
      console.error('[ui-voice] create skin failed:', err)
    }
  }, [newSkinName, skins, switchSkin])

  const renameSkin = useCallback(
    async (name: string) => {
      const next = window.prompt(t('skin.renamePrompt'), name)
      if (next === null || next.trim() === '' || next.trim() === name) return
      try {
        const data = await fetch(`${bridgeBase()}/api/skins/rename`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ old: name, new: next.trim() }),
        }).then((r) => r.json() as Promise<SkinsResponse>)
        setSkins(data.skins ?? skins)
        setActive(data.active ?? active)
        skinController.bump()
      } catch (err) {
        console.error('[ui-voice] rename skin failed:', err)
      }
    },
    [skins, active, skinController],
  )

  const pickFile = useCallback((slot: 'bg' | 'talk') => {
    pendingSlotRef.current = slot
    fileRef.current?.click()
  }, [])

  const onFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file === undefined || active === null) return
      const slot = pendingSlotRef.current
      setUploading(true)
      try {
        const body = new FormData()
        body.append('file', file)
        await fetch(`${bridgeBase()}/api/skins/upload?skin=${encodeURIComponent(active)}&slot=${slot}`, {
          method: 'POST',
          body,
        })
        await reload()
        skinController.bump()
      } catch {
        // ignore
      } finally {
        setUploading(false)
      }
    },
    [active, reload, skinController],
  )

  return (
    <>
      <button
        type="button"
        className={open ? css.pickerOn : css.pickerOff}
        title={t('skin.openHint')}
        aria-label={t('skin.openHint')}
        aria-pressed={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((previous) => !previous)}
      >
        <PaletteIcon />
      </button>
      {open && (
        <div className={css.overlay} role="dialog" aria-label={t('skin.title')}>
          <div className={css.panel}>
            <div className={css.header}>
              <span className={css.title}>{t('skin.title')}</span>
              <button type="button" className={css.close} aria-label={t('skin.close')} onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            {skins.length === 0 && <div className={css.empty}>{t('skin.empty')}</div>}

            <ul className={css.skinList}>
              {skins.map((entry) => {
                const isActive = entry.name === active
                return (
                  <li key={entry.name} className={isActive ? `${css.skinRow} ${css.active}` : css.skinRow}>
                    <div className={css.skinInfo}>
                      <span className={css.skinName}>{entry.name}</span>
                      <span className={css.skinCounts}>
                        {entry.bg.length} {t('skin.idle')} · {entry.talk.length} {t('skin.talk')}
                      </span>
                    </div>
                    {isActive ? (
                      <span className={css.activeBadge}>{t('skin.active')}</span>
                    ) : (
                      <button type="button" className={css.useBtn} onClick={() => void switchSkin(entry.name)}>
                        {t('skin.switch')}
                      </button>
                    )}
                    <button
                      type="button"
                      className={css.renameBtn}
                      title={t('skin.rename')}
                      aria-label={t('skin.rename')}
                      onClick={() => void renameSkin(entry.name)}
                    >
                      ✏️
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className={css.createRow}>
              <input
                className={css.input}
                type="text"
                placeholder={t('skin.createPlaceholder')}
                value={newSkinName}
                onChange={(event) => setNewSkinName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void createSkin()
                }}
              />
              <button
                type="button"
                className={css.uploadBtn}
                disabled={newSkinName.trim() === ''}
                onClick={() => void createSkin()}
              >
                {t('skin.create')}
              </button>
            </div>

            {active !== null && (
              <div className={css.uploadRow}>
                <span className={css.uploadLabel}>{t('skin.uploadTo')}：{active}</span>
                <button type="button" className={css.uploadBtn} disabled={uploading} onClick={() => pickFile('bg')}>
                  {uploading ? t('skin.uploading') : t('skin.uploadBg')}
                </button>
                <button type="button" className={css.uploadBtn} disabled={uploading} onClick={() => pickFile('talk')}>
                  {uploading ? t('skin.uploading') : t('skin.uploadTalk')}
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => void onFile(e)} />
          </div>
        </div>
      )}
    </>
  )
})
