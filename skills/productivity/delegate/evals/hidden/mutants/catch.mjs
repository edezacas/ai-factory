// Did the agent's tests catch a seeded error? Run from the workdir:
//   node mutants/catch.mjs '<sed expression>' [reference src dir] [file the sed applies to]
// The defaults are the order-management reference and src/orders/order-service.ts.
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

const [, , expression, reference = 'mutants/order-management/src', target = 'src/orders/order-service.ts'] = process.argv
cpSync(reference, 'src', { recursive: true })
const onReference = failing()
execFileSync('sed', ['-i', expression, target])
const onMutant = failing()
const caught = [...onMutant].filter((name) => !onReference.has(name))
console.log(`fail on reference: ${onReference.size}, fail on mutant: ${onMutant.size}, caught by: ${caught.join('; ') || 'none'}`)
process.exit(caught.length ? 0 : 1)
