# Changelog

## Unreleased

### Fixed

- `@tracekit/nest` sets response headers on both Express (`setHeader`) and
  Fastify (`header`) via `setResponseHeader()` in core.

### Added

- `@tracekit/sqs` for SQS send/receive trace propagation via message attributes.
- `@tracekit/sns` for SNS publish trace propagation.
- Core helpers: `setResponseHeader`, `injectTraceMessageAttributes`,
  `extractTraceCarrierFromMessageAttributes`.
- NestJS Fastify integration tests.
- Expanded root README (architecture, security, migration, performance, diagrams).
- `pnpm benchmark:compare` script for cls-rtracer comparison.

## 0.1.0

- Added the `@tracekit/core` package with safe context creation, async context
  propagation, incoming header validation, outgoing header injection, and queue
  context restoration.
- Added Express, Axios, fetch, Pino, Winston, BullMQ, NestJS, and Fastify
  adapters.
- Added runnable examples, architecture/security docs, benchmark tooling, and
  package-size reporting.
