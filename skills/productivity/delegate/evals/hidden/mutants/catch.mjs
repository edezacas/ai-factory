// Did the agent's tests catch a seeded error? Run from the workdir:
//   node mutants/catch.mjs '<sed expression applied to src/orders/order-service.ts>'
// Caught means some agent test that passes on the reference fails on the mutant, so a
// test of a rule the notes left open, which the reference may not follow, decides nothing.
import { execFileSync } from 'node:child_process'
import { cpSync, readFileSync, rmSync } from 'node:fs'

const failing = () => {
  const out = 'mutants/.vitest.json'
  try {
    execFileSync('npx', ['vitest', 'run', '--exclude', 'test/hidden/**', '--reporter=json', `--outputFile=${out}`], {
      stdio: 'ignore',
    })
  } catch {}
  const { testResults } = JSON.parse(readFileSync(out, 'utf8'))
  rmSync(out)
  const names = new Set()
  for (const file of testResults) {
    // A file that fails to load has no assertions: count the file itself.
    if (!file.assertionResults.length && file.status === 'failed') names.add(file.name)
    for (const t of file.assertionResults) if (t.status === 'failed') names.add(`${file.name} > ${t.fullName}`)
  }
  return names
}

cpSync('mutants/order-management/src', 'src', { recursive: true })
const onReference = failing()
execFileSync('sed', ['-i', process.argv[2], 'src/orders/order-service.ts'])
const onMutant = failing()
const caught = [...onMutant].filter((name) => !onReference.has(name))
console.log(`fail on reference: ${onReference.size}, fail on mutant: ${onMutant.size}, caught by: ${caught.join('; ') || 'none'}`)
process.exit(caught.length ? 0 : 1)
