'use strict';
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
    const db=new PGlite();
    try {
        await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
        const schema=fs.readFileSync(path.join(__dirname,'../database/supabase-schema.sql'),'utf8');
        await db.exec(schema);
        await db.exec(schema);
        await db.exec("INSERT INTO students(name,email,password) VALUES('Student','Student@example.com','hash'); INSERT INTO teachers(name,email,password) VALUES('Teacher','teacher@example.com','hash'); INSERT INTO admins(username,password) VALUES('admin','hash');");
        const count=async sql=>(await db.query(sql)).rows[0].n;
        assert.equal(await count('SELECT COUNT(*)::int AS n FROM account_emails'),2);
        await assert.rejects(()=>db.exec("INSERT INTO teachers(name,email,password) VALUES('Duplicate','student@EXAMPLE.com','hash')"));
        await db.exec("UPDATE students SET email='new@example.com' WHERE id=1; UPDATE admins SET recovery_email='admin@example.com' WHERE id=1;");
        assert.equal(await count("SELECT COUNT(*)::int AS n FROM account_emails WHERE email='student@example.com'"),0);
        await assert.rejects(()=>db.exec("UPDATE admins SET recovery_email='new@example.com' WHERE id=1"));
        await db.exec("INSERT INTO batches(name,teacher_id) VALUES('Yoga',1); INSERT INTO students_batches(student_id,batch_id) VALUES(1,1) ON CONFLICT(student_id,batch_id) DO NOTHING; INSERT INTO students_batches(student_id,batch_id) VALUES(1,1) ON CONFLICT(student_id,batch_id) DO NOTHING; INSERT INTO schedules(batch_id,class_date,class_time,duration) VALUES(1,CURRENT_DATE+1,'09:00',60); INSERT INTO live_classes(schedule_id,room_name) VALUES(1,'room'); INSERT INTO enquiries(name,phone,email,details) VALUES('Contact','1234567890','contact@example.com','{}'); INSERT INTO razorpay_enquiry_orders(order_id,enquiry_id,owner_hash,amount,currency) VALUES('order1',1,repeat('a',64),10000,'INR'); INSERT INTO payments(student_id,amount,expiry_date) VALUES(1,100,CURRENT_DATE+30); INSERT INTO attendance(student_id,live_class_id,join_time) VALUES(1,1,NOW()-INTERVAL '10 minutes'); UPDATE attendance SET leave_time=CURRENT_TIMESTAMP,duration=TRUNC(EXTRACT(EPOCH FROM(CURRENT_TIMESTAMP-join_time))/60)::integer; INSERT INTO portal_settings VALUES('waiting_video','url') ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value;");
        assert.equal((await db.query('SELECT duration FROM attendance')).rows[0].duration,10);
        assert.equal(await count('SELECT COUNT(*)::int AS n FROM students_batches'),1);
        assert.equal(await count('SELECT COUNT(*)::int AS n FROM schedules s WHERE (s.class_date+s.class_time)>=NOW()'),1);
        await db.exec(schema); // Reapplying setup must preserve existing records.
        assert.equal(await count('SELECT COUNT(*)::int AS n FROM payments'),1);
        for(const role of ['anon','authenticated']) {
            await db.exec('SET ROLE '+role);
            for(const table of ['students','teachers','admins','enquiries','password_resets','payments','manual_payments']) await assert.rejects(()=>db.query('SELECT * FROM '+table));
            await assert.rejects(()=>db.exec("INSERT INTO enquiries(name,phone,email,details) VALUES('x','1234567','x@x.com','{}')"));
            await db.exec('RESET ROLE');
        }
        await db.exec('BEGIN; DELETE FROM students WHERE id=1; ROLLBACK;');
        assert.equal(await count('SELECT COUNT(*)::int AS n FROM students'),1);
        await db.exec('DELETE FROM students WHERE id=1');
        assert.equal(await count("SELECT COUNT(*)::int AS n FROM account_emails WHERE account_role='student'"),0);
        assert.equal(await count('SELECT COUNT(*)::int AS n FROM payments'),0);
        console.log('PASS PostgreSQL schema, repeat setup, email uniqueness, enrolment, payments, schedules, attendance, RLS, rollback and cascades (PGlite).');
    } finally {await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
