'use strict';
// Node tooling client. Website login continues to use the existing PHP sessions.
const fs=require('node:fs');
const path=require('node:path');
const {createClient:makeClient}=require('@supabase/supabase-js');

function createClient() {
    const root=path.resolve(__dirname,'../..');
    for(const filename of ['.env.local','.env']) {
        const file=path.join(root,filename);
        if(fs.existsSync(file)) process.loadEnvFile(file);
    }
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if(!url || !key) throw new Error('Set the Supabase URL and publishable key in .env.local.');
    return makeClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
module.exports={createClient};
