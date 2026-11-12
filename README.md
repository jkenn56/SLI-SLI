# SLI-SLI

This repository contains two versions of the SLI-BENSHII storefront:

- [Standalone version](./sli-benshi-admin-patched-updated3/patch/README.md) — frontend and API in one project folder.
- [Split frontend/backend version](./sli-benshi-admin-patched-updated3/sli-benshi-admin-patched-updated3/) — frontend and backend in separate folders.

## Backend configuration

Both backends require these environment variables before they can start:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET` — use a long, unique random value.

Set them in your local shell or hosting provider's environment settings. Do not commit real credentials or `.env` files.

Runtime data files, logs, build output, and installed dependencies are excluded from this repository. Add any required product catalog data through the admin interface after starting the application.
