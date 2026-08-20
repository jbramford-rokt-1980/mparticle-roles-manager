# mParticle Custom Roles Manager

Internal tool for the Solutions team. View an mParticle org's custom roles and their permissions, and create, update, or delete roles per customer environment — with a diff preview before anything is written.

Runs entirely on your machine: a React UI plus a local proxy that holds credentials. Nothing is hosted, and credentials are stored in one encrypted file.

## Quick start

```bash
npm install
npm run dev        # UI on http://localhost:5173, proxy on 127.0.0.1:8931
npm run dev:mock   # same, but against a fake mParticle API (no credentials needed)
```

Full setup and usage docs land with v1.0.
