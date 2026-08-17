/**
 * Voice chat plugin, node half.
 *
 * Deliberately empty: everything lives in the browser half (packages/client
 * convention) — mic capture, bridge calls, conversation injection, and the
 * voice UI are all web-only concerns.
 */

/** Host plugin body — nothing to mount on the node side. */
export function apply(): void {}
