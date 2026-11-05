# Delivery date

## Goal

Read the delivery dates carriers send us, always day first.

## Out of scope

- Other date formats.

## Decisions

### Dates are day first

- **Why:** Every carrier we work with sends them that way.
- **Rejected:** Detecting the format: `05/11/2026` is ambiguous.

## Acceptance criteria

### Day first

- **Given** the text `05/11/2026`
- **When** it is parsed
- **Then** the result is year 2026, month 11, day 5

### Not a date

- **Given** the text `31/02/2026`
- **When** it is parsed
- **Then** it fails with an error
