# SLI-BENSHII

The deployable project is split into two services:

- `frontend/` — React/Vite storefront and its design/media assets.
- `backend/` — Express API, catalog seed data, and uploaded product/league media.

The storefront design and its custom videos are kept in `frontend/public/` and the existing item uploads are in `backend/uploads/`.

## Run locally

Install dependencies in each folder, then run the API and storefront in separate terminals:

```powershell
cd backend
Copy-Item .env.example .env
# Edit .env and set ADMIN_EMAIL, ADMIN_PASSWORD, and a long random JWT_SECRET.
npm install
npm run dev
```

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The admin page is served by the API at `http://localhost:5000/admin.html`.

## Deploy on Vercel

Import this GitHub repository into Vercel twice, creating two projects from the same repository:

1. Set the first project's **Root Directory** to `frontend`. It builds with `npm ci` and `npm run build`, and publishes `dist/`.
2. Set the second project's **Root Directory** to `backend`. Vercel detects the Express app in `server.js`.

Set these environment variables on the backend project: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, and `FRONTEND_URL` (the deployed storefront origin). Set `VITE_API_URL` on the frontend project to the backend URL ending in `/api`, then redeploy the frontend. The storefront and API will have separate Vercel URLs.

The admin page and seed product images are in `backend/public/`, which Vercel serves as static assets. The seed catalog is bundled in `backend/data-seed.js`; it contains products but no customer orders.

**Persistence needs setup before production use:** the API currently writes catalog, order, settings, subscriber, and uploaded-file data to local files. Vercel Functions do not provide durable writable project storage, and `express.static()` is not used to serve assets there. Add a persistent database and object storage, then connect the API to them before using admin edits, checkout, or uploads on the deployed site. Until then, the Vercel projects can build and serve the storefront and API, but API mutations will not be durable.

Optional reopening email alerts use `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `PUBLIC_SITE_URL`. Keep credentials in the host's environment settings, not in Git.
