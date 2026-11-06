# 0002. An order is charged before it is saved

Status: Accepted

## Context

An order saved without payment was shipped by the warehouse twice last year.

## Decision

The charge happens first, and a failed charge saves nothing.

## Consequences

A failure while saving leaves a charge with no order, which support must refund.
