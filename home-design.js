'use strict';
document.addEventListener('DOMContentLoaded',()=>{
    const element=document.getElementById('carouselExampleInterval');
    if(!element || !window.bootstrap?.Carousel) return;
    const priority=['51','26','09'];
    const album=Array.isArray(window.yogshalaAlbum) ? [...window.yogshalaAlbum] : [];
    album.sort((a,b)=>{
        const left=priority.indexOf(a.id),right=priority.indexOf(b.id);
        return (left<0?priority.length:left)-(right<0?priority.length:right) || Number(a.id)-Number(b.id);
    });
    if(album.length){
        const slides=album.map((photo,index)=>{
            const slide=document.createElement('div');
            slide.className='carousel-item'+(index===0?' active':'');
            slide.setAttribute('role','group');
            slide.setAttribute('aria-roledescription','slide');
            slide.setAttribute('aria-label',(index+1)+' of '+album.length);
            const frame=document.createElement('div');frame.className='brand-photo-frame';
            const content=window.yogshalaPhotoContent?.get(photo);
            if(photo.height>photo.width){
                frame.classList.add('is-portrait');
                const backdrop=document.createElement('img');
                backdrop.className='home-photo-backdrop';backdrop.src=photo.thumb;
                backdrop.alt='';backdrop.setAttribute('aria-hidden','true');
                backdrop.loading=index===0?'eager':'lazy';backdrop.decoding='async';
                frame.append(backdrop);
                const panel=document.createElement('div');panel.className='home-portrait-panel';
                const symbol=document.createElement('i');symbol.className='fa-solid '+(content?.icon || 'fa-spa');symbol.setAttribute('aria-hidden','true');
                const brand=document.createElement('span');brand.className='home-portrait-brand';brand.textContent='YOGSHALA';
                const caption=document.createElement('p');caption.className='home-portrait-caption';caption.textContent=content?.note || 'Our studio. Our community.';
                const category=document.createElement('span');category.className='home-portrait-category';category.textContent=photo.category;
                const number=document.createElement('span');number.className='home-portrait-number';number.textContent='PHOTO '+String(index+1).padStart(2,'0')+' / '+album.length;
                panel.append(symbol,brand,caption,category,number);frame.append(panel);
            }
            const img=document.createElement('img');
            img.className='home-photo-main';
            img.src=index===0?photo.full:photo.thumb;
            img.dataset.full=photo.full;
            img.alt=content?.alt || 'Yogshala '+photo.category.toLowerCase()+' — photo '+photo.id;
            img.width=photo.width;img.height=photo.height;
            img.loading=index===0?'eager':'lazy';img.decoding='async';
            if(index===0)img.fetchPriority='high';
            frame.append(img);slide.append(frame);return slide;
        });
        element.querySelector('.carousel-inner').replaceChildren(...slides);
        document.getElementById('home-album-total').textContent=String(album.length);
        element.querySelector('.home-album-counter-label').textContent=album[0].category;
        function warm(index){
            const img=slides[(index+slides.length)%slides.length].querySelector('.home-photo-main');
            img.loading='eager';
            if(img.dataset.full){img.src=img.dataset.full;delete img.dataset.full;}
        }
        const layout=element.closest('.brand-album-layout');
        const copy=layout.querySelector('.brand-slide-copy');
        const note=layout.querySelector('.brand-photo-note');
        function updateContent(index,animate){
            const content=window.yogshalaPhotoContent?.get(album[index]);
            if(!content)return;
            copy.querySelector('.home-eyebrow').replaceChildren(Object.assign(document.createElement('span'),{ariaHidden:'true'}),document.createTextNode(' '+content.label));
            const accent=document.createElement('span');accent.textContent=content.accent;
            copy.querySelector('.brand-headline').replaceChildren(document.createTextNode(content.title),document.createElement('br'),accent);
            copy.querySelector('.brand-description').textContent=content.description;
            const action=copy.querySelector('.home-button-primary');
            action.href=content.href;
            const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
            action.replaceChildren(document.createTextNode(content.action+' '),arrow);
            const badge=document.createElement('span'),icon=document.createElement('i');
            icon.className='fa-solid '+content.icon;icon.setAttribute('aria-hidden','true');badge.append(icon);
            note.replaceChildren(badge,document.createTextNode(content.note));
            if(animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
                copy.animate([{opacity:.3,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'});
            }
        }
        updateContent(0,false);
        warm(0);warm(1);
        element.addEventListener('slide.bs.carousel',event=>{warm(event.to);warm(event.to+1);updateContent(event.to,true);});
        element.addEventListener('slid.bs.carousel',event=>{
            document.getElementById('home-album-current').textContent=String(event.to+1).padStart(2,'0');
            element.querySelector('.home-album-counter-label').textContent=album[event.to].category;
        });
    }
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const carousel=bootstrap.Carousel.getOrCreateInstance(element,{interval:4000,ride:false,pause:false,touch:true,wrap:true});
    const button=element.querySelector('.home-carousel-pause');
    let playing=!motion.matches;
    let focusPaused=false;
    function sync(){
        const running=playing && !focusPaused && !document.hidden;
        running ? carousel.cycle() : carousel.pause();
        element.classList.toggle('is-playing',running);
    }
    function update(){
        button.setAttribute('aria-label',playing ? 'Pause slideshow' : 'Play slideshow');
        button.querySelector('i').className=playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    }
    button.hidden=false;
    button.addEventListener('click',()=>{playing=!playing;sync();update();});
    // Pause while someone uses a slide's enquiry links; navigation keeps cycling.
    const focusArea=element.closest('.brand-album-layout') || element;
    focusArea.addEventListener('focusin',event=>{focusPaused=!!event.target.closest('.brand-slide-copy');sync();});
    focusArea.addEventListener('focusout',()=>{queueMicrotask(()=>{focusPaused=!!focusArea.querySelector('.brand-slide-copy:focus-within');sync();});});
    element.addEventListener('slide.bs.carousel',()=>element.classList.remove('is-playing'));
    element.addEventListener('slid.bs.carousel',()=>sync());
    document.addEventListener('visibilitychange',sync);
    motion.addEventListener('change',event=>{if(event.matches){playing=false;sync();update();}});
    update();
    sync(); // Bootstrap 5.0 needs an explicit cycle() for programmatic startup.
});
