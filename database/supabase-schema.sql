-- Run using database/setup.php or the Supabase SQL Editor. Server-side PHP owns access.
SET TIME ZONE 'Asia/Kolkata';

-- Create the database if it doesn't exist
-- Use the created database
-- Table structure for table admins
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table structure for table teachers
CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table structure for table students
CREATE TABLE IF NOT EXISTS students (
  id SERIAL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  subscription_status VARCHAR(10) CHECK (subscription_status IN ('active','expired')) NOT NULL DEFAULT 'expired',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table structure for table batches
CREATE TABLE IF NOT EXISTS batches (
  id SERIAL,
  name VARCHAR(100) NOT NULL,
  teacher_id INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT batches_ibfk_1 FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE SET NULL
);

-- Table structure for table students_batches
CREATE TABLE IF NOT EXISTS students_batches (
  id SERIAL,
  student_id INTEGER NOT NULL,
  batch_id INTEGER NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT student_batch UNIQUE (student_id,batch_id),
  CONSTRAINT students_batches_ibfk_1 FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT students_batches_ibfk_2 FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE CASCADE
);

-- Table structure for table schedules
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL,
  batch_id INTEGER NOT NULL,
  class_time TIME NOT NULL,
  duration INTEGER NOT NULL,
  class_date DATE NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT schedules_ibfk_1 FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE CASCADE
);

-- Table structure for table live_classes
CREATE TABLE IF NOT EXISTS live_classes (
  id SERIAL,
  schedule_id INTEGER NOT NULL,
  room_name VARCHAR(255) NOT NULL,
  status VARCHAR(10) CHECK (status IN ('upcoming','live','ended','cancelled')) NOT NULL DEFAULT 'upcoming',
  start_time TIMESTAMPTZ DEFAULT NULL,
  end_time TIMESTAMPTZ DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT live_classes_ibfk_1 FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE
);

-- Table structure for table attendance
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL,
  student_id INTEGER NOT NULL,
  live_class_id INTEGER NOT NULL,
  join_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  leave_time TIMESTAMPTZ DEFAULT NULL,
  duration INTEGER DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT attendance_ibfk_1 FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT attendance_ibfk_2 FOREIGN KEY (live_class_id) REFERENCES live_classes (id) ON DELETE CASCADE
);

-- Table structure for table payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL,
  student_id INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATE NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT payments_ibfk_1 FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enquiries (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, phone VARCHAR(25) NOT NULL, email VARCHAR(200) NOT NULL, details TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS recordings (id SERIAL PRIMARY KEY, batch_id INTEGER NOT NULL, title VARCHAR(200) NOT NULL, url VARCHAR(2000) NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS razorpay_orders (
 order_id VARCHAR(80) PRIMARY KEY,
 student_id INTEGER NOT NULL,
 amount INTEGER NOT NULL,
 months INTEGER NOT NULL,
 payment_id VARCHAR(80) UNIQUE DEFAULT NULL,
 created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS razorpay_enquiry_orders (
 order_id VARCHAR(80) PRIMARY KEY,
 enquiry_id INTEGER NOT NULL UNIQUE,
 owner_hash CHAR(64) NOT NULL,
 amount INTEGER NOT NULL,
 currency CHAR(3) NOT NULL,
 payment_id VARCHAR(80) UNIQUE DEFAULT NULL,
 created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
);

ALTER TABLE admins ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(100);
CREATE TABLE IF NOT EXISTS portal_settings (setting_key VARCHAR(60) PRIMARY KEY, setting_value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS password_resets (
 id SERIAL PRIMARY KEY, role VARCHAR(10) NOT NULL, user_id INTEGER NOT NULL,
 token_hash CHAR(64) NOT NULL UNIQUE, password_stamp CHAR(64) NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS password_resets_account_lookup ON password_resets(role,user_id);
CREATE TABLE IF NOT EXISTS account_emails (
 email VARCHAR(100) PRIMARY KEY, account_role VARCHAR(10) NOT NULL,
 user_id INTEGER NOT NULL, UNIQUE(account_role,user_id)
);

-- One address across all account roles, including concurrent signups/updates.
CREATE OR REPLACE FUNCTION public.yogshala_email_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE old_email TEXT; new_email TEXT;
BEGIN
 IF TG_OP <> 'INSERT' THEN
  old_email := LOWER(TRIM(to_jsonb(OLD)->>TG_ARGV[1]));
 END IF;
 IF TG_OP <> 'DELETE' THEN
  new_email := LOWER(TRIM(to_jsonb(NEW)->>TG_ARGV[1]));
 END IF;
 IF TG_OP = 'UPDATE' AND old_email IS NOT DISTINCT FROM new_email THEN RETURN NEW; END IF;
 IF TG_OP <> 'INSERT' THEN
  DELETE FROM account_emails WHERE account_role=TG_ARGV[0] AND user_id=OLD.id;
 END IF;
 IF TG_OP <> 'DELETE' AND COALESCE(new_email,'') <> '' THEN
  INSERT INTO account_emails(email,account_role,user_id) VALUES(new_email,TG_ARGV[0],NEW.id);
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;

DO $$
DECLARE item RECORD;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('students','student','email'),('teachers','teacher','email'),('admins','admin','recovery_email')
 ) AS roles(table_name,account_role,email_column) LOOP
  EXECUTE format('INSERT INTO account_emails(email,account_role,user_id) SELECT LOWER(TRIM(%I)),%L,id FROM %I WHERE %I IS NOT NULL AND TRIM(%I)<>%L ON CONFLICT(account_role,user_id) DO UPDATE SET email=EXCLUDED.email',item.email_column,item.account_role,item.table_name,item.email_column,item.email_column,'');
  EXECUTE format('DROP TRIGGER IF EXISTS yogshala_email_identity ON %I',item.table_name);
  EXECUTE format('CREATE TRIGGER yogshala_email_identity AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION public.yogshala_email_identity(%L,%L)',item.table_name,item.account_role,item.email_column);
 END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS manual_payments (
 id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
 student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 plan_name VARCHAR(100) NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>0),
 months INTEGER NOT NULL CHECK(months>0),
 transaction_id VARCHAR(40) NOT NULL UNIQUE,
 proof_file VARCHAR(40) NOT NULL,
 status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 review_note VARCHAR(500) NOT NULL DEFAULT '',
 reviewed_by INTEGER DEFAULT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at TIMESTAMPTZ DEFAULT NULL
);

-- PHP sessions and role checks authorize access. Never expose password hashes,
-- reset tokens, payment details or enquiries through the browser Data API.
DO $$
DECLARE table_name TEXT; api_role TEXT;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['admins','teachers','students','batches','students_batches','schedules','live_classes','attendance','payments','enquiries','recordings','razorpay_orders','razorpay_enquiry_orders','portal_settings','password_resets','account_emails','manual_payments'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC',table_name);
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I',table_name,api_role);
    IF table_name NOT IN ('razorpay_orders','razorpay_enquiry_orders','portal_settings','account_emails') THEN
     EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM %I',pg_get_serial_sequence('public.'||table_name,'id'),api_role);
    END IF;
   END IF;
  END LOOP;
 END LOOP;
END;
$$;
