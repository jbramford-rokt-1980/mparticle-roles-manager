# mParticle Custom Roles Manager

Internal tool for the Solutions team. View any customer org's custom roles and exactly what they grant, and create, update, or delete roles — with a mandatory diff preview before anything is written.

Everything runs on your machine: a React UI plus a local proxy that holds credentials. Nothing is hosted, and credentials live in one encrypted file.

## Quick start

```bash
npm install
npm run dev        # UI on http://localhost:5173, proxy on 127.0.0.1:8931
```

Want to try the UI with zero credentials? `npm run dev:mock` serves a seeded fake org.

First launch asks you to create a vault passphrase. It encrypts customer API credentials on disk (AES-256-GCM, scrypt). There is no recovery: if you forget it, delete `data/vault.enc.json` and re-enter the credentials.

## Getting mParticle credentials

Each customer environment needs an mParticle API credential with the **Custom Roles** API selected (Admin permissions, organization-level scope). Custom Roles is a separate API in the credential dialog — Platform API access is not what this tool uses:

1. In the customer's mParticle dashboard: Settings → API Credentials → Add Credential.
2. Under **Select APIs**, tick **Custom Roles**. Only Custom Role Admins can do this.
3. Copy the client secret immediately — mParticle shows it once.
4. Note the org ID and account ID from the credential dialog (there is no API to discover them).
5. Check which pod the customer runs on (US1/US2/EU1/AU1) — it's in their dashboard URL.

Add all of that under **Environments** in the app and hit *Test connection*.

## How writing works (and why the diff screen exists)

The Custom Roles API has three endpoints: list permission tasks, get the role manifest, and **PUT the entire manifest**. There is no per-role update — an omitted role is a deleted role. So this app never lets the UI build a PUT body:

1. Your change is sent as an intent (upsert role / delete role / restore snapshot).
2. The proxy re-fetches the live manifest, applies the intent, validates it, and returns a diff.
3. You review the diff (deletions need an explicit acknowledgement) and confirm.
4. The proxy re-checks the manifest version and PUTs the full manifest. If someone changed the org in between, you get the refreshed diff instead of a silent overwrite.

Every successful write (and the first fetch per environment) is snapshotted to `data/history/` — the History page can roll the org back through the same diff gate.

## Things the API cannot do

- Assign or unassign roles to users — UI only (Settings → User Management). Deleting a role that's still assigned is rejected by mParticle.
- List which users hold a role.
- Discover org/account IDs.

## Security notes

- The proxy binds `127.0.0.1` only and locks the vault after 30 idle minutes (`IDLE_LOCK_MINUTES`).
- Client secrets never reach the browser (masked to the last 4 characters) and are redacted from logs.
- OAuth tokens live in proxy memory only; they expire after 8 hours and cannot be revoked, so don't share them.
- `data/` (vault + history) is gitignored. Keep it that way.

## Development

```bash
npm run typecheck   # strict TS across all workspaces
npm test            # 137 tests: unit + route integration + UI (Vitest, msw, fastify inject)
npm run lint
npm run build
```

Workspaces: `shared/` (types, limits, diff engine, validation, permission help — used by both sides), `server/` (Fastify proxy: vault, token manager, mParticle client, plan/commit routes, history), `web/` (React + Tailwind UI, Rokt-branded).
