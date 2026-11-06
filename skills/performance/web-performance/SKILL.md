---
name: web-performance
description: Improve the speed of a web app by measuring before and after every optimization. Use when an app feels slow or when asked to optimize performance, reduce bundle size, fix unnecessary renders, speed up requests or queries, or improve Core Web Vitals.
metadata:
  author: edezacas
  version: "0.1"
---

# Web Performance

Measure first, change one thing, measure again.

## Principles

- Define the route or flow, the target metric and the budget before the baseline; if there is no budget, the noise threshold is the stop condition.
- Take a baseline before changing anything. If the target metric cannot be measured, measure a close proxy and say so.
- Measure with 1 discarded warm-up run plus 3 measured runs and keep the median. Choose the device profile based on who uses the app (real analytics if available).
- Make one optimization at a time and re-measure under the same conditions (build, device, throttling, cache state, data). Keep the change only if the improvement is clear, meaning larger than the greater of 5% and the observed run-to-run variance; otherwise revert it.
- Work on what the measurements show is slow, starting with the biggest bottleneck. Do not apply optimizations "just in case".
- Do not break behavior. Run the project's tests and lint after each change, plus e2e tests when the change touches lazy loading, caching or routes.
- Stop when that budget is met or when the next candidate would gain less than the noise threshold. List what is pending in the report.
- Do not run load tests against production or shared environments without explicit approval.

## Where to look

1. **Unnecessary renders:** find components that re-render without a visible change.
2. **Bundle size:** reduce what is loaded up front, for example with lazy loading.
3. **Requests and caching:** remove redundant or slow requests, and cache what can be cached safely.
4. **Slow queries and N+1:** find slow queries and repeated queries per row. A sign of N+1 is a query count that grows with the number of rows returned (1 query for the list plus 1 per item); it can often be reduced to a constant number of queries, for example with a JOIN or a WHERE IN. Compare the query count with a small and a large list.
5. **Images, fonts and scripts:** optimize what the page loads and when.

Start with the area the measurements point to. Adapt to the project's stack: read its dependency manifests and the installed version's documentation before recommending an API, and use its own tools.

## Tools

Use what is available:

- Chrome DevTools MCP to measure performance (traces, network, Core Web Vitals).
- Playwright MCP to exercise real user flows.
- Sentry (or other APM/RUM) to find slow transactions and issues in production.

If none is available, use alternatives such as Lighthouse or the project's own profiling tools, and say which one was used.

## Result

Report each change with its metric before and after, and whether it was kept or reverted. Keep production and local numbers in separate rows. List what remains unmeasured or pending.
