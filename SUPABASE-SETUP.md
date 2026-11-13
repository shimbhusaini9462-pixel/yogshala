# Supabase database setup

## Optional Python example

`app.py` is a separate Flask example. It does not replace the PHP website.
Install and run on Windows:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Open `http://127.0.0.1:5000`. The example reads at most 100 names from `todos`.
It needs a `todos` table, SELECT permission, and an appropriate RLS read policy.
It does not create tables or grant access to existing private application data.
Set `SUPABASE_URL` and `SUPABASE_KEY` in `.env`; the supplied publishable key
is sufficient only for data allowed by that project's grants and policies.
Flask and python-dotenv are included alongside supabase in `requirements.txt`.

This project uses static HTML and a PHP backend. It does not use Next.js.
Supabase PostgreSQL replaces MySQL; existing PHP sessions, password hashes,
dashboards, enquiries and Razorpay verification stay in the PHP backend.
No secret API key is required or included in browser scripts.

The requested `@supabase/supabase-js` and `@supabase/ssr` packages are installed.
`.env.local` contains the provided `NEXT_PUBLIC_SUPABASE_*` settings for SDK
tooling; it is ignored by Git and blocked by the PHP router. Run
`npm run check:supabase` to verify API reachability and the publishable key.
The Node helper is `utils/supabase/server.js`. Next.js `page.tsx` and middleware
do not run in this HTML/PHP application. Website authentication still uses PHP
sessions; SDK configuration alone does not migrate users or database records.

## Configure

1. Copy `.env.example` to `.env` if `.env` does not already exist.
2. In the Supabase dashboard, open **Connect → Session pooler** and copy the
   PostgreSQL URI (port 5432). Replace the password placeholder with the database
   password, percent-encoding special characters. Set `DATABASE_URL` in `.env`.
   A publishable/anon/secret API key cannot substitute for a database password.
3. `npm start` automatically enables XAMPP's bundled `pdo_pgsql` extension for
   its PHP processes. Other PHP hosting must enable `extension=pdo_pgsql`.

Official connection documentation:
https://supabase.com/docs/guides/database/connecting-to-postgres

## Keep existing local records

Stop website writes while migrating. Keep a MySQL backup. The target must have
no application records. While local MySQL is running, run:

```powershell
C:/xampp/php/php.exe -d extension=pdo_pgsql database/migrate-to-supabase.php
npm start
```

The migration creates the schema, copies records with their original IDs and
password hashes, rebuilds the shared email registry and resets ID sequences.
It refuses a nonempty target and rolls back row changes on failure. Source
records are read only. Optional `MYSQL_SOURCE_HOST`, `MYSQL_SOURCE_PORT`,
`MYSQL_SOURCE_NAME`, `MYSQL_SOURCE_USER`, and `MYSQL_SOURCE_PASSWORD` environment
variables override the existing local MySQL defaults.

Uploaded notes and payment screenshots remain in the existing `uploads` folder;
copy that folder too when moving hosting. Payment, email and video configuration
remain server-side in their existing files.

## Start fresh

For a new empty database, run `npm start`. The launcher applies
`database/supabase-schema.sql` and creates an admin only when none exists.
Admin credentials are saved server-side in `database/local-admin.txt`.

Do not start fresh before migrating existing records: the new admin makes the
target nonempty, and the migration will correctly refuse to overwrite it.

Without `DATABASE_URL`, local MySQL continues to work. Once it is configured,
connection errors fail explicitly; they do not silently fall back to MySQL.
Restart the existing website server after changing the database configuration.

## Access protection

Application tables have RLS enabled and browser-role access revoked. The PHP
backend connects with the privileged database credentials and enforces existing
login, roles and CSRF checks. Browser clients cannot directly read student data,
password hashes, payment details, enquiries or reset tokens.

Rotate any secret API key previously shared in chat. It is not needed for this
integration. Never commit `.env` or put database credentials in HTML/JavaScript.
