// Loads the REAL extension engine (extension/redact.js) and runs the corpus.
// Rules + heuristic sniffer only (the NER model is tested in-browser).
import { readFileSync } from 'node:fs'
const code = readFileSync(new URL('../extension/redact.js', import.meta.url), 'utf8')
const win = {}
new Function('window', code)(win)
const { redact, sniffProspects } = win.AirlockEngine

// [text, terms, expect, mode]  mode: 'lock' (rules) | 'name' (sniffer)
// expect {} in lock mode = must lock NOTHING (false-positive guard)
const CASES = [
  ['call 555-123-4567', [], { PHONE: 1 }, 'lock'],
  ['UK +44 20 7946 0958', [], { PHONE: 1 }, 'lock'],
  ['India +91 98765 43210', [], { PHONE: 1 }, 'lock'],
  ['ext 555-123-4567 x89', [], { PHONE: 1 }, 'lock'],
  ['call 555-1234 today', [], { PHONE: 1 }, 'lock'],
  ['range 100-2000 units', [], {}, 'lock'],
  ['version 1.2.3 shipped', [], {}, 'lock'],
  ['SSN 123-45-6789', [], { SSN: 1 }, 'lock'],
  ['ssn 123 45 6789', [], { SSN: 1 }, 'lock'],
  ['social security 123456789', [], { SSN: 1 }, 'lock'],
  ['order 123456789 shipped', [], {}, 'lock'],
  ['card 4111 1111 1111 1111', [], { CARD: 1 }, 'lock'],
  ['amex 3782 822463 10005', [], { CARD: 1 }, 'lock'],
  ['key sk-ant-api03-AbCdEf01234567890XyZ', [], { SECRET: 1 }, 'lock'],
  ['token ghp_AbCdEfGhIjKlMnOpQrStUvWxYz0123', [], { SECRET: 1 }, 'lock'],
  ['pat github_pat_11ABCDEFG0aBcDeFgHiJ_kLmNoPqRsTuVwXyZ0123456789abcd', [], { SECRET: 1 }, 'lock'],
  ['jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc123DEF456ghi', [], { SECRET: 1 }, 'lock'],
  ['hf hf_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789', [], { SECRET: 1 }, 'lock'],
  ['mail JOHN@ACME.COM', [], { EMAIL: 1 }, 'lock'],
  ['met John Smith today', [], { NAME: 1 }, 'name'],
  ['met john smith today', [], { NAME: 1 }, 'name'],
  ['JOHN SMITH called', [], { NAME: 1 }, 'name'],
  ['from priya raj', [], { NAME: 1 }, 'name'],
  ['priya raj at acme health systems', [], { NAME: 1 }, 'name'], // guard: name found, no greedy ORG
  ['mark the calendar please', [], {}, 'name'],
  ['will you join us', [], {}, 'name'],
  ['a grace period applies', [], {}, 'name'],                // FP guard: trailing-noun stopword
  ['at Acme Health Systems', [], { ORG: 1 }, 'name'],
]

let pass = 0, fail = 0
for (const [text, terms, expect, mode] of CASES) {
  const { spans } = redact(text, terms)
  let found = {}
  if (mode === 'lock') for (const s of spans) found[s.type] = (found[s.type] || 0) + 1
  else { const pros = sniffProspects(text, spans); for (const s of pros) found[s.type] = (found[s.type] || 0) + 1 }
  let ok
  if (Object.keys(expect).length === 0) ok = (mode === 'lock' ? spans.length === 0 : Object.keys(found).length === 0)
  else ok = Object.keys(expect).every((t) => (found[t] || 0) >= expect[t])
  console.log(`${ok ? 'PASS' : 'FAIL'} [${mode}] ${JSON.stringify(text).slice(0, 42).padEnd(44)} want ${JSON.stringify(expect).padEnd(13)} got ${JSON.stringify(found)}`)
  ok ? pass++ : fail++
}
console.log(`\n${pass}/${pass + fail} passing`)
