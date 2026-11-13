# Razorpay setup

Student dashboard → Pay online / Renew membership supports the four online plans from the existing fee catalog, charged in INR. Students must sign up and log in first. Offline packages and enquiry forms retain their existing flow.

Local credentials are configured in the git-ignored `database/razorpay-config.php`. Environment variables override these values. Keep this file private; configure credentials separately on your hosting.

1. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the PHP server environment. Start with Razorpay test credentials. Never put the secret in HTML, JavaScript, or git. This project does not automatically load `.env` files.
2. Run `node server.js` (or `npm start`); it applies `database/razorpay-schema.sql` via the existing database setup. On an existing hosted database, apply that SQL once manually.
3. Enable PHP cURL and allow outbound HTTPS to `api.razorpay.com`. Enable automatic payment capture in your Razorpay account.
4. Log in as a student, choose a plan and test successful payment, dismissal, failure, and repeat verification. A verified captured payment creates one payment history entry and extends membership from the later of today or current expiry. Batch assignment remains manual.
5. After testing, configure live API credentials on your HTTPS hosting and restart PHP.

Example for the current PowerShell session (substitute your own test values):

```powershell
$env:RAZORPAY_KEY_ID = 'rzp_test_TuqJfT2q6hzLES'
$env:RAZORPAY_KEY_SECRET = 'REPLACE_ME'
npm.cmd start
```

If a PHP server is already running, restart it so it inherits the variables.

Orders and prices are stored server-side; verification checks the HMAC signature and fetches the payment from Razorpay to require captured status, matching order, amount and currency. Database locks prevent duplicate activation and serialize renewals.

If verification fails after checkout succeeds, keep the page open and use **Check payment again**. Automatic webhook reconciliation is not included: if the browser closes before verification, an administrator must reconcile the captured Razorpay payment before recording it manually. Do not ask the student to pay again.

Reference: [Razorpay Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).

Homepage verification details are kept in browser session storage so Check payment again survives a refresh in the same tab. If the browser closes before verification, manually reconcile against Razorpay. No automatic webhook reconciliation is installed. Never record a homepage booking again as a new payment without checking the Razorpay payment ID.
