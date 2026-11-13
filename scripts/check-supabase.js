'use strict';
const {createClient}=require('../utils/supabase/server');

(async()=>{
    const client=createClient();
    // Read-only check: no signup, session creation, or database writes.
    const response=await fetch(new URL('/auth/v1/settings',client.supabaseUrl),{
        headers:{apikey:client.supabaseKey},signal:AbortSignal.timeout(10000)
    });
    if(!response.ok) throw new Error('Supabase API check failed (HTTP '+response.status+').');
    console.log('PASS Supabase API reachable; publishable key accepted (HTTP '+response.status+').');
    console.log('This checks API access only. PHP database migration still requires DATABASE_URL.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
