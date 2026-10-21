'use strict';
(() => {
 const photos = window.yogshalaAlbum || [];
 const grid = document.getElementById('album-grid');
 const more = document.getElementById('album-load-more');
 const count = document.getElementById('album-count');
 const viewer = document.getElementById('album-viewer');
 const image = document.getElementById('viewer-image');
 let filtered = photos, visible = 24, current = 0, opener;
 function render() {
  grid.replaceChildren();
  let previousCategory = '';
  filtered.slice(0,visible).forEach((photo,index) => {
   if (photo.category !== previousCategory) {
    const heading = document.createElement('div'); heading.className = 'album-category-heading';
    const title = document.createElement('h2'); title.textContent = photo.category;
    const total = document.createElement('span'); total.textContent = `${filtered.filter(p => p.category === photo.category).length} photographs`;
    heading.append(title, total); grid.append(heading); previousCategory = photo.category;
   }
   const frame = document.createElement('figure'); frame.className = 'album-frame';
   const button = document.createElement('button'); button.type = 'button'; button.className = 'album-photo'; button.setAttribute('aria-label',`Open photograph ${photo.id}: ${photo.category}`);
   const img = document.createElement('img'); img.src = photo.thumb; img.alt = `Yogshala Jaipur — ${photo.category.toLowerCase()}, photograph ${photo.id}`; img.width = photo.width; img.height = photo.height; img.loading = 'lazy'; img.decoding = 'async';
   const icon = document.createElement('span'); icon.className = 'album-open'; icon.textContent = '↗'; icon.setAttribute('aria-hidden','true'); button.append(img,icon);
   button.addEventListener('click',()=>{opener=button;current=index;showPhoto();viewer.showModal();});
   const caption = document.createElement('figcaption'); const number = document.createElement('span'); number.className='album-number';number.textContent=photo.id;
   const label = document.createElement('span');label.className='album-label';label.textContent=photo.category;const small=document.createElement('small');small.textContent='Yogshala Jaipur';label.append(small);caption.append(number,label);frame.append(button,caption);grid.append(frame);
  });
  count.textContent = `${Math.min(visible,filtered.length)} of ${filtered.length} photographs`;
  more.hidden=visible>=filtered.length;
 }
 document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filtered=button.dataset.category==='All photos'?photos:photos.filter(p=>p.category===button.dataset.category);visible=24;render();}));
 more.addEventListener('click',()=>{const firstNew=visible;visible+=24;render();grid.querySelectorAll('.album-photo')[firstNew]?.focus({preventScroll:true});});
 function showPhoto(){const p=filtered[current];image.src=p.full;image.alt=`Yogshala Jaipur — ${p.category.toLowerCase()}, photograph ${p.id}`;document.getElementById('viewer-count').textContent=`${current+1} / ${filtered.length}`;document.getElementById('viewer-caption').textContent=`${p.id} · ${p.category} · Yogshala Jaipur`;}
 function step(delta){current=(current+delta+filtered.length)%filtered.length;showPhoto();}
 document.getElementById('viewer-prev').addEventListener('click',()=>step(-1));document.getElementById('viewer-next').addEventListener('click',()=>step(1));document.getElementById('viewer-close').addEventListener('click',()=>viewer.close());
 viewer.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}if(event.key==='ArrowRight'){event.preventDefault();step(1);}});
 viewer.addEventListener('close',()=>opener?.focus({preventScroll:true}));
 viewer.addEventListener('click',event=>{if(event.target===viewer){const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)viewer.close();}});
 render();
 const requestedPhoto = new URLSearchParams(window.location.search).get('photo');
 const requestedIndex = photos.findIndex(photo => photo.id === requestedPhoto);
 if (requestedIndex !== -1) {
  current = requestedIndex;
  visible = Math.max(24, Math.ceil((current + 1) / 24) * 24);
  render();
  opener = grid.querySelectorAll('.album-photo')[current];
  showPhoto();
  viewer.showModal();
 }
})();
