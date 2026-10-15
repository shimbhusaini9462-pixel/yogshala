'use strict';
const fs=require('node:fs');
const path=require('node:path');
const nodemailer=require('nodemailer');
(async()=>{
    const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../database/recovery-config.json'),'utf8'));
    let input='';for await(const chunk of process.stdin)input+=chunk;
    const message=JSON.parse(input);
    if(config.transport!=='gmail' || !config.gmail_user || !config.gmail_app_password)throw Error('Gmail setup incomplete');
    const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:config.gmail_user,pass:config.gmail_app_password.replace(/\s/g,'')},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
    await transport.sendMail({from:{name:'Yogshala Jaipur',address:config.gmail_user},to:message.to,subject:message.subject,text:message.text});
    process.stdout.write('sent');
})().catch(()=>{process.stderr.write('Email delivery failed. Check Gmail credentials and connectivity.');process.exitCode=1;});
