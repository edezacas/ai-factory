# acme-app

Order and payment logic for the Acme shop, in TypeScript with Vitest.

## Commands

- `npm test` runs the suite.
- `npm run typecheck` checks the types.

## Conventions

- Money is an integer number of cents, never a float.
- Repositories return `undefined` for a missing record and never throw `NotFoundError`.
- Every public function in `src/` has a test in `test/` under the same path.
