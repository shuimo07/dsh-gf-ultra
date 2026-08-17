/**
 * SkinController: shared "skin changed" signal between the skin picker and the
 * companion window. The picker bumps the revision after switching the active
 * skin or uploading videos, so the window reloads its media immediately
 * instead of waiting for the 30 s poll.
 */

export class SkinController {
  private listeners = new Set<() => void>()
  private revision = 0

  /** Monotonic revision, incremented on every skin/media change. */
  get rev(): number {
    return this.revision
  }

  /** Notify subscribers that the active skin or its media changed. */
  bump(): void {
    this.revision += 1
    for (const listener of this.listeners) listener()
  }

  /** Subscribe to skin changes; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
