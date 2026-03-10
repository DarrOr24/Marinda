# Phone sign-in setup (Marinda)

Marinda uses **phone number + OTP** for sign-in and account creation. If sign-in or sign-up via phone isn’t working, check the following.

## 1. Supabase Dashboard (hosted project)

### Enable phone auth and signup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **Providers**
3. Find **Phone** and enable it
4. Turn on **“Confirm phone”** if you want users to verify their number
5. Ensure **“Allow new user signups”** is enabled so new users can create accounts

### Configure an SMS provider

Supabase needs an SMS provider to send OTP codes. Twilio is the most common choice.

1. In **Project Settings** → **Auth** → **SMS**
2. Choose **Twilio** (or another supported provider)
3. Add your Twilio credentials:
   - Account SID
   - Auth Token (or Verification Service SID if using Twilio Verify)
   - Message Service SID (for Programmable Messaging)

If Twilio is not configured, OTP requests will fail and users won’t receive codes.

## 2. Local development (config.toml)

For local Supabase (`supabase start`), edit `supabase/config.toml`:

```toml
[auth.sms]
enable_signup = true   # Allow new users to sign up via phone
enable_confirmations = true

[auth.sms.twilio]
enabled = true
account_sid = "your_account_sid"
message_service_sid = "your_message_service_sid"
auth_token = "env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)"
```

Set `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` in `.env` or your environment.

## 3. Phone number format

The app expects numbers in **E.164** format (e.g. `+1234567890`). The phone input component handles this automatically when the user selects a country and enters their number.

## 4. Troubleshooting

| Symptom | Likely cause |
|--------|---------------|
| “Invalid OTP” or no code received | SMS provider not configured or wrong credentials |
| “Signups not allowed” | `enable_signup` is false in Supabase |
| Continue button stays disabled | Phone number invalid or not in E.164 format |
| Works for some countries, not others | Some regions may be restricted by your SMS provider |

## 5. Test OTP (local dev only)

For local testing without real SMS, you can use a fixed OTP map in `config.toml`:

```toml
[auth.sms.test_otp]
"4152127777" = "123456"
```

Then use `+14152127777` and OTP `123456` to sign in.
