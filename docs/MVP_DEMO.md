# Run the MVP demo

## Fastest: no installation

Open `roshan-rozgar-demo.html` in a desktop browser. It contains the app and styles in one file. Choose English, Urdu or Roman Urdu in the header. Click **I need a worker** under **Try the demo now**.

This is an explicitly labelled **browser simulation**, saved on the current device. It works without PostgreSQL, Redis or AI credentials. It is not evidence of production/database race correctness. Do not use real customer data.

1. Create a leaking-tap request, choose G-9, and enter a sample address.
2. Send the request to **DEMO Ali**.
3. Use **I want work** in the orange demo bar. Accept the request before its 60-second timer ends.
4. In the thread, send a message and propose a price.
5. Switch to **I need a worker**, open the thread, and explicitly accept the price. Hold the booking.
6. Confirm as customer; switch to worker and confirm again. Only then does the worker see the full address.
7. Worker: mark on the way. Customer: read the DEMO arrival code. Worker: enter that code, start the job, and submit the final amount.
8. Customer: confirm work completed and the **DEMO cash payment**. No money is charged.
9. Post a star rating, review and tags. Switch to the worker to see the updated rating and completed-job count.

The **Choose DEMO worker** selector opens the seeded worker for any of the eight task categories. **Reset demo** clears the browser simulation. Two tabs opened from the same HTML file share demo data, with a separate signed-in role in each tab; single-tab role switching is also supported. Cross-device sharing requires the server mode below.

If opening local files is restricted in your browser, run the frontend with `pnpm dev:web` and choose **Try the demo now**.

## Rebuild the single-file demo

```bash
pnpm install
pnpm demo:export
```

## Server mode with PostgreSQL and Redis

```bash
pnpm install
pnpm setup:env
docker compose -f infra/docker-compose.dev.yml up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:5173. Use the regular **Start** flow, or leave browser demo with **Use server mode** before signing in. Use two browser profiles/private windows for independent worker/customer cookies.

Seeded server worker numbers: `03000000001` (Ali: plumbing/electrical), `03000000002` (Sara: carpentry/painting/masonry), `03000000003` (Imran: AC/mechanic/general). Codes are shown as DEMO; no SMS is sent. Choose another Pakistani mobile number for a customer or new worker profile. Browser simulation seeds eight workers, one for each task, and does not use the server's database.

## What is intentionally simplified

The MVP uses compact screens, manual task selection, seeded rate cards, text chat, and three-second polling. AI calls, voice recording/translation, photo uploads, emergency dispatch, advanced RAG, queue fan-out, maps and deployment are deferred. Fixed microphone/audio controls remain visibly unavailable. Cash and arrival-code checks are DEMO features. Browser review text is published as entered; no AI summary is fabricated.

## Verification and limits

77 native tests PASS, including a simulated request→offer→price→hold→both confirmations→arrival→completion→review flow, privacy guards, expiration and busy-worker rejection. Workspace builds PASS with cached tools. The exported HTML is self-contained and its JavaScript passes syntax validation. Browser visual checks and real PostgreSQL/Redis acceptance could not run in this environment. A normal dependency installation/lockfile is still pending. No original build-plan phase is marked complete.

Push commands and account-switch recovery: [PUSH.md](PUSH.md). Current continuation: [../HANDOFF.md](../HANDOFF.md).
