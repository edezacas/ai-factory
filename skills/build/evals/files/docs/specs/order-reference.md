# Order reference

## Goal

Give every order a reference that customers can read out to support.

## Out of scope

- Storing the reference or generating the sequence.

## Decisions

### The sequence is padded to six digits and is never truncated

- **Why:** Support reads references over the phone and a fixed width helps, but two orders must never share one.
- **Rejected:** Truncating to six digits: it would produce duplicates.

## Acceptance criteria

### Padded sequence

- **Given** the year 2026 and the sequence 42
- **When** the reference is formatted
- **Then** the result is `ACME-2026-000042`

### Long sequence

- **Given** the year 2026 and the sequence 1234567
- **When** the reference is formatted
- **Then** the result is `ACME-2026-1234567`

### Invalid sequence

- **Given** the year 2026 and the sequence 0
- **When** the reference is formatted
- **Then** it fails with an error, because a sequence below 1 is invalid
