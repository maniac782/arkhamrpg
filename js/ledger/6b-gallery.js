/* Arkham Horror RPG Ledger — the campaign's picture gallery, shown at the bottom of the Journal.
   Anyone in the campaign can add pictures (fan art, the table, minis) with an optional caption. People can delete their
   own; the owner and GM can delete any. Pictures go to Cloud Storage; each one is a gallery/<id> document.
   Part of the ledger; these files load in order and share their variables. */
const GAL_MAX=300,GAL_BATCH=10;
let gallery=[];
const gal={pending:[],busy:false,ask:null};
// Started from gmBoot (6-gm.js) once the database is ready.
function galBoot(){
 if(!db||!CAMP)return;
 db.collection('gallery').orderBy('t','desc').limit(GAL_MAX).onSnapshot(qs=>{gallery=[];qs.forEach(d=>gallery.push({...d.data(),id:d.id}));if(active==='journal')render();},()=>{});
}
const galCanDelete=p=>!!camp&&(p.by===authUid||camp.ownerUid===authUid||camp.gmUid===authUid);
const galWho=uid=>((camp&&camp.names)||{})[uid]||'Someone';
function galleryHtml(){
 if(!CAMP)return '';
 let h='<section class="sec" id="gallery"><div class="sec-head"><h2>Gallery</h2><span class="note">Pictures from your games: art, the table, your minis. Everyone in the campaign can add some.</span></div>';
 if(gal.pending.length){
  h+='<div class="galpend">'+gal.pending.map((p,i)=>'<div class="galitem"><img src="'+p.d+'" alt=""><input class="f" data-galcap="'+i+'" maxlength="140" placeholder="Caption (optional)" value="'+esc(p.cap)+'" aria-label="Caption for picture '+(i+1)+'"><button class="btn sm" type="button" data-galact="unpend" data-i="'+i+'"'+(gal.busy?' disabled':'')+'>Remove</button></div>').join('')+'</div>'+
   '<div class="row"><button class="btn pri" data-galact="post"'+(gal.busy?' disabled':'')+'>'+(gal.busy?'Posting…':'Post '+gal.pending.length+' picture'+(gal.pending.length===1?'':'s'))+'</button><button class="btn" data-galact="cancel"'+(gal.busy?' disabled':'')+'>Cancel</button></div>';
 }else if(gallery.length<GAL_MAX){
  h+='<div class="row"><label class="btn" for="galfile" style="cursor:pointer">+ Add pictures</label><input type="file" id="galfile" data-galfile accept="image/*" multiple hidden></div>';
 }else h+='<p class="note" style="margin:0">The gallery is full ('+GAL_MAX+' pictures). Delete some to add more.</p>';
 if(gallery.length){
  h+='<div class="galgrid">'+gallery.map((p,i)=>'<figure class="galitem"><img src="'+esc(p.img)+'" alt="'+esc(p.cap||'Gallery picture')+'" data-gali="'+i+'" loading="lazy">'+
   (p.cap?'<figcaption>'+esc(p.cap)+'</figcaption>':'')+
   '<span class="galby"><span>'+esc(galWho(p.by))+' \u00b7 '+esc(new Date(p.t).toLocaleDateString([], {month:'short',day:'numeric'}))+'</span>'+(galCanDelete(p)&&gal.ask!==p.id?'<button class="galdel" data-galact="del" data-id="'+esc(p.id)+'">Delete</button>':'')+'</span>'+
   (galCanDelete(p)&&gal.ask===p.id?'<span class="galask">Delete this picture? <button class="btn sm dng" data-galact="delyes" data-id="'+esc(p.id)+'">Delete</button><button class="btn sm" data-galact="delno">Cancel</button></span>':'')+'</figure>').join('')+'</div>';
 }else if(!gal.pending.length)h+='<p class="note" style="margin:0">No pictures yet.</p>';
 return h+'</section>';
}
// Shrinks a chosen picture: up to 1600 px on its longest side (900 px in a campaign kept only in this browser).
function galShrink(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{const big=!IS_LOCAL,MAXS=big?1600:900,MAXL=big?700000:150000;let s=Math.min(1,MAXS/Math.max(img.naturalWidth,img.naturalHeight)),q=0.85,d='';
  const cv=document.createElement('canvas');for(let k=0;k<8;k++){cv.width=Math.round(img.naturalWidth*s);cv.height=Math.round(img.naturalHeight*s);const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(img,0,0,cv.width,cv.height);d=cv.toDataURL('image/jpeg',q);if(d.length<=MAXL)break;if(q>0.6)q-=0.08;else s*=0.85;}
  URL.revokeObjectURL(url);res(d);};
 img.onerror=()=>{URL.revokeObjectURL(url);rej();};img.src=url;});}
async function galPick(files){
 files=[...(files||[])].filter(f=>/^image\//.test(f.type));if(!files.length)return toast('Choose image files.');
 const room=Math.min(GAL_BATCH,GAL_MAX-gallery.length);if(files.length>room)toast('Adding the first '+room+' pictures.');
 for(const f of files.slice(0,room)){try{gal.pending.push({d:await galShrink(f),cap:''});}catch(e){toast('Couldn’t read one of those pictures.');}}
 render();
}
async function galPost(){
 if(gal.busy||!gal.pending.length)return;gal.busy=true;render();let n=0;
 try{
  for(const p of gal.pending.slice()){
   const url=await storeImage(p.d,'campaigns/'+CAMP+'/'+authUid);
   if(!IS_LOCAL&&!isStoredImage(url)){toast('Couldn’t upload a picture. Check your connection and try again.');break;}
   const ref=db.collection('gallery').doc();
   await ref.set({id:ref.id,img:url,cap:(p.cap||'').trim().slice(0,140),by:authUid,t:Date.now()});
   gal.pending.shift();n++;
  }
  if(n)toast(n===1?'Picture added.':n+' pictures added.');
 }catch(e){console.warn(e);if(!(window.quotaHit&&quotaHit(e)))toast('Couldn’t add that picture. Try again.');}
 gal.busy=false;render();
}
async function galDelete(id){
 const p=gallery.find(x=>x.id===id);gal.ask=null;if(!p)return render();
 try{await db.doc('gallery/'+id).delete();dropImage(p.img);toast('Picture deleted.');}catch(e){if(!(window.quotaHit&&quotaHit(e)))toast('Couldn’t delete it. Try again.');}
 render();
}
(function(){
 const root=document.getElementById('app');if(!root)return;
 root.addEventListener('click',e=>{
  const im=e.target.closest('img[data-gali]');
  if(im){const i=Number(im.dataset.gali);openLightbox(gallery[i].img,gallery[i].cap,gallery.map(p=>({src:p.img,alt:p.cap||'Gallery picture',cap:(p.cap?p.cap+' — ':'')+galWho(p.by)})),i);return;}
  const b=e.target.closest('[data-galact]');if(!b||b.disabled)return;const a=b.dataset.galact;
  if(a==='post')galPost();
  else if(a==='cancel'){gal.pending=[];render();}
  else if(a==='unpend'){gal.pending.splice(Number(b.dataset.i),1);render();}
  else if(a==='del'){gal.ask=b.dataset.id;render();}
  else if(a==='delno'){gal.ask=null;render();}
  else if(a==='delyes')galDelete(b.dataset.id);
 });
 root.addEventListener('change',e=>{if(e.target.matches&&e.target.matches('[data-galfile]')){const f=e.target.files;galPick(f);e.target.value='';}});
 root.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.galcap!=null){const p=gal.pending[Number(el.dataset.galcap)];if(p)p.cap=el.value;}});
})();
