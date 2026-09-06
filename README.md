# Fabro CRM demo

This repository demonstrates how [Fabro](https://fabro.sh) turns an AI coding task into a visible, repeatable workflow.

The CRM is deliberately small. It gives Fabro a realistic full-stack application to change, review, and verify without making the demo about CRM complexity.

## What the demo shows

The checked-in [`build-feature` workflow](.fabro/workflows/build-feature/workflow.fabro) runs one feature request through:

```text
Plan → Human approval → Implement → Review → Build and type-check
                                      ↑             ↓
                                      └── Fix ← Failure
```

- The workflow is version-controlled with the code.
- A human approves the plan before files change.
- A separate review stage checks the implementation.
- Deterministic TypeScript and production-build checks decide whether the work passes.
- Failed checks return to an agent for up to three fixes.
- Git keeps the resulting change inspectable and reversible.

The agents remain non-deterministic, but the process around them is explicit and repeatable.

## Run the demonstration

Install and start the example application:

```sh
npm install
./scripts/install-pocketbase
./scripts/dev
```

Open the PocketBase dashboard at `http://127.0.0.1:8090/_/`, create the first superuser, and add a record to the `users` collection. The CRM runs at `http://localhost:5173`.

Install Fabro, connect it to your existing Codex subscription, then run the workflow from the repository root:

```sh
brew install fabro-sh/tap/fabro
fabro install
fabro run build-feature --goal "Add notes to contacts"
```

During `fabro install`, choose OpenAI Codex device login. Fabro uses the subscription OAuth session stored in its local vault; no OpenAI API key is required. This repository pins Fabro to the OpenAI provider and disables automatic pull requests for the demo.

Good demonstration tasks are small but cross more than one layer:

- Add notes to contacts.
- Add a next-action date to deals.
- Add a qualified-deals filter.
- Show won revenue on the overview.

Watch where Fabro pauses, which files the agent changes, how `./scripts/check` gates completion, and how a failed check enters the fix loop.

## Example application

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS 4, React Router 6 |
| Backend | PocketBase 0.39.4 with SQLite, auth, storage, and REST API |
| Server logic | PocketBase JavaScript hooks |
| AI assistant | OpenRouter with `openai/gpt-5-mini` and scoped CRM tools |
| Web server | Caddy with automatic HTTPS |
| Infrastructure | Ubuntu 24.04 on one Hetzner server with systemd |
| Backups | PocketBase native backups with a nightly macOS launchd pull to Google Drive |

The OpenRouter assistant is optional. Copy `.env.example` to `.env` and provide `OPENROUTER_API_KEY` only when demonstrating it.

## Deployment example

The `deploy/` directory shows how the same demo could run on a small Hetzner server behind Caddy. It is included to give Fabro realistic infrastructure files to reason about; running the Fabro demonstration does not require deployment.

This repository is a teaching example, not a production CRM template. Authentication rules and secret boundaries are retained because removing them would teach the wrong workflow.
