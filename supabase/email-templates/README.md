# Branded auth emails + Google sign-in branding

Two things were asked for that can't be done as app code — both are Supabase Dashboard / Google
Cloud Console settings with no API or MCP access for either. This doc is the setup guide; the
`.html` files next to it are the actual templates to paste in.

## 1. Branded confirmation / reset-password emails

Right now these come from Supabase's shared sender with Supabase's default template. Two
separate things make them "from Clockly":

### a. Install the templates (free, no extra account needed)

1. Supabase Dashboard → **Authentication → Emails → Templates**.
2. Select **Confirm signup**, replace the body with `confirm-signup.html` in this folder, set the
   subject to `אימות כתובת האימייל שלך ב-Clockly`, save.
3. Select **Reset Password**, replace the body with `reset-password.html`, set the subject to
   `איפוס סיסמה לחשבון Clockly שלך`, save.
4. Send yourself a test signup/reset from the live app to confirm the RTL layout and the
   `{{ .Data.full_name }}` personalization render correctly — Gmail and most modern clients
   handle the inline-styled table layout used here fine; if a client mangles it, strip it down
   further rather than adding `<style>` blocks (Outlook desktop ignores those).

This alone changes the *look* of the email but **not the sender address** — it'll still say
"via supabase.io" or similar, because Supabase's shared mail server is still doing the sending.

### b. Custom SMTP (needed for the sender address itself, e.g. noreply@clockly.app)

This needs an SMTP provider account you control — I can't create one for you. Quick path:

1. Sign up for an SMTP provider with a usable free tier — **Resend** (resend.com) is the
   easiest for a single small app; SendGrid/Postmark work too.
2. Add and verify your sending domain there (they'll give you DNS records — SPF, DKIM, and
   usually a tracking CNAME — to add wherever your domain's DNS is managed).
3. Supabase Dashboard → **Authentication → Emails → SMTP Settings** → enable custom SMTP, fill
   in the host/port/username/password the provider gave you, set the sender to something like
   `Clockly <noreply@yourdomain.com>`.
4. Send a test email from that same Supabase screen to confirm it works before relying on it.

Without a domain of your own, skip this step — the branded templates from part (a) still help
even sent from Supabase's default address.

## 2. Google sign-in showing your Supabase project URL

The consent screen ("to continue to hhttgtzlnoojvyyycmrm.supabase.co") shows your Supabase
project's own domain because that's genuinely where the OAuth redirect lands — Supabase's
hosted Auth server is the OAuth client's registered redirect URI. This is expected for any app
using Supabase's built-in `signInWithOAuth()` flow without a custom Auth domain.

### What you can fix right now (Google Cloud Console, ~5 minutes)

1. [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services
   → OAuth consent screen**.
2. Set **App name** to `Clockly`, upload the app logo (`public/logo.png` in this repo) as the
   app logo, set a real **Support email**, add your Netlify domain under **Authorized domains**.
3. If the app is still in "Testing" publishing status, Google shows an extra "unverified app"
   warning regardless of branding — moving to "In production" (may require Google's app
   verification review for sensitive scopes, not needed for basic profile/email scopes) removes
   that warning.

This makes the screen look intentional and shows "Clockly" prominently, but Google will still
mention the redirect target — that part requires either Supabase's **Custom Domains** feature
(Pro plan, lets Auth run on your own subdomain like `auth.clockly.app` instead of the project's
`*.supabase.co` domain) or reworking the sign-in flow to use Google's own Identity Services SDK
directly (bypassing Supabase's OAuth redirect entirely, then handing the resulting ID token to
`supabase.auth.signInWithIdToken()`) — a real change to `GoogleButton.tsx` and the OAuth client
setup, not a config tweak. Ask if you want that built.
