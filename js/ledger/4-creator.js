/* Arkham Horror RPG Ledger — The New investigator page (step-by-step character creator).
   Part of the ledger; these files load in order and share their variables. */
// ---------- creator ----------
const A=window.APL;
// Drafts are kept per campaign, so one campaign (or the original site) never leaks into another.
const CR_KEY='apl-creator-v1'+(CAMP?'-'+CAMP:'');
function crBlank(){return {name:'',player:'',trait:'',archetype:'',five:[],four:'',bonus:'',freeKnack:'',ups:{},bought:[],cart:[],bg:{origin:'',family:'',employment:'',salary:'',encounter:'',enemies:''},cat:'Weapons',slot:'',confirm:false};}
let cr=crBlank();
// an unfinished character is kept as a draft on this device until it joins the party or is reset
let crRestored=false;
try{const t=JSON.parse(localStorage.getItem(CR_KEY)||'null');
 // a draft older than two weeks is dropped rather than resumed
 if(t&&(!t.savedAt||Date.now()-t.savedAt<14*86400000)){cr=Object.assign(crBlank(),t);crRestored=true;}else if(t)localStorage.removeItem(CR_KEY);}catch(e){}
function crSave(){cr.savedAt=Date.now();try{localStorage.setItem(CR_KEY,JSON.stringify(cr));}catch(e){}}
function crDone(){cr=crBlank();crRestored=false;try{localStorage.removeItem(CR_KEY);}catch(e){}}
function crSkill(k){let r=6;if(cr.five.includes(k))r=5;if(cr.four===k)r=4;return r;}
function crUpCost(k){let r=crSkill(k),cost=0;for(let i=0;i<(cr.ups[k]||0);i++){cost+=SKILL_COST[r];r--;}return cost;}
function crRating(k){return crSkill(k)-(cr.ups[k]||0);}
function crFloor(k){return cr.archetype?A.maxFor(cr.archetype,k):4;}
function crXpBudget(){return cr.bonus==='xp'?5:0;}
function crKnackCost(){return cr.bought.reduce((s,n)=>{const k=A.knacksFor(cr.archetype).find(x=>x.name===n);return s+(k?KNACK_COST[k.tier]:0);},0);}
function crXpSpent(){return SKILLS.reduce((s,[k])=>s+crUpCost(k),0)+crKnackCost();}
function crMoneyBudget(){return 50+(cr.bonus==='money'?100:0);}
function crCost(it){return it.type==='reload'?it.c:it.c;}
function crMoneySpent(){return Math.round(cr.cart.reduce((s,it)=>s+it.c,0)*100)/100;}
function crKnackList(){const all=[];if(cr.freeKnack)all.push(cr.freeKnack);return all.concat(cr.bought);}
function crTierCount(t){return crKnackList().filter(n=>{const k=A.knacksFor(cr.archetype).find(x=>x.name===n);return k&&k.tier===t;}).length;}
function crChecks(){
 const c=[];
 c.push([!!cr.name.trim(),'Name the investigator']);
 c.push([!!cr.trait,'Choose a personality trait']);
 c.push([!!cr.archetype,'Choose an archetype']);
 c.push([cr.five.length===3,'Raise three skills to 5+ ('+cr.five.length+' of 3)']);
 c.push([!!cr.four,'Raise one skill to 4+']);
 c.push([!!cr.bonus,'Pick an extra advancement']);
 c.push([!!cr.freeKnack,'Choose the free tier 1 knack']);
 c.push([crXpSpent()<=crXpBudget(),'Stay within your XP']);
 c.push([crMoneySpent()<=crMoneyBudget(),'Stay within your gear budget']);
 return c;
}
function crBuild(){
 const skills={};SKILLS.forEach(([k])=>{const f=crFloor(k);skills[k]={r:crRating(k),max:f<4?String(f):''};});
 const t=A.TRAITS[cr.trait]||['',''];
 const kn=A.knacksFor(cr.archetype);
 const knacks=crKnackList().map(n=>{const k=kn.find(x=>x.name===n);return {id:uid(),tier:k?k.tier:1,name:n,text:A.knackText(n)};});
 const weapons=[],items=[],vehicles=[];let reloads=0,habitual={name:'',used:false,uses:0};
 cr.cart.forEach(it=>{
  if(it.type==='w'){const w=W().find(x=>x.n===it.n);if(w)weapons.push({id:uid(),name:w.n,skill:w.s,range:w.r,dmg:w.d,inj:w.i,ammoMax:w.a,ammo:w.a,reloads:0,rc:w.rc,fr:!!w.fr,special:w.sp});}
  else if(it.type==='reload'){const g=weapons.find(x=>x.name===it.n);if(g)g.reloads++;else reloads++;}
  else if(it.n==='Habitual Item')habitual={name:'Habitual item',used:false,uses:habitual.uses+1};
  else{const g=GR().find(x=>x.n===it.n);if(g&&g.cat==='Transport'){vehicles.push(it.n);return;}items.push({id:uid(),name:it.n,note:g?g.note:''});}
 });
 const xp=crXpBudget();
 const b=blank(1);
 return Object.assign(b,{name:cr.name.trim(),player:cr.player,archetype:cr.archetype,personality:cr.trait,positive:t[0],negative:t[1],
  xpTotal:xp,xpUnused:xp-crXpSpent(),skills,insightLimit:cr.bonus==='insight'?2:1,insight:cr.bonus==='insight'?2:1,
  knacks,weapons,items,reloads,habitual,money:Math.round((crMoneyBudget()-crMoneySpent())*100)/100,
  bg:Object.assign(b.bg,cr.bg,vehicles.length?{vehicle:[cr.bg.vehicle,...vehicles].filter(Boolean).join(', ')}:{}),log:[{t:Date.now(),m:'Created in the ledger'}]});
}
function renderCreator(){
 const kn=A.knacksFor(cr.archetype);const arch=A.ARCH[cr.archetype];
 const xpB=crXpBudget(),xpS=crXpSpent(),mB=crMoneyBudget(),mS=crMoneySpent();
 const cf=(p,l,v,ph)=>'<label class="field"><span class="lbl">'+l+'</span><input class="f" id="cr-'+p.replace('.','-')+'" data-cf="'+p+'" value="'+esc(v)+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'></label>';
 const sname=k=>SKILLS.find(x=>x[0]===k)[1];
 let h='<div class="banner">Build a new investigator step by step, following the corebook’s character creation. Costs come off the gear budget and XP as you choose. When it’s done, put them in a party slot or open a sheet to print.</div>';
 if(crRestored&&(cr.name||cr.archetype))h+='<div class="roll" role="status"><span>Picking up your unfinished investigator'+(cr.name?' <b>'+esc(cr.name)+'</b>':'')+(cr.savedAt?' from '+new Date(cr.savedAt).toLocaleDateString([], {month:'short',day:'numeric'}):'')+'.</span><div class="row"><button class="btn sm" data-cact="reset">Start over</button></div></div>';
 // 1
 h+='<section class="sec"><h2>1 · Background</h2><div class="grid2">'+cf('name','Investigator name',cr.name)+cf('player','Player',cr.player)+cf('bg.origin','Place of origin',cr.bg.origin)+cf('bg.family','Family & friends',cr.bg.family)+cf('bg.employment','Employment',cr.bg.employment)+cf('bg.salary','Weekly salary',cr.bg.salary)+cf('bg.encounter','First supernatural encounter',cr.bg.encounter)+cf('bg.enemies','Notable enemies',cr.bg.enemies)+'</div></section>';
 // 2
 const tr=A.TRAITS[cr.trait];
 h+='<section class="sec"><h2>2 · Personality trait</h2><label class="field"><span class="lbl">Trait</span><select class="f" id="cr-trait" data-cf="trait"><option value="">Choose…</option>'+Object.keys(A.TRAITS).map(t=>'<option'+(t===cr.trait?' selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
 (tr?'<div class="grid2"><div><span class="lbl">Positive</span><p style="margin:4px 0 0">'+esc(tr[0])+'</p></div><div><span class="lbl">Negative (when triggered)</span><p style="margin:4px 0 0">'+esc(tr[1])+'</p></div></div>':'')+'</section>';
 // 3
 h+='<section class="sec"><h2>3 · Archetype</h2><label class="field"><span class="lbl">Archetype</span><select class="f" id="cr-arch" data-cf="archetype"><option value="">Choose…</option>'+ARCH.map(a=>'<option'+(a===cr.archetype?' selected':'')+'>'+a+'</option>').join('')+'</select></label>'+
 (arch?'<p class="note" style="margin:0">Can improve '+arch.three.map(sname).join(', ')+' up to 3+, and '+sname(arch.two)+' up to 2+. Everything else stops at 4+.</p>':'')+'</section>';
 // 4
 h+='<section class="sec"><div class="sec-head"><h2>4 · Starting skills</h2><span class="note">All skills start at 6+. Raise three to 5+ and one to 4+ for free.'+(xpB?' <b>XP left: '+(xpB-crXpSpent())+' of '+xpB+'</b>':'')+'</span></div><div class="skills">'+
 SKILLS.map(([k,n])=>{const r=crRating(k),up=cr.ups[k]||0,f=crFloor(k),next=SKILL_COST[r];
  return '<div class="skill"><span class="nm">'+n+(f<4?' <span class="tier">max '+f+'+</span>':'')+'</span>'+
  '<button class="btn sm" data-cact="five" data-k="'+k+'" aria-pressed="'+cr.five.includes(k)+'" style="'+(cr.five.includes(k)?'background:var(--ink);color:var(--surface)':'')+'">5+</button>'+
  '<button class="btn sm" data-cact="four" data-k="'+k+'" aria-pressed="'+(cr.four===k)+'" style="'+(cr.four===k?'background:var(--ink);color:var(--surface)':'')+'">4+</button>'+
  '<span class="rate">'+r+'+</span>'+
  (xpB?'<span class="stepper"><button class="btn sm icon" data-cact="down" data-k="'+k+'" '+(up?'':'disabled')+' aria-label="Undo improvement">−</button><button class="btn sm" data-cact="up" data-k="'+k+'" '+(next&&r-1>=f?'':'disabled')+'>'+(next&&r-1>=f?'↑ '+next+' XP':'Max')+'</button></span>':'')+'</div>';}).join('')+'</div></section>';
 // 5
 const opt=(v,l,d)=>'<label class="item" style="cursor:pointer" for="cr-b-'+v+'"><input type="radio" name="crbonus" id="cr-b-'+v+'" data-cbonus="'+v+'"'+(cr.bonus===v?' checked':'')+'><div class="grow"><b>'+l+'</b><span class="effect">'+d+'</span></div></label>';
 h+='<section class="sec"><h2>5 · Extra advancement</h2><div class="list">'+opt('money','An extra $100 of gear','Gear budget becomes $150. Unspent money is kept as cash.')+opt('xp','5 experience points','Spend on skills or knacks now, or save it.')+opt('insight','Insight limit of 2','Instead of the usual 1.')+'</div></section>';
 // 6
 h+='<section class="sec"><div class="sec-head"><h2>6 · Knacks</h2>'+(cr.archetype?'<span class="note">★ = unique to the '+esc(cr.archetype)+'</span>':'')+(xpB?'<span class="chip">'+(xpB-crXpSpent())+' of '+xpB+' XP left</span>':'')+'</div>';
 if(!cr.archetype)h+='<p class="note" style="margin:0">Choose an archetype to see its knacks.</p>';
 else{
  h+='<label class="field"><span class="lbl">Free tier 1 knack</span><select class="f" id="cr-free" data-cf="freeKnack"><option value="">Choose…</option>'+kn.filter(k=>k.tier===1).map(k=>'<option value="'+esc(k.name)+'"'+(k.name===cr.freeKnack?' selected':'')+'>'+(k.unique?'★ ':'')+esc(k.name)+'</option>').join('')+'</select></label>'+(cr.freeKnack&&A.knackText(cr.freeKnack)?'<p class="note" style="margin:0">'+esc(A.knackText(cr.freeKnack))+'</p>':'')+'';
  if(xpB){
   const owned=crKnackList();
   h+='<div class="row"><label class="field" style="flex:1;min-width:200px"><span class="lbl">Buy another knack with XP</span><select class="f" id="cr-kbuy" data-kpick="cr"><option value="">Add a knack…</option>'+[1,2,3,4].map(t=>'<optgroup label="Tier '+t+' · '+KNACK_COST[t]+' XP">'+kn.filter(k=>k.tier===t&&!owned.includes(k.name)).map(k=>'<option value="'+esc(k.name)+'"'+(kpickSel.cr===k.name?' selected':'')+'>'+(k.unique?'★ ':'')+esc(k.name)+'</option>').join('')+'</optgroup>').join('')+'</select></label><button class="btn" data-cact="kbuy">Buy</button></div>';
   if(cr.bought.length)h+='<div class="list">'+cr.bought.map(n=>{const k=kn.find(x=>x.name===n);return '<div class="item"><span class="tier">T'+(k?k.tier:'?')+'</span><div class="grow"><b>'+esc(n)+'</b>'+(k&&k.text?'<span class="effect">'+esc(k.text)+'</span>':'')+'</div><span class="num note">'+(k?KNACK_COST[k.tier]:0)+' XP</span><button class="btn sm icon" data-cact="kdel" data-n="'+esc(n)+'" aria-label="Remove">×</button></div>';}).join('')+'</div>';
  }
  h+='<p class="note" style="margin:0">Only knacks on the '+esc(cr.archetype)+' table can be taken. Effects are filled in for you as short summaries of the book’s rules.</p>';
 }
 h+='</section>';
 // 7
 const cats=['Weapons','Protection','Useful items','Tools and personal','Outdoors','Transport'];
 const left=mB-mS;
 h+='<section class="sec"><div class="sec-head"><h2>7 · Equipment</h2><span class="num" style="font-weight:600;color:'+(left<0?'var(--danger)':'var(--ink)')+'">'+money(left)+' left of '+money(mB)+'</span></div>'+
 '<div class="tabs" role="tablist">'+cats.map(c=>'<button class="tab" role="tab" data-cact="cat" data-n="'+c+'" aria-selected="'+(cr.cat===c)+'">'+c+'</button>').join('')+'</div><div class="list" style="max-height:420px;overflow:auto">';
 if(cr.cat==='Weapons')h+=W().map((w,i)=>'<div class="item"><div class="grow"><b>'+esc(w.n)+(w.house?' <span class="tier">House</span>':'')+'</b><span class="effect">'+esc(w.s.replace(' Combat',''))+' · dmg '+w.d+' · injury '+w.i+' · '+esc(w.r)+(w.a?' · ammo '+w.a:'')+' · '+esc(w.sp)+'</span></div><span class="num">'+money(w.c)+'</span><button class="btn sm" data-cact="addw" data-n="'+i+'">Add</button></div>').join('');
 else h+=GR().map((g,i)=>g.cat===cr.cat?'<div class="item"><div class="grow"><b>'+esc(g.n)+(g.house?' <span class="tier">House</span>':'')+'</b>'+(g.note?'<span class="effect">'+esc(g.note)+'</span>':'')+'</div><span class="num">'+money(g.c)+'</span><button class="btn sm" data-cact="addg" data-n="'+i+'">Add</button></div>':'').join('');
 h+='</div><span class="lbl">Bought</span><div class="list">'+(cr.cart.length?cr.cart.map((it,i)=>{const w=it.type==='w'&&W().find(x=>x.n===it.n);return '<div class="item"><div class="grow"><b>'+esc(it.type==='reload'?'Extra reload — '+it.n:it.n)+'</b></div><span class="num">'+money(it.c)+'</span>'+(w&&w.rc?'<button class="btn sm" data-cact="addr" data-n="'+i+'">+ reload '+money(w.rc)+'</button>':'')+'<button class="btn sm icon" data-cact="rm" data-n="'+i+'" aria-label="Remove">×</button></div>';}).join(''):'<p class="note">Nothing yet.</p>')+'</div></section>';
 // 8
 const checks=crChecks();const ok=checks.every(x=>x[0]);
 h+='<section class="sec"><h2>8 · Finish</h2><div class="row"><div class="stat"><span class="lbl">XP left</span><b class="num">'+(xpB-xpS)+'</b></div><div class="stat"><span class="lbl">Cash left</span><b class="num">'+money(left)+'</b></div><div class="stat"><span class="lbl">Insight limit</span><b class="num">'+(cr.bonus==='insight'?2:1)+'</b></div></div>'+
 '<div class="list">'+checks.map(([g,l])=>'<div class="item" style="padding:6px 0"><span class="chip '+(g?'ok':'warn')+'">'+(g?'Done':'To do')+'</span><span>'+esc(l)+'</span></div>').join('')+'</div>'+
 '<div class="row"><label class="field" style="min-width:200px"><span class="lbl">Put them in the party</span><select class="f" id="cr-slot" data-cf="slot"><option value="">Choose…</option>'+(SLOTS.length<MAX_SLOTS&&canAddSheet()?'<option value="new"'+(cr.slot==='new'?' selected':'')+'>A new spot in the party</option>':'')+''+SLOTS.filter(canEdit).map((s,i)=>'<option value="'+s+'"'+(cr.slot===s?' selected':'')+'>Replace '+esc(chars[s].name)+'</option>').join('')+'</select></label></div>'+
 (cr.slot&&cr.slot!=='new'?'<label class="row note" for="cr-confirm"><input type="checkbox" id="cr-confirm" data-cconfirm="1"'+(cr.confirm?' checked':'')+'> Replace '+esc(chars[cr.slot].name)+'’s sheet with this one</label>':'')+
 '<div class="row"><button class="btn pri" data-cact="place" '+(ok&&cr.slot&&(cr.slot==='new'||cr.confirm)?'':'disabled')+'>Add to party</button><button class="btn" data-cact="print" '+(ok?'':'disabled')+'>Open printable sheet</button><button class="btn dng" data-cact="reset">Start over</button></div></section>';
 return h;
}
function creatorClick(b){
 const a=b.dataset.cact,k=b.dataset.k,n=b.dataset.n;
 switch(a){
  case 'five':case 'four':{
   if(a==='five'&&!cr.five.includes(k)&&cr.five.length>=3)return toast('Only three skills start at 5+. Tap one to unselect it first.');
   const touched=[k];if(a==='four'&&cr.four&&cr.four!==k)touched.push(cr.four);
   let refund=0;touched.forEach(x=>{if(cr.ups[x])refund+=crUpCost(x);});
   if(a==='five'){if(cr.five.includes(k))cr.five=cr.five.filter(x=>x!==k);else{if(cr.four===k)cr.four='';cr.five=[...cr.five,k];}}
   else{cr.four=cr.four===k?'':k;cr.five=cr.five.filter(x=>x!==k);}
   const ups={...cr.ups};touched.forEach(x=>delete ups[x]);cr.ups=ups;
   if(refund)toast('Refunded '+refund+' XP from that skill\u2019s XP improvements. Buy them again if you still want them.');
   break;}
  case 'up':{const r=crRating(k),cost=SKILL_COST[r];if(!cost||r-1<crFloor(k))return;if(crXpSpent()+cost>crXpBudget())return toast('Not enough XP. That costs '+cost+'.');cr.ups={...cr.ups,[k]:(cr.ups[k]||0)+1};break;}
  case 'down':cr.ups={...cr.ups,[k]:Math.max(0,(cr.ups[k]||0)-1)};break;
  case 'kbuy':{const sel=document.getElementById('cr-kbuy');if(!sel||!sel.value)return toast('Choose a knack first.');kpickSel.cr='';const kk=A.knacksFor(cr.archetype).find(x=>x.name===sel.value);if(!kk)return;
   if(crTierCount(kk.tier)>=KNACK_CAP[kk.tier])return toast('Limit reached for tier '+kk.tier+'.');
   for(let t=1;t<kk.tier;t++)if(!crTierCount(t))return toast('You need a tier '+t+' knack first.');
   if(crXpSpent()+KNACK_COST[kk.tier]>crXpBudget())return toast('Not enough XP. That costs '+KNACK_COST[kk.tier]+'.');
   cr.bought=[...cr.bought,kk.name];break;}
  case 'kdel':cr.bought=cr.bought.filter(x=>x!==n);break;
  case 'cat':cr.cat=n;break;
  case 'addw':{const w=W()[Number(n)];if(crMoneySpent()+w.c>crMoneyBudget())return toast('Over budget. '+w.n+' costs '+money(w.c)+'.');cr.cart=[...cr.cart,{type:'w',n:w.n,c:w.c}];break;}
  case 'addg':{const g=GR()[Number(n)];if(crMoneySpent()+g.c>crMoneyBudget())return toast('Over budget. '+g.n+' costs '+money(g.c)+'.');cr.cart=[...cr.cart,{type:'g',n:g.n,c:g.c}];break;}
  case 'addr':{const it=cr.cart[Number(n)];const w=W().find(x=>x.n===it.n);if(crMoneySpent()+w.rc>crMoneyBudget())return toast('Over budget.');cr.cart=[...cr.cart,{type:'reload',n:w.n,c:w.rc}];break;}
  case 'rm':cr.cart=cr.cart.filter((x,i)=>i!==Number(n));break;
  case 'reset':crDone();break;
  case 'place':{if(cr.slot==='new'){const c=crBuild();addSlot(c).then(id=>{if(!id)return;crDone();toast(c.name+' joined the party.');go(id);});return;}
   if(!canEdit(cr.slot))return toast(chars[cr.slot].name+'\u2019s sheet is locked. Unlock it first.');const c=crBuild();const s=cr.slot;c.locked=!!chars[s].locked;if(CAMP)c.ownerUid=chars[s].ownerUid||authUid;chars[s]=norm(c,slotNum(s));if(db)db.doc('characters/'+s).set(JSON.parse(JSON.stringify(chars[s]))).catch(e=>toast(e&&e.code==='permission-denied'?'That slot is locked. Unlock it first.':'Couldn’t save the new investigator. Try again.'));
   crDone();toast(c.name+' joined the party.');go(s);return;}
  case 'print':downloadSheet(crBuild());return;
 }
 crSave();render();
}
function downloadSheet(c){
 const html=A.sheetHtml(c);
 // Hand the sheet to print.html on this same (secure) site through this browser's storage.
 let id=null;
 try{
  const now=Date.now();
  for(let k=localStorage.length-1;k>=0;k--){const key=localStorage.key(k);if(key&&key.indexOf('apl-print:')===0&&now-Number(key.split(':')[1]||0)>86400000)localStorage.removeItem(key);}
  id=String(now);localStorage.setItem('apl-print:'+id,html);
 }catch(e){id=null;}
 const back='&back='+encodeURIComponent(location.href);
 // In the iPhone/iPad home-screen app a new tab would trap you on the sheet, so open it in place (its Back button returns here).
 if(id&&(navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches&&/iP(hone|ad|od)/.test(navigator.userAgent)))){location.href='print.html#'+id+back;return;}
 if(id){const w=window.open('print.html#'+id+back,'_blank');if(w){toast('Sheet opened in a new tab. Use its Print button.');return;}}
 // Fallback: blob tab, then download.
 const blob=new Blob([html],{type:'text/html'});const url=URL.createObjectURL(blob);
 const w2=window.open(url,'_blank');
 if(w2){toast('Sheet opened in a new tab. Use its Print button.');setTimeout(()=>URL.revokeObjectURL(url),60000);return;}
 const a=document.createElement('a');a.href=url;a.download=(c.name||'Investigator').replace(/[^\w .-]/g,'')+' - Arkham sheet.html';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);toast('Your browser blocked the new tab, so the sheet was downloaded instead.');
}
