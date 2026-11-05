# 01: Format the order reference

## Goal

Format an order reference from a year and a sequence.

## Criteria

- **Given** the year 2026 and the sequence 42, **when** the reference is formatted, **then** the result is `ACME-2026-000042`.
- **Given** the year 2026 and the sequence 1234567, **when** the reference is formatted, **then** the result is `ACME-2026-1234567`.

## Seam

`formatOrderReference(year: number, sequence: number): string`, exported from `src/order-reference.ts`.

## Context

- Spec: docs/specs/order-reference.md

## Constraints

- No new dependencies.

## Decisions

## State

- **Status:** todo
- **Verified:** nothing yet
- **Not verified:** nothing yet

## Next step

Write the test for the padded sequence.

## Dead ends
