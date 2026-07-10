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

This alone changes the *look* of the email but **not the sender name** — it'll still show as
coming from Supabase, because Supabase's shared mail server is still doing the sending, and its
sender name isn't configurable (only Custom SMTP unlocks that field).

### b. Custom SMTP — needed for the "From" name to say Clockly, and for real users to get mail at all

**This isn't just cosmetic.** Per Supabase's own docs, the built-in default mailer (no Custom
SMTP configured) will only deliver to addresses that are team members of your Supabase
organization — every other recipient gets silently refused with "Email address not authorized."
That means **right now, anyone other than you signing up for real likely isn't receiving a
confirmation email at all.** Custom SMTP fixes both the branding and this.

You do **not** need to own a domain for this — Resend's free tier includes a ready-to-use
sender (`onboarding@resend.dev`) that works immediately with zero domain setup, and still lets
the display name say "Clockly":

1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month, 100/day —
   plenty for this app). No domain or credit card needed to start.
2. Dashboard → **API Keys** → create a key (or **SMTP** tab, which shows ready-made SMTP
   credentials for `smtp.resend.com`, port 587, username `resend`, password = your API key).
3. Supabase Dashboard → **Authentication → Emails → SMTP Settings** → enable Custom SMTP:
   - Host: `smtp.resend.com`, Port: `587`
   - Username: `resend`, Password: the API key from step 2
   - Sender email: `onboarding@resend.dev` (Resend's shared no-verification-needed address)
   - Sender name: `Clockly` ← this is the field that makes inboxes show "Clockly <onboarding@resend.dev>"
4. Save, then use the "Send test email" button on that same Supabase screen to confirm delivery
   to an address outside your team before relying on it.
5. If you later buy a domain, verify it in Resend (Domains → Add Domain → add the SPF/DKIM DNS
   records they give you) and swap the sender email to `noreply@yourdomain.com` — the sender
   name field stays "Clockly" either way, no other change needed.

Resend also documents this exact integration directly: [resend.com/docs/send-with-supabase-smtp](https://resend.com/docs/send-with-supabase-smtp).

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
