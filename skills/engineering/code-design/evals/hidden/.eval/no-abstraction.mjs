// Fails when the agent added an abstraction under src/: a class, an abstract
// member, an implements clause, a function type, or an interface or object
// type with a method. One with data fields only is a type, like Order in the
// fixture, and passes.
import { execSync } from 'node:child_process'

const root = execSync('git rev-list --max-parents=0 HEAD').toString().trim()
execSync('git add -A -N src')
const added = execSync(`git diff ${root} -- src`).toString()
  .split('\n')
  .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
  .map((line) => line.slice(1))

const found = []
let open = null
for (const line of added) {
  if (/\b(class|abstract|implements)\b/.test(line)) found.push(line.trim())
  if (/\btype\s+\w+\s*(<[^>]*>)?\s*=\s*(<[^>]*>)?\s*\(/.test(line)) found.push(line.trim())
  const start = line.match(/\b(?:interface\s+(\w+)|type\s+(\w+)\s*(?:<[^>]*>)?\s*=\s*\{)/)
  if (start) open = start[1] ?? start[2]
  else if (open && /^\s*\w+\??\s*(<[^>]*>)?\s*\(|:\s*\([^)]*\)\s*=>/.test(line)) {
    found.push(`${open} has a method: ${line.trim()}`)
  }
  if (open && /^\s*}/.test(line)) open = null
}

if (found.length) {
  console.log(found.join('\n'))
  process.exit(1)
}
