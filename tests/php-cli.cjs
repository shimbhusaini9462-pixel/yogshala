'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const envFile=path.join(root,'.env');
const settings=fs.existsSync(envFile) ? fs.readFileSync(envFile,'utf8') : '';
const postgres=Boolean(process.env.DATABASE_URL) || process.env.DB_DRIVER==='pgsql' || /^\s*DATABASE_URL\s*=\s*\S+/m.test(settings);
module.exports=function phpSql(code) {
    return execFileSync(process.env.PHP_BINARY || 'C:/xampp/php/php.exe',[
        ...(postgres ? ['-d','extension=pdo_pgsql'] : []),
        '-r',"require 'config.php'; "+code
    ],{cwd:root,encoding:'utf8'});
};
