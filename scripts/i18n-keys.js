// Every piece of the site's own text that js/lang/<code>.js needs to translate: the English passed to t(), tn(), tk(),
// logm() and logn() in the scripts, the HTML marked data-t, and the game content from the Core Rulebook that pages show
// with t() (archetypes, knacks, traits, weapons, gear, enemy profiles, house-rule suggestions, avatar colors).
// Run: node scripts/i18n-keys.js            prints them as JSON, {key: "plural" or "text"}
//      node scripts/i18n-keys.js <code>     lists what js/lang/<code>.js is missing
// test/i18n.test.js uses keys() to check every language has them all.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const SCRIPTS=['js/i18n.js','js/config.js','js/avatar.js','js/cropper.js','js/picker.js','js/localdb.js','js/upload.js','js/demo.js',
  'js/home.js','js/admin.js','js/catalog.js','js/npcs.js','js/house-rules.js',
  ...fs.readdirSync(path.join(root,'js/ledger')).filter(f=>f.endsWith('.js')).map(f=>'js/ledger/'+f),'print.html'];
const PAGES=['index.html','play.html','admin.html','help.html','privacy.html','print.html'];
function unescape(s){return s.replace(/\\u\{([0-9a-fA-F]+)\}/g,(m,h)=>String.fromCodePoint(parseInt(h,16))).replace(/\\u([0-9a-fA-F]{4})/g,(m,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\n/g,'\n').replace(/\\(.)/g,'$1');}
// Game content, loaded the way the pages load it.
function content(){
  const w={};global.window=w;global.t=s=>s;global.tk=s=>s;
  for(const f of ['js/catalog.js','js/npcs.js','js/house-rules.js','js/avatar.js']){try{new Function('window',fs.readFileSync(path.join(root,f),'utf8'))(w);}catch(e){if(f!=='js/avatar.js')throw e;}}
  const out=new Set(),add=s=>{if(typeof s==='string'&&/[A-Za-z]{2}/.test(s))out.add(s);};
  const A=w.APL;
  Object.keys(A.ARCH).forEach(a=>A.knacksFor(a).forEach(k=>{add(k.name);add(k.text);}));
  Object.entries(A.TRAITS).forEach(([n,[p,q]])=>{add(n);add(p);add(q);});
  const clean=s=>String(s||'').replace(/^House rule\.\s*/,'');
  const words=s=>/[A-Za-z]{2}/.test(String(s).replace(/\b(ft|max)\b/g,''));
  A.WEAPONS.forEach(x=>{add(x.n);add(x.sp);add(x.s);if(words(x.r))add(x.r);});
  A.GEAR.forEach(x=>{add(x.n);add(x.cat);add(x.note);});
  (w.APL_NPCS||[]).forEach(p=>{add(p.n);add(p.cat);add(p.size);add(p.gear);if(p.type!=='Named')add(p.type+' NPC');
    [...(p.ab||[]),...(p.wk||[])].forEach(a=>{add(a[0]);add(a[1]);});
    (p.atk||[]).forEach(a=>{add(a[0]);add(a[1]);if(words(a[4]))add(a[4]);add(a[5]);});});
  (w.APL_NPC_TRAUMAS||[]).forEach(x=>{add(x[1]);add(x[2]);});
  const H=w.HOUSE_RULES||{};
  [...(H.weapons||[]),...(H.gear||[])].forEach(x=>{add(x.n);add(x.cat);add(x.s);if(x.sp){add(x.sp);add(clean(x.sp));}if(x.note){add(x.note);add(clean(x.note));}});
  Object.keys(w.AVATAR_COLORS||{}).forEach(add);
  return [...out];
}
function keys(){
  const out={};
  const str="'((?:[^'\\\\]|\\\\.)*)'";
  for(const f of SCRIPTS){
    let src=fs.readFileSync(path.join(root,f),'utf8');
    // (i18n.js's own comments show examples, which aren't on the site)
    if(f==='js/i18n.js')src=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
    for(const m of src.matchAll(new RegExp('\\b(?:tn|logn)\\(\\s*'+str+'\\s*,\\s*'+str,'g')))out[unescape(m[2])]='plural';
    for(const m of src.matchAll(new RegExp('\\b(?:t|tk|logm)\\(\\s*'+str,'g'))){const k=unescape(m[1]);if(!out[k])out[k]='text';}
  }
  for(const f of PAGES){
    const src=fs.readFileSync(path.join(root,f),'utf8');
    for(const m of src.matchAll(/<(\w+)\b[^>]*\sdata-t(?![-\w])(?:="([^"]*)")?[^>]*>([\s\S]*?)<\/\1>/g))out[(m[2]||m[3]).trim()]='text';
    for(const m of src.matchAll(/\s(title|placeholder|aria-label)="([^"]*)"[^>]*\sdata-t-\1\b/g))out[m[2]]='text';
  }
  for(const k of content())out[k]=out[k]||'text';
  delete out[''];
  return out;
}
// js/lang/<code>.js's table
function table(code){
  const I={};const G={add:(c,pairs)=>{I.c=c;I.s={};(pairs||[]).forEach(p=>{I.s[p[0]]=p[1];});}};
  new Function('I18N',fs.readFileSync(path.join(root,'js/lang',code+'.js'),'utf8'))(G);
  return {strings:I.s||{}};
}
module.exports={keys,table,LANGS:['es','ca','fr','pl','pt']};
if(require.main===module){
  const k=keys(),code=process.argv[2];
  if(!code){console.log(JSON.stringify(k,null,1));console.error(Object.keys(k).length+' keys');}
  else{const t=table(code).strings;const miss=Object.keys(k).filter(x=>!(x in t));console.log(miss.length?miss.join('\n'):'nothing missing');}
}
