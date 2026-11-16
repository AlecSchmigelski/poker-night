// App Store Connect silently truncates or rejects over-length fields, and the
// limits are not all obvious. Check them here rather than in the web form.
import { readFileSync } from 'node:fs'

const LIMITS = {
  'Name': 30,
  'Subtitle': 30,
  'Promotional text': 170,
  'Keywords': 100,
  'Description': 4000,
  "What's New": 4000,
}

const text = readFileSync(new URL('../store-listing.md', import.meta.url), 'utf8')
let fail = 0

for (const [field, max] of Object.entries(LIMITS)) {
  const re = new RegExp(`^## ${field.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |(?![\\s\\S]))`, 'm')
  const m = text.match(re)
  if (!m) { console.log(`FAIL  ${field}: section not found`); fail++; continue }
  const body = m[1].trim()
  const n = [...body].length
  const ok = n <= max
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${field.padEnd(18)} ${String(n).padStart(4)} / ${max}`)
}

// Keywords have their own rules: commas separate, spaces after them waste
// characters, and duplicates are ignored by Apple.
const kw = text.match(/^## Keywords[^\n]*\n([\s\S]*?)(?=\n## |(?![\s\S]))/m)?.[1].trim() ?? ''
if (kw.includes(', ')) { console.log('FAIL  keywords contain ", " — wastes characters'); fail++ }
else console.log('PASS  keywords have no wasted spaces')
const list = kw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
const dupes = list.filter((k, i) => list.indexOf(k) !== i)
if (dupes.length) { console.log(`FAIL  duplicate keywords: ${dupes}`); fail++ }
else console.log(`PASS  ${list.length} distinct keywords`)

console.log(fail ? `\n${fail} failed` : '\nAll within limits')
process.exit(fail ? 1 : 0)
