// Every language in js/lang/ has every string the site uses (scripts/i18n-keys.js), with the same {placeholders} and
// HTML tags as the English and the plural forms its language needs; and functions/i18n.js has every email and
// notification message in every language.
// Run: node test/i18n.test.js
const fs=require('fs'),path=require('path');
const {keys,table,LANGS}=require('../scripts/i18n-keys.js');
const K=keys();
const holes=s=>(String(s).match(/\{\w+\}/g)||[]).sort().join(' ');
const tags=s=>(String(s).match(/<\/?[a-z][^>]*>/g)||[]).map(x=>x.replace(/\s+/g,' ')).sort().join(' ');
let problems=[];
for(const code of LANGS){
  const f=path.join(__dirname,'..','js','lang',code+'.js');
  if(!fs.existsSync(f)){problems.push(code+': no js/lang/'+code+'.js');continue;}
  const T=table(code),cats=new Intl.PluralRules(code).resolvedOptions().pluralCategories;
  for(const k of Object.keys(K)){
    const v=T.strings[k];
    if(v==null){problems.push(code+': missing '+JSON.stringify(k));continue;}
    const eng=k.replace(/\|[^|]*$/,'');
    if(K[k]==='plural'){
      if(typeof v!=='object'){problems.push(code+': '+JSON.stringify(k)+' needs plural forms');continue;}
      // every form the language uses for whole numbers ("many" falls back to "other" where it only covers millions)
      for(const c of cats)if(c!=='many'&&c!=='other'&&!v[c]||c==='other'&&!v.other)problems.push(code+': '+JSON.stringify(k)+' lacks "'+c+'"');
      if(code==='pl'&&!v.many)problems.push(code+': '+JSON.stringify(k)+' lacks "many"');
      for(const c in v){if(holes(v[c]).replace('{n}','').trim()!==holes(eng).replace('{n}','').trim())problems.push(code+': '+JSON.stringify(k)+' ['+c+'] placeholders differ');
        if(tags(v[c])!==tags(eng))problems.push(code+': '+JSON.stringify(k)+' ['+c+'] HTML differs');}
    }else{
      if(typeof v!=='string'||!v.trim()){problems.push(code+': '+JSON.stringify(k)+' is empty');continue;}
      if(holes(v)!==holes(eng))problems.push(code+': '+JSON.stringify(k)+' placeholders differ: '+holes(v));
      if(tags(v)!==tags(eng))problems.push(code+': '+JSON.stringify(k)+' HTML differs');
    }
  }
  for(const k of Object.keys(T.strings))if(!(k in K))problems.push(code+': unused '+JSON.stringify(k));
}
// the server's emails and notifications
const {MESSAGES}=require('../functions/i18n.js');
for(const code of LANGS){const m=MESSAGES[code];
  if(!m){problems.push('functions/i18n.js: no '+code);continue;}
  for(const k of Object.keys(MESSAGES.en)){if(!m[k])problems.push('functions/i18n.js: '+code+' lacks '+k);else if(holes(m[k])!==holes(MESSAGES.en[k]))problems.push('functions/i18n.js: '+code+'.'+k+' placeholders differ');}}
if(problems.length){console.error(problems.slice(0,60).join('\n')+(problems.length>60?'\n… and '+(problems.length-60)+' more':''));process.exit(1);}
console.log('i18n: '+LANGS.length+' languages, '+Object.keys(K).length+' strings each, all present; emails too');
