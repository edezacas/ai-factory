# 01: Parse the delivery date

## Goal

Parse a carrier's day-first date into year, month and day.

## Criteria

- **Given** the text `05/11/2026`, **when** it is parsed, **then** the result is year 2026, month 11, day 5.
- **Given** the text `31/02/2026`, **when** it is parsed, **then** it fails with an error.

## Seam

`parseDeliveryDate(text: string): { year: number; month: number; day: number }`, exported from `src/delivery-date.ts`.

## Context

- Spec: docs/specs/delivery-date.md

## Constraints

- No code exists yet for this task: the earlier attempts were discarded.

## Decisions

## State

- **Status:** in progress
- **Verified:** nothing
- **Not verified:** nothing

## Next step

Write the test for the day-first criterion again, and try an approach not listed below.

## Dead ends

- `Date.parse` and `new Date` on the raw text: they read `05/11/2026` as May 11.
- Adding the `date-fns` package: dependency additions are rejected by the CI policy of this repo.
