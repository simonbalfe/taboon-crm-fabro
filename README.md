# Taboon CRM Fabro test

A deliberately small CRM for testing Fabro against a real full-stack repository.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS 4, React Router 6 |
| Backend | PocketBase 0.39.4 with SQLite, auth, storage, and REST API |
| Server logic | PocketBase JavaScript hooks |
| AI assistant | OpenRouter with `openai/gpt-5-mini` and scoped CRM tools |
| Web server | Caddy with automatic HTTPS |
| Infrastructure | Ubuntu 24.04 on one Hetzner server with systemd |
| Backups | PocketBase native backups with a nightly macOS launchd pull to Google Drive |

## Local setup

```sh
npm install
./scripts/install-pocketbase
cp .env.example .env
set -a
. ./.env
set +a
./scripts/dev
```

Open `http://127.0.0.1:8090/_/`, create the first PocketBase superuser, then create a user record in the `users` collection. Sign into the CRM at `http://localhost:5173`.

The OpenRouter assistant is optional. Leave `OPENROUTER_API_KEY` empty until you want to test it.

## Fabro

Fabro is not installed by this repository. Once installed, run:

```sh
fabro run workflows/build-feature.fabro
```

The workflow plans a requested change, waits for approval, implements it, reviews the diff, and loops through `./scripts/check` until verification passes or the three-fix limit is reached.

## Hetzner deployment

Create one Ubuntu 24.04 server, point `crm.taboon.co.uk` to its IP, and install Caddy. Copy these runtime files to `/opt/taboon-crm`:

- `pocketbase`
- `pb_hooks/`
- `pb_migrations/`
- the built frontend as `web/dist/`

Create the `taboon-crm` system user and `/etc/taboon-crm.env`, then install `deploy/hetzner/taboon-crm.service` and `deploy/hetzner/Caddyfile` in their normal system locations. Enable native PocketBase backups in the admin UI.

Fill in the two placeholders in `deploy/macos/co.uk.taboon.crm-backups.plist`, copy it to `~/Library/LaunchAgents/`, and load it with `launchctl bootstrap gui/$(id -u)`. The job pulls PocketBase backup archives into Google Drive every night.
