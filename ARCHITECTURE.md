# Architecture

## High level
- Multi-bot Telegram runner built on `grammy` with shared infra (Redis, PostgreSQL via Prisma, optional SOCKS proxy).
- MatchFound bot ships with an Express HTTP API for web/OAuth use; other bots are self-contained Telegram flows.
- Services are orchestrated from `src/index.ts`, which wires logging, connections, and controlled restarts.

## Boot sequence (`src/index.ts`)
1. Load environment via `dotenv`.
2. Connect shared services: Redis (`src/redis.ts`) and PostgreSQL/Prisma (`src/db.ts`).
3. Optional SOCKS proxy (`PROXY`) is injected into bot HTTP clients.
4. Start each bot defined in `BOTS` (env keys: `INMANKIST_BOT_KEY`, `IVWHAT_BOT_KEY`, `CONVERSLATION_BOT_KEY`, `MATCHFOUND_BOT_KEY`), wrapping each with crash/restart handling.
5. If `MATCHFOUND_BOT_KEY` is present, start the MatchFound API server (`src/matchfound/api/server.ts`) alongside the bot.

## Runtime services
- **Telegram bots** (`src/<bot>`): `matchfound`, `inmankist`, `ivwhat`, `converslation`. Each exports `startBot` consumed by the runner.
- **HTTP API (MatchFound)**: Express server with `helmet`, `cors`, rate limiting, `express-session` + `passport` for OAuth. Routes under `/api/{auth,profile,matches,likes,telegram}` and `/health`. Port via `MATCHFOUND_API_PORT`; CORS via `MATCHFOUND_API_CORS_ORIGIN`; session secret via `MATCHFOUND_SESSION_SECRET`.
- **Data stores**: PostgreSQL (via Prisma client/adapter in `src/db.ts`; schema in `prisma/schema.prisma`) and Redis (shared client/helpers in `src/redis.ts` with bot-prefixed keys).
- **Logging**: Winston JSON/console logger in `src/log.ts`.

## Directory map (selected)
- `src/index.ts` – application entry; bot registry and lifecycle.
- `src/matchfound/` – MatchFound Telegram bot:
  - `commands.ts`, `callbacks.ts` – command/callback routing.
  - `reports.ts`, `session.ts`, `matching.ts` – reminders, session mgmt, matching logic.
  - `strings.ts`, `constants.ts`, `types.ts` – localization and shared types.
  - `api/` – Express server, middleware, auth, and feature routes.
  - `COMPLEMENTARY_MATRIX.md` – domain reference for matching logic.
- `src/shared/` – cross-bot helpers (i18n strings, profile callbacks).
- `src/utils/` – bot utilities (startup, error handling, shared helpers).
- `src/inmankist/` – quiz/classification flows (archetype, MBTI, Big Five, Enneagram, political compass) with JSON data per model.
- `src/ivwhat/`, `src/converslation/` – other bot implementations encapsulated per directory.
- `assets/` – static assets (fonts, deity metadata, etc.).
- `scripts/` – operational scripts.
- `prisma/schema.prisma` – database schema for Prisma + PostgreSQL.

## Extending
- To add a new bot: create `src/<bot>` with a `startBot` export, then register it in `BOTS` inside `src/index.ts` with its env key.
- To expose new HTTP features for MatchFound: add route modules under `src/matchfound/api/routes/` and mount in `src/matchfound/api/server.ts`.

