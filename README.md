# HeyMe

A personal identity service that lets people control which details they share with OAuth applications.

## Run locally

Install [Bun](https://bun.sh/) and [Docker](https://www.docker.com/). Docker compose starts a local Postgres database and a Vercel Blob emulator.

```sh
bun install --frozen-lockfile
cp .env.example .env.local
docker compose up -d
```

Generate an auth secret with `openssl rand -base64 32` and add it to `.env.local` for the `BETTER_AUTH_SECRET` key, then run:

```sh
bun run db:migrate
bun run dev
```

The app is available at <http://localhost:3000>. Profile picture uploads work locally against the Blob emulator. Database data survives restarts; run `docker compose down -v` to reset it.

## Commands

```sh
bun run typecheck
bun test
bun run build
```
