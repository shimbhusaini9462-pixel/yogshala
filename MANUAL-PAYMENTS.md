# Manual UPI payments

Students log in, select an INR online membership plan, scan the confirmed existing `QR code.jpeg`, then submit the UPI transaction reference and an image screenshot (maximum 2 MB). Check the receiver name in the UPI app before paying. No gateway credentials are needed.

Admins review requests in their dashboard. Match the reference, receiver and exact amount against the bank/UPI statement before checking the confirmation box and approving. A screenshot alone is not payment confirmation. Approval records the payment and extends membership from the later of today or the current expiry, once only. Rejection requires a note and does not activate membership. Batch assignment is separate. Do not enter an approved UPI request again using the separate Record received payment form.

After fixing the database connection, run `npm start`; setup includes the manual payments table. On hosted PostgreSQL apply the updated `database/supabase-schema.sql`; on hosted MySQL apply `database/manual-payments-mysql.sql`. Payment proofs are private and served only to authenticated admins. PostgreSQL browser roles have no access to payment requests.

The current local Supabase hostname does not resolve. Saving and reviewing requests on the main website requires fixing that connection first. The implementation does not replace the main database or customer data.

Run `node tests/manual-payments.test.cjs` for API integration checks using a separate temporary local MySQL database and PHP server. Test data is removed afterward. Run `node tests/supabase-schema.test.cjs` for PostgreSQL schema checks using PGlite.
