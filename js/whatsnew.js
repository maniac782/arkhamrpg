// What's new: one entry per notable update, newest first. Each entry is the single place to write an update:
//  - title/body: shown on whatsnew.html (and translated like the rest of the site, so write them with tk())
//  - banner: optional one-line note for the banner at the top of the site, shown until opened or dismissed
//  - tags: names used by WN.tag('name') to put a small "New" label on the feature itself, for TAG_DAYS after `date`
// Seen state is per person, per device (localStorage); nothing breaks if storage is unavailable.
(function(){
var TAG_DAYS=14,KEY='apl-wn-seen',TKEY='apl-wn-tags';
var E=window.WHATSNEW=[
 {id:'2026-11-12-enctab',date:'2026-11-12',tags:['encounter'],
  title:tk('Encounter tab'),
  banner:tk('New: an Encounter tab puts the investigators and the enemies in one place during a fight.'),
  body:tk('Next to Party, the Encounter tab shows every investigator (dice, horror and injuries) beside the enemies the GM is showing, under the scene and turn tracker. Tap an investigator to open their sheet. Enemies that are dead or out drop off but stay in the Journal.')},
 {id:'2026-11-12-adventure',date:'2026-11-12',tags:['jfilter'],
  title:tk('Journal by adventure and session'),
  banner:tk('New: the GM can name the current adventure, and the Journal can show just this adventure or this session.'),
  body:tk('In the GM tab, name the current adventure next to the scene. Clues you reveal, enemies you show and people the party meets are then filed under that adventure and the session, and the top of the Journal lets everyone switch between This session, This adventure and Everything.')},
 {id:'2026-11-12-tomes',date:'2026-11-12',tags:['tomes'],
  title:tk('Tomes from the book, and the adventure’s creatures'),
  banner:tk('New: add the Core Rulebook’s tomes to a sheet, with their spells in short.'),
  body:tk('In Tomes, relics & debts, pick any of the Core Rulebook’s tomes to see its rarity, knowledge bonus and spells in short, and mark when the investigator can read it. Tomes appear on the printable sheet too. GMs also get the creatures from the book’s adventure in the enemy list.')},
 {id:'2026-11-12-recap',date:'2026-11-12',tags:[],
  title:tk('Longer session summaries'),
  body:tk('The GM’s summary for each session can now run to 10,000 characters, so there’s room for the whole story, not just the highlights.')},
 {id:'2026-11-08-shopping',date:'2026-11-08',tags:['plan'],
  title:tk('Shopping list and Undo'),
  banner:tk('New: plan purchases with a shopping list, and undo any purchase.'),
  body:tk('Tap Plan next to Buy on the equipment, kit, weapon and knack pickers (or Plan purchases… in the XP section) to collect what you want and see the total in money and XP, and what you’d have left, before spending anything. Buy all buys the lot. After any purchase, a bar at the bottom offers Undo for a few seconds.')},
 {id:'2026-10-24-enemies',date:'2026-10-24',tags:[],
  title:tk('Custom enemies, pictures and groups'),
  body:tk('GMs can add their own enemies with a name, type, notes and a picture, give pictures to the people the party meets, and let one enemy card stand for a group with Encountered and Defeated counters. Enemies marked dead stay in the Journal.')},
 {id:'2026-10-24-finish',date:'2026-10-24',tags:[],
  title:tk('Finish a campaign, and GM tools for the owner'),
  body:tk('When the story is over, the owner or GM can mark the campaign complete from the bottom of the Journal: it becomes a read-only record under Completed on your campaigns page. In Settings, owners can also turn on the GM tools for themselves and let the GM edit every investigator.')},
 {id:'2026-10-21-bring',date:'2026-10-21',tags:[],
  title:tk('Bring an investigator to a new campaign'),
  body:tk('On the New investigator tab, copy an investigator you play in another campaign, with their skills, knacks, XP, gear, injuries and portrait. Recent now keeps 100 entries, and Full history shows everything an investigator has done, session by session.')},
 {id:'2026-10-19-multiclass',date:'2026-10-19',tags:[],
  title:tk('Multiclassing and unique injuries'),
  body:tk('Once an investigator has spent 125 XP, the XP section offers multiclassing: +1 dice pool maximum and a second archetype or more knacks. The injury pickers now include the book’s unique injuries: Burned, Choking and Sickened.')}
];
function get(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function set(k,v){try{localStorage.setItem(k,v);}catch(e){}}
var latest=function(){for(var i=0;i<E.length;i++)if(E[i].banner)return E[i];return null;};
// A returning visitor has something of ours saved in this browser already (language, sign-in, a remembered sheet…).
var returning=function(){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k!==KEY&&k!==TKEY&&/^(apl|firebase|arkham)/i.test(k))return true;}}catch(e){}return false;};
var tagsSeen=function(){try{return JSON.parse(get(TKEY)||'[]');}catch(e){return [];}};
var WN=window.WN={
 entries:E,
 // Opening the page counts as having seen every update.
 markSeen:function(){var l=latest();if(l)set(KEY,l.id);},
 unseen:function(){var l=latest();if(!l)return null;
  // Someone visiting for the first time has nothing to catch up on: start them at the latest update.
  if(get(KEY)===null&&!returning()){set(KEY,l.id);return null;}
  return get(KEY)!==l.id?l:null;},
 // The banner goes into el (a spot outside anything that redraws). Shown until opened or dismissed.
 mount:function(el){if(!el)return;var l=WN.unseen();if(!l){el.hidden=true;return;}
  el.className='wnbar';el.hidden=false;el.setAttribute('role','status');
  el.innerHTML='<span class="wnpill">'+t('New')+'</span><span class="wntext">'+esc(t(l.banner))+'</span><a href="whatsnew.html">'+t('See what’s new')+'</a><button type="button" class="wnx" aria-label="'+t('Dismiss')+'">×</button>';
  el.querySelector('.wnx').onclick=function(){set(KEY,l.id);el.hidden=true;};
  el.querySelector('a').onclick=function(){set(KEY,l.id);};},
 // A small "New" label for a feature, for TAG_DAYS after its update, until the person uses that feature.
 tag:function(name){var now=Date.now();for(var i=0;i<E.length;i++){var e=E[i];
   if(e.tags&&e.tags.indexOf(name)>=0&&now-Date.parse(e.date+'T12:00:00')<TAG_DAYS*864e5&&tagsSeen().indexOf(name)<0)return ' <span class="newtag" data-newtag="'+name+'">'+t('New')+'</span>';}
  return '';}
};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
// Using a tagged feature (tapping the control the label sits in) retires its label.
document.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('button,a,label,summary');var tg=c&&c.querySelector&&c.querySelector('[data-newtag]');
 if(!tg&&c){var nx=c.nextElementSibling;if(nx&&nx.hasAttribute&&nx.hasAttribute('data-newtag'))tg=nx;}
 if(!tg&&c&&c.parentElement){var nx2=c.parentElement.nextElementSibling;if(nx2&&nx2.hasAttribute&&nx2.hasAttribute('data-newtag'))tg=nx2;}
 if(!tg&&e.target.closest)tg=e.target.closest('[data-newtag]');if(!tg)return;var n=tg.getAttribute('data-newtag'),s=tagsSeen();if(s.indexOf(n)<0){s.push(n);set(TKEY,JSON.stringify(s));}
 setTimeout(function(){var all=document.querySelectorAll('[data-newtag="'+n+'"]');for(var i=0;i<all.length;i++)all[i].remove();},0);},true);
})();
