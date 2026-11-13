# SLI-BENSHII

This repository is configured as one Vercel project from its root. The React storefront builds into root `public/`, and root `server.js` serves the storefront, API, and admin page on the same domain.

The store's **Buy Now** action opens a responsive product detail gallery. Admins can publish products with four photos. Store and cart orders open a WhatsApp message to `+250 791 744 472` for the customer to send.

## Run locally

Copy `.env.example` to `.env` and set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a long random `JWT_SECRET`. Then install dependencies and run these in separate terminals:

```powershell
npm install
npm run dev
```

```powershell
npm start
```

Open `http://localhost:5173`. Express serves the API on port 5000; the admin page is at `http://localhost:5000/admin`.

## Deploy on Vercel

Import the GitHub repository as one project. Set **Root Directory** to `./` (the repository root) and use the Express framework preset. Do not create a Services project. Vercel runs `npm run build` to build the storefront into `public/`; `server.js` serves the storefront, API, and admin routes on the same project. The routes are `/`, `/api/*`, `/uploads/*`, and `/admin`.

Add these environment variables in Vercel for both Production and Preview:

- `ADMIN_EMAIL`: the admin login email.
- `ADMIN_PASSWORD`: a strong admin password.
- `JWT_SECRET`: a long, unique random value.
- `PUBLIC_SITE_URL`: the deployed site URL, used for email links (for example, `https://your-domain.vercel.app`).

Do not set `PORT`; Vercel manages it. The production API shares the storefront domain, so no `VITE_API_URL` is needed. Optional reopening email alerts use `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.

**Persistence needs setup before production use:** the API writes catalog, settings, subscribers, and uploaded photos to local files. Vercel Functions do not provide durable writable project storage. Add a persistent database and object storage, then connect the API to them before relying on admin edits or photo uploads on the deployed site. Static catalog content and media included in the repository can still be served. WhatsApp order messages are sent directly by the customer and are not stored in this site's admin Orders tab. Keep credentials in the host's environment settings, not in Git.
