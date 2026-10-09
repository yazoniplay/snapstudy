# SnapStudy Plus payment setup

Website checkout is implemented with Stripe Checkout. The Edge Functions are deployed, but payments remain disabled until the Stripe account and server-side secrets are configured. Never put Stripe secret keys or webhook signing secrets in app code or GitHub.

## 1. Create the Stripe product and price

Use a Stripe account managed by an adult account holder where required.

1. Open the Stripe Dashboard and switch to **test mode** first.
2. Create a product named **SnapStudy Plus**.
3. Add a **recurring monthly** price of **SEK 29.00**.
4. Copy the Price ID (starts with `price_`). This is the `STRIPE_PRICE_ID` value.
5. Keep test mode enabled until a complete test purchase and cancellation flow works.

## 2. Add secrets in Supabase

Open the Supabase project **thqxjxrtcvcrnqnnmjzi** → **Edge Functions** → **Secrets**. Add these values there only:

- `STRIPE_SECRET_KEY`: Stripe test secret key (starts with `sk_test_` during testing).
- `STRIPE_PRICE_ID`: the monthly SEK 29 Price ID.
- `APP_URL`: `https://yazoniplay.github.io/snapstudy`
- `STRIPE_WEBHOOK_SECRET`: add after creating the webhook endpoint in step 3.

Supabase provides its own `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` values to Edge Functions. Do not manually expose or copy the service-role key into the client.

## 3. Configure the Stripe webhook

In Stripe Dashboard → Developers / Workbench → Webhooks, create an endpoint with this URL:

`https://thqxjxrtcvcrnqnnmjzi.supabase.co/functions/v1/stripe-webhook`

Select these events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Copy the endpoint's signing secret (starts with `whsec_`) into the Supabase `STRIPE_WEBHOOK_SECRET` secret. Do not use the Stripe API secret as the webhook secret.

## 4. Test before going live

1. Sign in to SnapStudy on the website.
2. Open Plus and choose **Subscribe · 29 kr/month**.
3. Complete a Stripe test-mode subscription using a Stripe test card.
4. Confirm the signed webhook writes the subscription to `public.user_subscriptions` and Plus becomes active only after verification.
5. Test cancellation and failed-payment events.
6. Only after testing, create a live-mode product/price, replace the Stripe secrets with live values, and configure a live webhook endpoint.

## Mobile app billing

This Stripe integration is for the website only. iOS and Android in-app subscriptions still need Apple App Store and Google Play billing setup (or a service such as RevenueCat). The app intentionally does not offer an external Stripe checkout button on native platforms. Do not assume website billing is automatically compliant with store rules for digital subscriptions.

## Current status

- Website checkout Edge Function: deployed.
- Stripe webhook Edge Function: deployed.
- Plus page website checkout button: connected.
- Stripe product/price and secrets: still need account-owner setup.
- Real payment test: not yet performed.
- iOS / Android in-app billing: not yet configured.
