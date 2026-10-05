/* Arkham Ledger — a small night scene drawn for campaigns without a picture.
   Everything comes from a seed (the campaign id), so each campaign always gets the same scene:
   sky colour, moon, stars, a New England skyline of gambrel roofs and spires, lit windows,
   fog, and now and then a lighthouse, bare trees or something in the water. */
(function(){
'use strict';
function rng(seedStr){let h=1779033703^seedStr.length;for(let i=0;i<seedStr.length;i++){h=Math.imul(h^seedStr.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
 let a=h>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const PALETTES=[ // sky top, sky bottom, far hills, town, fog, window light, moon
 ['#0b1026','#2b3a67','#1a2342','#070a16','#8fa3c7','#f4c86a','#f3ecd2'], // midnight blue
 ['#120a1f','#4a2b5c','#2a1a3a','#0a0610','#b59ac7','#f2b45c','#efe6d6'], // violet dusk
 ['#06140f','#1f4a3a','#122b22','#030a07','#8fbfa8','#e9d27a','#e8f0dc'], // swamp green
 ['#1a0c0a','#5c2a1f','#2e1712','#0b0504','#c9998a','#ffc66b','#f5dfc8'], // ember red
 ['#0a1418','#2c4c58','#18292f','#04090b','#9db8c2','#f0cf7a','#e9eef0'], // sea fog
 ['#14110a','#4d4228','#29230f','#080703','#c2b48a','#ffd27a','#f2ead0'], // sepia
];
const r2=n=>Math.round(n*10)/10;
function sceneSVG(seed){
 const R=rng(String(seed||'x')),rnd=(a,b)=>a+R()*(b-a),pick=a=>a[Math.floor(R()*a.length)];
 const P=pick(PALETTES),id='s'+Math.floor(R()*1e9).toString(36),W=320,H=180,ground=rnd(128,142);
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">';
 s+='<defs><linearGradient id="'+id+'k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+P[0]+'"/><stop offset="1" stop-color="'+P[1]+'"/></linearGradient>'+
  '<radialGradient id="'+id+'g"><stop offset="0" stop-color="'+P[6]+'" stop-opacity=".55"/><stop offset="1" stop-color="'+P[6]+'" stop-opacity="0"/></radialGradient>'+
  '<linearGradient id="'+id+'f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+P[4]+'" stop-opacity="0"/><stop offset=".6" stop-color="'+P[4]+'" stop-opacity=".22"/><stop offset="1" stop-color="'+P[4]+'" stop-opacity="0"/></linearGradient></defs>';
 s+='<rect width="'+W+'" height="'+H+'" fill="url(#'+id+'k)"/>';
 // stars
 for(let i=0,n=Math.floor(rnd(25,55));i<n;i++)s+='<circle cx="'+r2(rnd(0,W))+'" cy="'+r2(rnd(0,ground-40))+'" r="'+r2(rnd(.3,1.1))+'" fill="#fff" opacity="'+r2(rnd(.25,.85))+'"/>';
 // moon (sometimes a crescent)
 const mx=rnd(30,W-30),my=rnd(22,62),mr=rnd(10,18);
 s+='<circle cx="'+r2(mx)+'" cy="'+r2(my)+'" r="'+r2(mr*3.2)+'" fill="url(#'+id+'g)"/><circle cx="'+r2(mx)+'" cy="'+r2(my)+'" r="'+r2(mr)+'" fill="'+P[6]+'"/>';
 if(R()<.45)s+='<circle cx="'+r2(mx+mr*.55)+'" cy="'+r2(my-mr*.25)+'" r="'+r2(mr*.95)+'" fill="'+P[0]+'" opacity=".92"/>';
 else for(let i=0;i<3;i++)s+='<circle cx="'+r2(mx+rnd(-mr*.5,mr*.5))+'" cy="'+r2(my+rnd(-mr*.5,mr*.5))+'" r="'+r2(rnd(mr*.12,mr*.25))+'" fill="#000" opacity=".08"/>';
 // a few thin clouds across the moon
 for(let i=0,n=Math.floor(rnd(1,4));i<n;i++){const cy=rnd(my-10,my+25),cx=rnd(0,W);s+='<ellipse cx="'+r2(cx)+'" cy="'+r2(cy)+'" rx="'+r2(rnd(40,90))+'" ry="'+r2(rnd(2,4.5))+'" fill="'+P[4]+'" opacity="'+r2(rnd(.12,.25))+'"/>';}
 // far hills
 let hp='M0 '+r2(ground-rnd(18,30));for(let x=0;x<=W;x+=40)hp+=' Q'+r2(x+20)+' '+r2(ground-rnd(22,40))+' '+r2(x+40)+' '+r2(ground-rnd(14,30));
 s+='<path d="'+hp+' L'+W+' '+H+' L0 '+H+'Z" fill="'+P[2]+'"/>';
 // the town: houses with gambrel or gabled roofs, a church spire, chimneys and lit windows
 let x=rnd(-10,4),town='',lights='';const spireAt=rnd(.15,.85)*W,lighthouse=R()<.35,lhX=R()<.5?rnd(8,40):rnd(W-40,W-8);
 let spireDone=false;
 while(x<W+10){
  const w=rnd(18,36),h=rnd(14,30),base=ground+rnd(-2,3),top=base-h;
  if(lighthouse&&Math.abs(x+w/2-lhX)<22){x+=w*.6;continue;}
  if(!spireDone&&x+w>spireAt){ // church
   const cw=rnd(22,30),ch=rnd(22,30),tw=rnd(7,10),tx=x+cw*.25,sh=rnd(40,62);
   town+='<rect x="'+r2(x)+'" y="'+r2(base-ch)+'" width="'+r2(cw)+'" height="'+r2(ch)+'"/>'+
    '<polygon points="'+r2(x-2)+','+r2(base-ch)+' '+r2(x+cw/2)+','+r2(base-ch-10)+' '+r2(x+cw+2)+','+r2(base-ch)+'"/>'+
    '<rect x="'+r2(tx)+'" y="'+r2(base-ch-sh*.45)+'" width="'+r2(tw)+'" height="'+r2(sh*.45)+'"/>'+
    '<polygon points="'+r2(tx-1)+','+r2(base-ch-sh*.45)+' '+r2(tx+tw/2)+','+r2(base-ch-sh)+' '+r2(tx+tw+1)+','+r2(base-ch-sh*.45)+'"/>';
   lights+='<rect x="'+r2(tx+tw/2-1)+'" y="'+r2(base-ch-sh*.35)+'" width="2" height="4" rx="1"/>';
   x+=cw+rnd(2,6);spireDone=true;continue;
  }
  const kind=R();
  town+='<rect x="'+r2(x)+'" y="'+r2(top)+'" width="'+r2(w)+'" height="'+r2(H-top)+'"/>';
  if(kind<.45){ // gambrel
   const k=rnd(5,9),rh=rnd(9,14);
   town+='<polygon points="'+r2(x-1)+','+r2(top)+' '+r2(x+w*.18)+','+r2(top-rh*.6)+' '+r2(x+w/2)+','+r2(top-rh)+' '+r2(x+w*.82)+','+r2(top-rh*.6)+' '+r2(x+w+1)+','+r2(top)+'"/>';
   if(R()<.5)town+='<rect x="'+r2(x+w*.3)+'" y="'+r2(top-rh*.75)+'" width="'+r2(k)+'" height="'+r2(k*.7)+'"/>';
  }else if(kind<.85){ // gable
   const rh=rnd(8,15);town+='<polygon points="'+r2(x-1)+','+r2(top)+' '+r2(x+w/2)+','+r2(top-rh)+' '+r2(x+w+1)+','+r2(top)+'"/>';
  } // else flat roof
  if(R()<.6)town+='<rect x="'+r2(x+rnd(w*.15,w*.75))+'" y="'+r2(top-rnd(9,15))+'" width="3" height="'+r2(rnd(8,12))+'"/>';
  for(let i=0,n=Math.floor(rnd(0,3.2));i<n;i++)lights+='<rect x="'+r2(x+rnd(3,w-6))+'" y="'+r2(rnd(top+3,base-6))+'" width="'+r2(rnd(2.2,3.4))+'" height="'+r2(rnd(2.8,4))+'"/>';
  x+=w+rnd(-3,3);
 }
 if(lighthouse){const b=ground+2,lh=rnd(46,62);
  town+='<polygon points="'+r2(lhX-6)+','+r2(b)+' '+r2(lhX-3.5)+','+r2(b-lh)+' '+r2(lhX+3.5)+','+r2(b-lh)+' '+r2(lhX+6)+','+r2(b)+'"/><rect x="'+r2(lhX-4.5)+'" y="'+r2(b-lh-7)+'" width="9" height="7"/><polygon points="'+r2(lhX-5.5)+','+r2(b-lh-7)+' '+r2(lhX)+','+r2(b-lh-13)+' '+r2(lhX+5.5)+','+r2(b-lh-7)+'"/>';
  const dir=lhX<W/2?1:-1;s+='<polygon points="'+r2(lhX)+','+r2(b-lh-4)+' '+r2(lhX+dir*140)+','+r2(b-lh-26)+' '+r2(lhX+dir*140)+','+r2(b-lh+14)+'" fill="'+P[5]+'" opacity=".12"/>';
  lights+='<rect x="'+r2(lhX-3)+'" y="'+r2(b-lh-6)+'" width="6" height="5"/>';}
 s+='<g fill="'+P[3]+'">'+town+'</g><g fill="'+P[5]+'" opacity=".85">'+lights+'</g>';
 // foreground: water with reflections, or a bare field with crooked trees
 if(R()<.5){
  s+='<rect y="'+r2(ground+4)+'" width="'+W+'" height="'+r2(H-ground)+'" fill="'+P[3]+'"/>';
  for(let i=0;i<14;i++)s+='<rect x="'+r2(rnd(0,W))+'" y="'+r2(rnd(ground+8,H-4))+'" width="'+r2(rnd(10,40))+'" height=".8" fill="'+P[6]+'" opacity="'+r2(rnd(.06,.18))+'"/>';
  for(let y=ground+9;y<H-3;y+=rnd(3,6)){const w=rnd(4,14)*(1-(y-ground)/(H-ground)*.5);s+='<rect x="'+r2(mx-w/2+rnd(-3,3))+'" y="'+r2(y)+'" width="'+r2(w)+'" height=".9" fill="'+P[6]+'" opacity="'+r2(rnd(.15,.35))+'"/>';}
  if(R()<.4){const tx=rnd(40,W-40),ty=ground+rnd(18,30),d=R()<.5?1:-1; // something stirs in the water
   s+='<path d="M'+r2(tx)+' '+r2(ty)+' C'+r2(tx+d*4)+' '+r2(ty-14)+' '+r2(tx-d*10)+' '+r2(ty-20)+' '+r2(tx-d*2)+' '+r2(ty-30)+' C'+r2(tx+d*4)+' '+r2(ty-36)+' '+r2(tx+d*9)+' '+r2(ty-30)+' '+r2(tx+d*6)+' '+r2(ty-27)+' C'+r2(tx+d*2)+' '+r2(ty-25)+' '+r2(tx+d*3)+' '+r2(ty-14)+' '+r2(tx+d*8)+' '+r2(ty)+'Z" fill="'+P[3]+'" stroke="'+P[2]+'" stroke-width=".6"/>';}
 }else{
  s+='<path d="M0 '+r2(ground+4)+' Q'+r2(W*.3)+' '+r2(ground)+' '+r2(W*.6)+' '+r2(ground+6)+' T'+W+' '+r2(ground+3)+' L'+W+' '+H+' L0 '+H+'Z" fill="'+P[3]+'"/>';
  for(let i=0,n=Math.floor(rnd(1,3));i<n;i++){const tx=R()<.5?rnd(6,70):rnd(W-70,W-6),ty=ground+rnd(8,20),th=rnd(30,48);
   let t='M'+r2(tx)+' '+r2(ty)+' L'+r2(tx+rnd(-2,2))+' '+r2(ty-th);
   for(let j=0;j<5;j++){const by=ty-th*rnd(.45,.95),bx=tx+rnd(-1,1),l=rnd(8,18)*(R()<.5?-1:1);t+=' M'+r2(bx)+' '+r2(by)+' l'+r2(l)+' '+r2(-rnd(4,12))+' l'+r2(l*.3)+' '+r2(-rnd(2,6));}
   s+='<path d="'+t+'" stroke="'+P[3]+'" stroke-width="2" stroke-linecap="round" fill="none"/>';}
 }
 // low fog over everything
 s+='<rect y="'+r2(ground-30)+'" width="'+W+'" height="60" fill="url(#'+id+'f)"/>';
 for(let i=0;i<3;i++)s+='<ellipse cx="'+r2(rnd(0,W))+'" cy="'+r2(ground+rnd(-6,10))+'" rx="'+r2(rnd(60,120))+'" ry="'+r2(rnd(4,8))+'" fill="'+P[4]+'" opacity="'+r2(rnd(.08,.16))+'"/>';
 return s+'</svg>';
}
window.campaignScene=sceneSVG;
})();
