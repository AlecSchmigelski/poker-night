// One place that talks to the device, so the rest of the app never branches on
// what platform it is running on.
//
// Each call has three tiers: a native plugin when the app is running inside a
// Capacitor shell, a web API when the browser supports it, and a no-op or a
// fallback when it does not. Plugins are read off the global at runtime rather
// than imported, so this file has no build-time dependency and works today.

const plugin = (name) => globalThis.Capacitor?.Plugins?.[name]

export const isNative = () => !!globalThis.Capacitor?.isNativePlatform?.()

// Safari does not implement navigator.vibrate — on iPhone and iPad the web
// build has never produced a single buzz, and silently. Native is the only
// place this becomes real.
export async function haptic(kind = 'tap') {
  const Haptics = plugin('Haptics')
  if (Haptics) {
    try {
      if (kind === 'alert') await Haptics.notification({ type: 'WARNING' })
      else await Haptics.impact({ style: 'Light' })
      return true
    } catch {
      return false
    }
  }
  if (typeof navigator.vibrate === 'function') {
    return navigator.vibrate(kind === 'alert' ? [90, 60, 90, 60, 180] : 8)
  }
  return false
}

export async function copyText(text) {
  const Clipboard = plugin('Clipboard')
  if (Clipboard) {
    try {
      await Clipboard.write({ string: text })
      return true
    } catch {
      return false
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Returns 'shared' | 'cancelled' | 'unsupported'.
export async function shareLink({ title, text, url }) {
  const Share = plugin('Share')
  if (Share) {
    try {
      await Share.share({ title, text, url })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  return 'unsupported'
}

export function canShareFiles() {
  if (plugin('Share')) return true
  return typeof navigator.canShare === 'function' && typeof navigator.share === 'function'
}

export async function shareFile(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  // Native file sharing needs the file written to disk first, which is a
  // Filesystem round trip. Left for the Capacitor wrap rather than faked here.
  return 'unsupported'
}
