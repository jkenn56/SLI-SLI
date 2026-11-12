# SLI-BENSHII

## Run locally

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` in the environment, then install dependencies with `npm install`. Run the API with `npm run server` and the storefront with `npm run dev` in separate terminals.

On PowerShell, set the backend values before starting it:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "choose-a-strong-password"
$env:JWT_SECRET = "choose-a-long-random-secret"
npm run server
```

## Reopening email alerts

To enable the one-time reopening alert, configure these environment variables for the API process and restart it:

- `SMTP_HOST`: SMTP server hostname.
- `SMTP_PORT`: SMTP port (defaults to `587`).
- `SMTP_SECURE`: set to `true` when the SMTP server requires TLS from connection start (port `465` also enables it automatically).
- `SMTP_USER` and `SMTP_PASS`: SMTP credentials; set both or neither.
- `SMTP_FROM`: sender address.
- `PUBLIC_SITE_URL`: public storefront URL included in the email.

When SMTP is configured, visitors can subscribe while the site is offline. The API saves addresses in `reopening-subscribers.json` and sends one message when an admin brings the site back online. Successfully notified addresses are removed; failed deliveries remain saved. Keep SMTP credentials out of source control.
