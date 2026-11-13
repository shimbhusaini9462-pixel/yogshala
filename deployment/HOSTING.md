# Hosting the Yogshala PHP website

This package needs Apache with PHP 8.1 or newer, PDO PostgreSQL (for Supabase) or PDO MySQL, cURL, Fileinfo and outbound HTTPS. It cannot run as a static-only deployment.

1. Upload and extract the package in the site's document root. Enable Apache mod_rewrite and AllowOverride so the included .htaccess rules are enforced. Confirm /.env, /database/fee-catalog.json, /uploads/ and /config.php return 403 before accepting customers. Keep PHP display_errors disabled in production.
2. Configure DATABASE_URL privately with the real Supabase Session Pooler credentials, or set DB_DRIVER=mysql and the host's DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD. Do not upload the local development .env or gateway credentials. The existing local Supabase hostname currently does not resolve.
3. For PostgreSQL, apply database/supabase-schema.sql using the database's private SQL console. For MySQL, select the hosting database, import database/database.sql after removing its CREATE DATABASE and USE statements, then razorpay-schema.sql and manual-payments-mysql.sql; run the existing setup workflow with the hosting database configuration to install the remaining portal tables. Do not run setup.php blindly on a shared host: its MySQL branch uses local XAMPP defaults. Create the initial admin with a password hash through the private database administration workflow; never expose setup or admin credentials publicly.
4. Make uploads/payment-proofs writable by PHP, with no public HTTP access. Use HTTPS for login and payments. Verify that the QR receiver is correct and that an admin can view proofs while guests cannot.
5. Test registration, login, plan pricing, a pending manual UPI submission, admin review and single membership activation. Do not collect customer payments until these checks pass.

Local credentials, existing user uploads and private customer records are intentionally absent. Recovery email and other production settings need separate private configuration. This package is prepared for upload; generating it does not publish a website.
