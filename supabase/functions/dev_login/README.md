# dev_login (dev only)

Generates a magic link for a given **email** so you can log in as that user without OTP.

**Requirements:**
- The user must have an **email** in Supabase Auth (phone-only users: add an email in Dashboard → Authentication → Users).
- Only enabled when `DEV_LOGIN_SECRET` is set in the function’s environment.

**Setup:**

1. In Supabase Dashboard → Edge Functions → `dev_login` → Settings, add secret:
   - `DEV_LOGIN_SECRET` = any secret string (e.g. a long random string).

2. In your app config (e.g. `app.json` → `expo.extra`), add the same value so the app can call the function:
   - `"devLoginSecret": "same-secret-as-above"`
   - Use a local override or env so this is not committed.

3. Deploy the function:
   ```bash
   supabase functions deploy dev_login
   ```
   Then set `DEV_LOGIN_SECRET` in the project’s Edge Function secrets (Dashboard → Project Settings → Edge Functions → Secrets).

**Usage:**  
On the login screen in **development** (`__DEV__` and `devLoginSecret` set), a “Dev: log in without OTP” section appears. Enter the user’s email and tap “Get magic link”. The function verifies the token server-side and returns session tokens; the app signs you in with no browser or redirect.
