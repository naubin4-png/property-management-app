# Tenant Email Activation

Tenant email is intentionally fail-closed. The application will not send tenant
mail unless the workspace toggle is on and all three provider variables are
present.

## Before a sending domain exists

- Leave `RESEND_API_KEY`, `EMAIL_FROM`, and `RESEND_WEBHOOK_SECRET` unset in
  production.
- Leave **Enable automatic tenant email** off in every workspace.
- Use the fake delivery dependency in automated tests. Do not send test mail to
  tenant addresses.
- If provider verification is required before domain activation, restrict the
  provider account to `naubin4@gmail.com`; do not enable workspace delivery.

## Activate after the client provides a domain

1. Add the client-owned domain in Resend and publish the exact SPF and DKIM DNS
   records Resend supplies. Wait until the domain is shown as verified.
2. Create a production-only Resend API key with sending access.
3. Create a Resend webhook for
   `https://property-management-app-virid.vercel.app/api/webhooks/resend`.
   Subscribe to `email.sent`, `email.delivered`, `email.delivery_delayed`,
   `email.failed`, `email.suppressed`, `email.bounced`, and
   `email.complained`.
4. Add these encrypted Production environment variables in Vercel:
   - `RESEND_API_KEY`
   - `EMAIL_FROM` using the verified domain, for example
     `Property Manager <reminders@client-domain.example>`
   - `RESEND_WEBHOOK_SECRET` using the webhook signing secret
5. Redeploy production. Confirm the Reminders page reports the provider as
   configured, but leave workspace delivery disabled.
6. Set the workspace Reply-to address to the owner-managed inbox.
7. Use a temporary lease whose recipient is `naubin4@gmail.com`, enable delivery,
   and trigger exactly one reminder. Confirm the history moves from **Accepted**
   to **Delivered** through the signed webhook.
8. Delete the temporary lease and its generated delivery history, then enable
   delivery for the client workspace.

## Rollback

Turn off **Enable automatic tenant email** for the workspace. For an immediate
global stop, remove `RESEND_API_KEY` from Vercel and redeploy. Retain webhook
history for diagnosis; rotating the webhook secret requires updating Vercel and
redeploying before events will be accepted again.
