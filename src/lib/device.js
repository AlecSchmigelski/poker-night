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

// One-time native setup, called at boot. Everything here is a no-op on the web.
//
// The accessory bar is the grey strip iOS parks above the keyboard with its
// prev/next arrows and a Done button. It has no web equivalent, so it never
// appeared in any browser test — and it sits on top of the dock, covering the
// primary action exactly when a text field is open. Every sheet in this app
// puts its confirm button in the dock, so the bar was hiding the button you
// reach for next. Nothing in it is useful here: there is one field per sheet,
// so there is nothing to step between, and dismissing is what the confirm
// button already does.
export async function setupNative() {
  const Keyboard = plugin('Keyboard')
  if (!Keyboard) return false
  try {
    await Keyboard.setAccessoryBarVisible({ isVisible: false })
    return true
  } catch {
    return false
  }
}

// ---------- scheduled alerts ----------
//
// The bomb pot timer fires a chime, a haptic and a wake lock, all of which need
// the app in front of you. The host puts the phone down, and a timer nobody
// hears is the same as no timer. A scheduled notification is handed to iOS, so
// it fires whether or not the app is running.
//
// Web has no equivalent worth having: a background page is throttled or frozen,
// so this is a no-op there rather than a promise the browser cannot keep.

const BOMB_POT_ID = 1

export async function canNotify() {
  const LN = plugin('LocalNotifications')
  if (!LN) return false
  try {
    const { display } = await LN.checkPermissions()
    if (display === 'granted') return true
    if (display === 'denied') return false
    const asked = await LN.requestPermissions()
    return asked.display === 'granted'
  } catch {
    return false
  }
}

// `at` is the absolute timestamp the timer is due, the same value the countdown
// is derived from, so the banner and the on-screen clock cannot disagree.
export async function scheduleBombPot(at, ante) {
  const LN = plugin('LocalNotifications')
  if (!LN) return false
  if (!(await canNotify())) return false
  try {
    await LN.cancel({ notifications: [{ id: BOMB_POT_ID }] })
    await LN.schedule({
      notifications: [
        {
          id: BOMB_POT_ID,
          title: 'Bomb pot',
          body: ante ? `Everyone antes ${ante}.` : 'Everyone antes.',
          schedule: { at: new Date(at), allowWhileIdle: true },
        },
      ],
    })
    return true
  } catch {
    return false
  }
}

export async function cancelBombPot() {
  const LN = plugin('LocalNotifications')
  if (!LN) return false
  try {
    await LN.cancel({ notifications: [{ id: BOMB_POT_ID }] })
    return true
  } catch {
    return false
  }
}

// ---------- live activity ----------
//
// The lock screen card. Two numbers the host wants without unlocking: what is
// on the table, and how long the night has run. The duration is NOT pushed from
// here — the activity is given a start date and iOS renders the clock itself,
// so it stays correct with the app closed and costs no updates.

export function canLiveActivity() {
  return !!plugin('LiveActivity')
}

export async function startLiveActivity(state) {
  const LA = plugin('LiveActivity')
  if (!LA) return false
  try {
    const { supported } = await LA.isSupported()
    if (!supported) return false
    const res = await LA.start(state)
    return !!res?.started
  } catch {
    return false
  }
}

export async function updateLiveActivity(state) {
  const LA = plugin('LiveActivity')
  if (!LA) return false
  try {
    await LA.update(state)
    return true
  } catch {
    return false
  }
}

export async function endLiveActivity() {
  const LA = plugin('LiveActivity')
  if (!LA) return false
  try {
    await LA.end()
    return true
  } catch {
    return false
  }
}
