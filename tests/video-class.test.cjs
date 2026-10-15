const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
function element(){return {children:[],append(...items){this.children.push(...items)},prepend(item){this.children.unshift(item)},remove(){this.removed=true},setAttribute(){},addEventListener(){},scrollIntoView(){}};}
const dashboard=element();let disposed=0,lastOptions,events,frame;
const window={addEventListener(){},JitsiMeetExternalAPI:class {
 constructor(domain,options){assert.equal(domain,'meet.jit.si');lastOptions=options;events={};frame={};}
 addListener(event,fn){events[event]=fn;}
 getIFrame(){return frame;}
 dispose(){disposed++;}
}};
vm.runInNewContext(fs.readFileSync('video-class.js','utf8'),{window,URL,document:{createElement:element,getElementById(){return dashboard},head:element()},setTimeout,clearTimeout,fetch:async()=>({ok:true,json:async()=>({success:true,server:'meet.jit.si',room_url:'https://meet.jit.si/yogshala-test',jwt:null,private_server:false})})});
(async()=>{
 await assert.rejects(window.YogshalaVideo.open({url:'http://example.com/room'}));
 await window.YogshalaVideo.open({url:'https://meet.jit.si/yogshala-test',title:'Test',displayName:'Student',role:'student',classId:1});
 assert.equal(lastOptions.configOverwrite.startWithAudioMuted,true);assert.equal(lastOptions.userInfo.displayName,'Student');assert.equal(frame.title,'Yogshala live video class');
 events.videoConferenceJoined();assert(dashboard.children[0].children[1].textContent.includes('Connected'));
 window.YogshalaVideo.closeIfClass(2);assert.equal(disposed,0);
 window.YogshalaVideo.closeIfClass(1);assert.equal(disposed,1);
 await window.YogshalaVideo.open({url:'https://meet.jit.si/yogshala-test',title:'Test',displayName:'Teacher',role:'teacher',classId:2});
 assert.equal(lastOptions.configOverwrite.startWithAudioMuted,false);events.readyToClose();assert.equal(disposed,2);
 console.log('PASS: Jitsi room validation, student/teacher defaults, join event, iframe title, class-specific close and disposal. Real media was not tested.');
})().catch(e=>{console.error(e);process.exitCode=1});
