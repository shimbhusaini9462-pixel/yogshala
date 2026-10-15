'use strict';
const {spawn, spawnSync} = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
const fs = require('node:fs');
const root = __dirname;
const php = process.env.PHP_BINARY || 'C:/xampp/php/php.exe';
const mysql = process.env.MYSQL_BINARY || 'C:/xampp/mysql/bin/mysqld.exe';
function listening(port) {return new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));});}
(async()=>{
    if(!fs.existsSync(php)) throw new Error('PHP missing. Install XAMPP or set PHP_BINARY.');
    if(!await listening(3306)) {
        const db=spawn(mysql,['--defaults-file=C:/xampp/mysql/bin/my.ini','--standalone'],{windowsHide:true,stdio:'ignore'});
        db.on('error',error=>console.error(error.message));
        let ready=false;
        for(let attempt=0;attempt<30;attempt++){if(await listening(3306)){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,500));}
        if(!ready) throw new Error('MySQL did not start. Check the XAMPP MySQL log.');
    }
    const setup=spawnSync(php,['database/setup.php'],{cwd:root,stdio:'inherit',windowsHide:true});
    if(setup.status!==0) throw new Error('Database setup failed.');
    const port=Number(process.env.PORT || 8085);
    if(await listening(port)){console.log(`Website already running: http://127.0.0.1:${port}`);return;}
    const server=spawn(php,['-S',`127.0.0.1:${port}`,'router.php'],{cwd:root,stdio:'inherit',windowsHide:true});
    server.on('error',error=>console.error(error.message));
    console.log(`Website: http://127.0.0.1:${port}\nAdmin login: database/local-admin.txt`);
    process.on('SIGINT',()=>{server.kill();process.exit(0);});
    process.on('SIGTERM',()=>{server.kill();process.exit(0);});
})().catch(error=>{console.error(error.message);process.exitCode=1;});
