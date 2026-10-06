/* Arkham Horror RPG Ledger — the picture positioner used for investigator portraits, profile photos and campaign pictures.
   openCropper(file, {title, shape:'circle'|'wide', outW, outH, maxLen, button, onSave(dataUrl), onError(msg)})
   Drag (or arrow keys) to move, wheel / pinch / slider to zoom; saves a JPEG of exactly what's in the frame. */
(function(){
'use strict';
window.openCropper=function(file,o){
 o=o||{};
 const err=m=>{(o.onError||alert)(m);};
 if(!file||!/^image\//.test(file.type))return err('Choose an image file.');
 const url=URL.createObjectURL(file),img=new Image();
 img.onerror=()=>{URL.revokeObjectURL(url);err('Couldn’t read that image. Try a JPG or PNG.');};
 img.onload=()=>{
  const wide=o.shape==='wide',VW=wide?320:260,VH=wide?180:260,PX=2; // view size in CSS px, canvas drawn at 2x
  const OUTW=o.outW||(wide?800:320),OUTH=o.outH||(wide?450:320),MAX=o.maxLen||120000;
  const base=Math.max(VW/img.width,VH/img.height);let zoom=1,ox=0,oy=0;
  const bg=document.createElement('div');bg.className='crop-bg';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-label',o.title||'Position picture');
  bg.innerHTML='<div class="crop'+(wide?' wide':'')+'"><h2>'+(o.title||'Position your picture')+'</h2><canvas class="'+(wide?'rect':'')+'" width="'+VW*PX+'" height="'+VH*PX+'" tabindex="0" aria-label="Drag to move the picture. Arrow keys also move it."></canvas>'+
   '<label class="field" style="width:100%"><span class="lbl">Zoom</span><input type="range" class="crop-zoom" min="1" max="4" step="0.01" value="1"></label>'+
   '<p class="note" style="margin:0;text-align:center">'+(wide?'Drag the picture to choose what shows in the banner.':'Drag the picture to center it in the circle.')+'</p>'+
   '<div class="row" style="justify-content:flex-end;width:100%"><button class="btn" data-c="cancel" type="button">Cancel</button><button class="btn pri" data-c="save" type="button">'+(o.button||'Save picture')+'</button></div></div>';
  document.body.appendChild(bg);
  const cv=bg.querySelector('canvas'),g=cv.getContext('2d'),zr=bg.querySelector('.crop-zoom');
  const clamp=()=>{const sc=base*zoom,mx=Math.max(0,(img.width*sc-VW)/2),my=Math.max(0,(img.height*sc-VH)/2);ox=Math.min(mx,Math.max(-mx,ox));oy=Math.min(my,Math.max(-my,oy));};
  const draw=(ctx,w0,h0)=>{const k=w0/VW,sc=base*zoom*k,w=img.width*sc,h=img.height*sc;ctx.clearRect(0,0,w0,h0);ctx.drawImage(img,w0/2-w/2+ox*k,h0/2-h/2+oy*k,w,h);};
  const paint=()=>{clamp();draw(g,VW*PX,VH*PX);};paint();
  let drag=null;const pts=new Map();
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY,ox,oy,zoom,dist:null};
   if(pts.size===2){const [a,b]=[...pts.values()];drag.dist=Math.hypot(a.x-b.x,a.y-b.y);}});
  cv.addEventListener('pointermove',e=>{if(!drag||!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const scale=VW/cv.getBoundingClientRect().width;
   if(pts.size>=2&&drag.dist){const [a,b]=[...pts.values()];zoom=Math.min(4,Math.max(1,drag.zoom*Math.hypot(a.x-b.x,a.y-b.y)/drag.dist));zr.value=zoom;}
   else{ox=drag.ox+(e.clientX-drag.x)*scale;oy=drag.oy+(e.clientY-drag.y)*scale;}paint();});
  const up=e=>{pts.delete(e.pointerId);if(!pts.size)drag=null;else{const [a]=[...pts.values()];drag={x:a.x,y:a.y,ox,oy,zoom,dist:null};}};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.min(4,Math.max(1,zoom*(e.deltaY<0?1.08:1/1.08)));zr.value=zoom;paint();},{passive:false});
  cv.addEventListener('keydown',e=>{const m={ArrowLeft:[8,0],ArrowRight:[-8,0],ArrowUp:[0,8],ArrowDown:[0,-8]}[e.key];if(m){e.preventDefault();ox+=m[0];oy+=m[1];paint();}});
  zr.addEventListener('input',()=>{zoom=Number(zr.value);paint();});
  const close=()=>{bg.remove();URL.revokeObjectURL(url);document.removeEventListener('keydown',escK);};
  const escK=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',escK);
  bg.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(e.target===bg)return close();if(!b)return;
   if(b.dataset.c==='cancel')return close();
   const out=document.createElement('canvas');out.width=OUTW;out.height=OUTH;const og=out.getContext('2d');og.fillStyle='#ffffff';og.fillRect(0,0,OUTW,OUTH);draw(og,OUTW,OUTH);
   let q=0.82,d=out.toDataURL('image/jpeg',q);while(d.length>MAX&&q>0.4){q-=0.08;d=out.toDataURL('image/jpeg',q);}
   close();if(o.onSave)o.onSave(d);});
  cv.focus();
 };
 img.src=url;
};
})();
