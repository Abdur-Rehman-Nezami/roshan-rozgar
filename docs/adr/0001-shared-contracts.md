# Shared contracts and foundation verification

The shared package exports Zod 3.25.75 schemas and inferred types for the plan's data entities, API operations, six socket events, seventeen AI routes, twenty-eight screen IDs, prompt text and common commands. The installed Anthropic SDK's Zod support still needs verification during live integration; no provider SDK has been installed here.

API entity fields use camelCase and ISO timestamps/time-range objects. SQL keeps the plan's snake_case columns and `tstzrange`; server serializers must map explicitly. Triage/AI route fields retain the plan's documented names such as `trade_slug` and `citedDocIds`.

Public workers and incoming-request cards are separate strict schemas. They reject phone/address fields. Later backend serializers must select those public fields explicitly, enforce role/participant access, and return private contact/address details only after confirmation. Schemas alone do not authorize a request or implement that disclosure policy.

`POST /api/bookings` accepts only `threadId`. Unlike the illustrative §7 payload, a client-supplied agreement is rejected. The backend will reconstruct price/time/area from persisted thread state rather than trusting a client-edited agreement card. AI's agreement output likewise has no numeric price field. This implements the existing requirement that code/database state own prices and bookings.

User chat input excludes system/agreement messages and sender IDs. Arrival/status commands require relevant fields but do not establish legal transitions; the booking service must still enforce §6.2 in a transaction. Prompt actions are checked against a trusted registered screen; consequential actions still need the later executor's explicit-confirm step.

Triage validation checks trade/task consistency and references against the actual retrieved context. It cannot establish the truth of an arbitrary client-supplied triage result; request creation must revalidate against server-owned context.

Foundation tests currently use Node 24's built-in test runner, requiring no unavailable test packages. In this sandbox `--test-isolation=none` exposes individual test assertions without child-process restrictions. The planned Vitest/Playwright application checks remain future work. Cached-package checks do not replace a normal install and lockfile verification.
