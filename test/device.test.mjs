import { haptic, copyText, shareLink, canShareFiles, isNative } from '../src/lib/device.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

// Node 24 exposes navigator as a getter-only global, so it has to be redefined
// rather than assigned.
const setNavigator = (value) =>
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true })

const reset = () => {
  delete globalThis.Capacitor
  setNavigator({})
}

// --- tier 3: nothing available (Safari on iOS has no vibrate at all) ---
reset()
check('no native, no web: not native', isNative(), false)
check('haptic degrades to false rather than throwing', await haptic('tap'), false)
check('copy degrades to false', await copyText('x'), false)
check('share reports unsupported', await shareLink({ url: 'u' }), 'unsupported')
check('file sharing unavailable', canShareFiles(), false)

// --- tier 2: web APIs present ---
reset()
const vibrations = []
setNavigator({
  vibrate: (p) => { vibrations.push(p); return true },
  clipboard: { writeText: async () => {} },
  share: async () => {},
  canShare: () => true,
})
check('web vibrate is used', await haptic('tap'), true)
check('tap is a short buzz', vibrations[0], 8)
await haptic('alert')
check('alert is a pattern', vibrations[1], [90, 60, 90, 60, 180])
check('web clipboard is used', await copyText('x'), true)
check('web share is used', await shareLink({ url: 'u' }), 'shared')
check('file sharing available', canShareFiles(), true)

// A user dismissing the share sheet is a cancel, not a crash.
globalThis.navigator.share = async () => { throw new Error('AbortError') }
check('dismissed share reports cancelled', await shareLink({ url: 'u' }), 'cancelled')

// A browser that refuses the clipboard must not take the app down.
globalThis.navigator.clipboard = { writeText: async () => { throw new Error('denied') } }
check('refused clipboard returns false', await copyText('x'), false)

// --- tier 1: native plugins win over web APIs ---
reset()
const calls = []
setNavigator({
  vibrate: () => { calls.push('web-vibrate'); return true },
  clipboard: { writeText: async () => calls.push('web-clipboard') },
  share: async () => calls.push('web-share'),
  canShare: () => true,
})
globalThis.Capacitor = {
  isNativePlatform: () => true,
  Plugins: {
    Haptics: { impact: async () => calls.push('native-impact'), notification: async () => calls.push('native-notification') },
    Clipboard: { write: async () => calls.push('native-clipboard') },
    Share: { share: async () => calls.push('native-share') },
  },
}
check('detected as native', isNative(), true)
await haptic('tap')
await haptic('alert')
await copyText('x')
await shareLink({ url: 'u' })
check('every call takes the native path',
  calls, ['native-impact', 'native-notification', 'native-clipboard', 'native-share'])
check('no web API was touched', calls.some((c) => c.startsWith('web-')), false)

// A failing native plugin must not crash either.
globalThis.Capacitor.Plugins.Haptics = { impact: async () => { throw new Error('nope') } }
check('native failure returns false', await haptic('tap'), false)

reset()
console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
