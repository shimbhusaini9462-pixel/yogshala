'use strict';
(() => {
    let sdkPromise=null, meeting=null, host=null, activeClass=null, generation=0;
    function loadSDK(server) {
        if(window.JitsiMeetExternalAPI)return Promise.resolve();
        if(sdkPromise)return sdkPromise;
        sdkPromise=new Promise((resolve,reject)=>{
            const script=document.createElement('script');
            script.src='https://'+server+'/external_api.js';script.async=true;
            const timeout=setTimeout(()=>{script.remove();sdkPromise=null;reject(Error('Video service took too long to load. Use Retry Connection.'));},15000);
            script.onload=()=>{clearTimeout(timeout);if(window.JitsiMeetExternalAPI)resolve();else{sdkPromise=null;reject(Error('Video service unavailable.'));}};
            script.onerror=()=>{clearTimeout(timeout);script.remove();sdkPromise=null;reject(Error('Video service could not load. Use Retry Connection.'));};
            document.head.append(script);
        });
        return sdkPromise;
    }
    function close() {
        generation++;
        if(meeting){const previous=meeting;meeting=null;previous.dispose();}
        host?.remove();host=null;activeClass=null;
    }
    async function open({url,title,displayName,role,classId,token}) {
        const target=new URL(url);
        if(target.protocol!=='https:' || !/^\/[a-zA-Z0-9_-]{1,200}$/.test(target.pathname))throw Error('Invalid video room. Refresh and try again.');
        close();const version=generation;
        host=document.createElement('section');host.className='embedded-video';host.id='embedded-video';
        const heading=document.createElement('h3');heading.textContent=title;
        const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Loading video room…';
        const actions=document.createElement('div');actions.className='video-actions';
        const leave=document.createElement('button');leave.type='button';leave.className='btn btn-outline-light';leave.textContent='Leave Class';leave.addEventListener('click',close);
        const fallback=document.createElement('button');fallback.type='button';fallback.className='btn btn-success';fallback.textContent='Retry Connection';fallback.addEventListener('click',()=>open({url,title,displayName,role,classId,token}));
        const note=document.createElement('p');note.className='video-help';note.textContent=role==='teacher'?'Check your camera and microphone. Leaving this video does not end the class; use End Class in your dashboard.':'Check your camera and microphone, then join. Your microphone starts muted.';
        const frame=document.createElement('div');frame.className='video-frame';
        actions.append(leave,fallback);host.append(heading,status,actions,note,frame);
        document.getElementById('account-dashboard').prepend(host);host.scrollIntoView({behavior:'smooth',block:'start'});activeClass=Number(classId)||null;
        try {
            const response=await fetch('api/videoAccess.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({class_id:Number(classId),token})});
            const access=await response.json();
            if(!response.ok || !access.success)throw Error(access.message || 'Video access denied.');
            note.textContent=role==='teacher'
                ? (access.private_server ? 'Check your camera and microphone.' : 'Sign in to Jitsi as the host if prompted. Students join as guests using their Yogshala dashboard.')+' Use End Class in your dashboard when the session finishes.'
                : 'No separate video account is needed. Allow camera and microphone, then join as a guest. If asked to wait, your teacher needs to open the room first.';
            if(new URL(access.room_url).href!==target.href || new URL(access.room_url).hostname!==access.server)throw Error('Video room does not match your assigned class.');
            await loadSDK(access.server);if(version!==generation)return;
            meeting=new window.JitsiMeetExternalAPI(access.server,{
                jwt:access.jwt || undefined,roomName:target.pathname.slice(1),parentNode:frame,width:'100%',height:'100%',
                userInfo:{displayName},
                interfaceConfigOverwrite:access.private_server ? {APP_NAME:'Yogshala',NATIVE_APP_NAME:'Yogshala',SHOW_JITSI_WATERMARK:false,SHOW_WATERMARK_FOR_GUESTS:false,SHOW_BRAND_WATERMARK:false,SHOW_POWERED_BY:false} : {},
                configOverwrite:{prejoinConfig:{enabled:true},startWithAudioMuted:role==='student',disableDeepLinking:true,toolbarButtons:['microphone','camera','desktop','chat','raisehand','tileview','settings','fullscreen','hangup']}
            });
            status.textContent='Allow camera and microphone, then join the room.';
            meeting.addListener('videoConferenceJoined',()=>{status.textContent='Connected to your live class.';});
            meeting.addListener('readyToClose',close);
            meeting.addListener('errorOccurred',()=>{status.textContent='Video connection interrupted. Try Retry Connection or rejoin from your dashboard.';});
            const iframe=meeting.getIFrame();iframe.title='Yogshala live video class';
        }catch(error){if(version===generation)status.textContent=error.message;}
    }
    window.YogshalaVideo={open,close,closeIfClass(id){if(activeClass===Number(id))close();}};
    window.addEventListener('pagehide',close);
})();
