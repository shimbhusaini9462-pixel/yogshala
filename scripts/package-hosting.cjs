'use strict';
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'deployment','hosting-'+Date.now());
fs.mkdirSync(out,{recursive:true});
function copy(source,target){fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}
// Root public pages and media only; never copy local env, credentials, logs or uploads.
const publicExtensions=new Set(['.html','.css','.js','.jpg','.jpeg','.png','.webp','.svg','.gif','.jfif','.mp4','.ico','.woff','.woff2']);
for(const entry of fs.readdirSync(root,{withFileTypes:true}))if(entry.isFile() && (publicExtensions.has(path.extname(entry.name).toLowerCase()) || ['config.php','robots.txt'].includes(entry.name)))copy(path.join(root,entry.name),path.join(out,entry.name));
function tree(relative,accept){const source=path.join(root,relative);if(!fs.existsSync(source))return;for(const entry of fs.readdirSync(source,{withFileTypes:true})){const child=path.join(relative,entry.name);if(entry.isDirectory())tree(child,accept);else if(accept(child))copy(path.join(root,child),path.join(out,child));}}
tree('assets',file=>publicExtensions.has(path.extname(file).toLowerCase()));
tree('api',file=>path.extname(file)==='.php');
const dbFiles=new Set(['connection.php','email-identity.php','fee-catalog.json','database.sql','supabase-schema.sql','razorpay-schema.sql','manual-payments-mysql.sql','setup.php','recovery-config.example.json','video-config.example.json']);
tree('database',file=>dbFiles.has(path.basename(file)));
fs.mkdirSync(path.join(out,'uploads','payment-proofs'),{recursive:true});
fs.writeFileSync(path.join(out,'.env.example'),'# Configure privately on the hosting server. Do not publish credentials.\nDB_DRIVER=pgsql\nDATABASE_URL=postgresql://USER:ENCODED_PASSWORD@SESSION_POOLER_HOST:5432/postgres?sslmode=require\n');
fs.writeFileSync(path.join(out,'.htaccess'),`Options -Indexes
DirectoryIndex index.html
RewriteEngine On
RewriteRule (^|/)\. - [F,L]
RewriteRule ^(?:database|uploads|tests|scripts|utils|deployment)(?:/|$) - [F,L,NC]
RewriteRule ^(?:config|hash|router)\.php$ - [F,L,NC]
<FilesMatch "\.(?:sql|log|ps1|cmd|bat|py|md|json)$">
 Require all denied
</FilesMatch>
`);
fs.copyFileSync(path.join(root,'deployment','HOSTING.md'),path.join(out,'HOSTING.md'));
const files=[];function check(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())check(p);else files.push(path.relative(out,p).replaceAll('\\','/'));}}check(out);
for(const file of files){if(/(^|\/)(?:\.env(?:\.local)?|razorpay-config\.php|recovery-config\.json|local-admin\.txt)$/.test(file))throw Error('Private file in package: '+file);}
const archive=out+'.zip';
execFileSync('powershell',['-NoProfile','-Command',"Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:YOGSHALA_STAGE,$env:YOGSHALA_ARCHIVE)"],{env:{...process.env,YOGSHALA_STAGE:out,YOGSHALA_ARCHIVE:archive},windowsHide:true,stdio:'pipe'});
console.log(JSON.stringify({archive,files:files.length,privateCredentialsIncluded:false}));
