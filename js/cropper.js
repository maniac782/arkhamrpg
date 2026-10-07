/* Arkham Horror RPG Ledger — the picture positioner used for investigator portraits, profile photos and campaign pictures.
   openCropper(file, {title, shape:'circle'|'wide', outW, outH, maxLen, button, full, onSave(dataUrl, fullDataUrl), onError(msg)})
   With full:{side, maxLen}, onSave also gets the whole picture (uncropped, up to that many px on its longest side).
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
  const wide=o.shape==='wide',VW=wide?Math.max(280,Math.min(560,window.innerWidth-80)):260,VH=wide?Math.round(VW*9/16):260,PX=2; // view size in CSS px, canvas drawn at 2x
  const OUTW=o.outW||(wide?800:320),OUTH=o.outH||(wide?450:320),MAX=o.maxLen||120000;
  const base=Math.max(VW/img.width,VH/img.height);let zoom=1,ox=0,oy=0;
  // Banners can zoom out until the whole picture fits; the space around it is filled with a soft, darkened blur of it.
  const MINZ=wide?Math.min(1,Math.min(VW/img.width,VH/img.height)/base):1;
  let soft=null;if(MINZ<1){soft=document.createElement('canvas');const k=24/Math.max(img.width,img.height);soft.width=Math.max(2,Math.round(img.width*k));soft.height=Math.max(2,Math.round(img.height*k));soft.getContext('2d').drawImage(img,0,0,soft.width,soft.height);}
  const bg=document.createElement('div');bg.className='crop-bg';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-label',o.title||'Position picture');
  bg.innerHTML='<div class="crop'+(wide?' wide':'')+'"><h2>'+(o.title||'Position your picture')+'</h2><canvas class="'+(wide?'rect':'')+'" width="'+VW*PX+'" height="'+VH*PX+'"'+(wide?' style="width:'+VW+'px;height:'+VH+'px"':'')+' tabindex="0" aria-label="Drag to move the picture. Arrow keys also move it."></canvas>'+
   '<label class="field" style="width:100%"><span class="lbl">Zoom</span><input type="range" class="crop-zoom" min="'+MINZ+'" max="4" step="0.01" value="1"></label>'+
   (MINZ<1?'<button class="btn sm" type="button" data-c="fit">Show the whole picture</button>':'')+
   '<p class="note" style="margin:0;text-align:center">'+(wide?'Drag the picture to choose what shows in the banner.'+(o.full?' The whole picture is kept too, for viewing full size.':''):'Drag the picture to center the face in the circle.'+(o.full?' The whole picture is kept too, for viewing full size.':''))+'</p>'+
   '<div class="row" style="justify-content:flex-end;width:100%"><button class="btn" data-c="cancel" type="button">Cancel</button><button class="btn pri" data-c="save" type="button">'+(o.button||'Save picture')+'</button></div></div>';
  document.body.appendChild(bg);
  const cv=bg.querySelector('canvas'),g=cv.getContext('2d'),zr=bg.querySelector('.crop-zoom');
  const clamp=()=>{const sc=base*zoom,mx=Math.abs(img.width*sc-VW)/2,my=Math.abs(img.height*sc-VH)/2;ox=Math.min(mx,Math.max(-mx,ox));oy=Math.min(my,Math.max(-my,oy));};
  const draw=(ctx,w0,h0)=>{const k=w0/VW,sc=base*zoom*k,w=img.width*sc,h=img.height*sc;ctx.clearRect(0,0,w0,h0);
   if(soft&&(w<w0-0.5||h<h0-0.5)){const cs=Math.max(w0/soft.width,h0/soft.height);ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(soft,(w0-soft.width*cs)/2,(h0-soft.height*cs)/2,soft.width*cs,soft.height*cs);ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,w0,h0);ctx.restore();}
   ctx.drawImage(img,w0/2-w/2+ox*k,h0/2-h/2+oy*k,w,h);};
  const paint=()=>{clamp();draw(g,VW*PX,VH*PX);};paint();
  let drag=null;const pts=new Map();
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY,ox,oy,zoom,dist:null};
   if(pts.size===2){const [a,b]=[...pts.values()];drag.dist=Math.hypot(a.x-b.x,a.y-b.y);}});
  cv.addEventListener('pointermove',e=>{if(!drag||!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const scale=VW/cv.getBoundingClientRect().width;
   if(pts.size>=2&&drag.dist){const [a,b]=[...pts.values()];zoom=Math.min(4,Math.max(MINZ,drag.zoom*Math.hypot(a.x-b.x,a.y-b.y)/drag.dist));zr.value=zoom;}
   else{ox=drag.ox+(e.clientX-drag.x)*scale;oy=drag.oy+(e.clientY-drag.y)*scale;}paint();});
  const up=e=>{pts.delete(e.pointerId);if(!pts.size)drag=null;else{const [a]=[...pts.values()];drag={x:a.x,y:a.y,ox,oy,zoom,dist:null};}};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.min(4,Math.max(MINZ,zoom*(e.deltaY<0?1.08:1/1.08)));zr.value=zoom;paint();},{passive:false});
  cv.addEventListener('keydown',e=>{const m={ArrowLeft:[8,0],ArrowRight:[-8,0],ArrowUp:[0,8],ArrowDown:[0,-8]}[e.key];if(m){e.preventDefault();ox+=m[0];oy+=m[1];paint();}});
  zr.addEventListener('input',()=>{zoom=Number(zr.value);paint();});
  const close=()=>{bg.remove();URL.revokeObjectURL(url);document.removeEventListener('keydown',escK);};
  const escK=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',escK);
  bg.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(e.target===bg)return close();if(!b)return;
   if(b.dataset.c==='cancel')return close();
   if(b.dataset.c==='fit'){zoom=MINZ;ox=0;oy=0;zr.value=zoom;paint();return;}
   const out=document.createElement('canvas');out.width=OUTW;out.height=OUTH;const og=out.getContext('2d');og.fillStyle='#ffffff';og.fillRect(0,0,OUTW,OUTH);draw(og,OUTW,OUTH);
   let q=0.82,d=out.toDataURL('image/jpeg',q);while(d.length>MAX&&q>0.4){q-=0.08;d=out.toDataURL('image/jpeg',q);}
   let full=null;
   if(o.full){const s=Math.min(1,(o.full.side||2000)/Math.max(img.width,img.height)),fc=document.createElement('canvas');fc.width=Math.round(img.width*s);fc.height=Math.round(img.height*s);
    const fg=fc.getContext('2d');fg.fillStyle='#ffffff';fg.fillRect(0,0,fc.width,fc.height);fg.drawImage(img,0,0,fc.width,fc.height);
    let fq=0.85;full=fc.toDataURL('image/jpeg',fq);while(full.length>(o.full.maxLen||900000)&&fq>0.4){fq-=0.08;full=fc.toDataURL('image/jpeg',fq);}}
   close();if(o.onSave)o.onSave(d,full);});
  cv.focus();
 };
 img.src=url;
};
})();
