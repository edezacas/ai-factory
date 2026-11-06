# 0001. Prices are stored in integer cents

Status: Accepted

## Context

Floating point totals drifted by a cent on large invoices.

## Decision

Every amount is stored as an integer number of cents.

## Consequences

A currency with other subdivisions would need a change everywhere.
