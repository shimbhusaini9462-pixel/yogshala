# Password recovery

- Students request a one-use reset link at their registered email address.
- Teachers ask the admin, who uses “Reset teacher password” after verifying their identity.
- Admins save their own recovery email in the admin dashboard, confirming their current password. They request reset links using their username.
- Reset links expire after 30 minutes. A completed reset invalidates old login sessions.

## Email delivery setup still required

Gmail is now selected in `database/recovery-config.json`, with sender `yogshala.jaipur@gmail.com`. Enable Google 2-Step Verification and create a dedicated App Password at https://myaccount.google.com/apppasswords. Paste it only into `gmail_app_password` in this ignored local file. Do not use your normal Gmail password. The sender address assumes the existing website contact address is correct.

No Gmail credential has been created or connected yet. The App Password must be created by the account owner. Google instructions: https://support.google.com/accounts/answer/185833

### Alternative: Resend

Copy `database/recovery-config.example.json` to `database/recovery-config.json`. Set `site_url`, a verified sender in `from`, and the Resend API key. Keep the key in this local ignored file, never in frontend code or chat. The current local URL works only on this computer; use the production HTTPS domain for real users.

The API returns an explicit setup message until delivery is configured. Do not treat this feature as live until a real email delivery and reset have been tested. Save the admin recovery email before forgetting the admin password.

Run `php database/setup.php` to apply the additive schema migration. Run `node tests/password-recovery.test.cjs` for token and access checks. These tests create and remove temporary accounts, inject hashed test-token fixtures into the database, and never send emails.

Provider API reference: https://resend.com/docs/api-reference/emails/send-email
