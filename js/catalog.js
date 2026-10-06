/* Catalogs from the Arkham Horror RPG corebook: names, tiers, costs and stats. Effects are short summaries. */
window.APL = (function(){
const K=s=>s.split('|').map(x=>x.trim()).filter(Boolean);
const ARCH={
 Adventurer:{three:['athletics','intuition','ranged'],two:'wits',t:[K('Brawler|Light on Your Feet|Navigator|Pulp Heroics|Scrappy|Storyteller|Strong|Treasure Hunter'),K('Awe-inspiring Display*|Dodgy|Healer|Heroic Disarm|Quick Hands|Sure-Footed|Trained|Very Strong'),K('Quick Loader|Skilled Fighter|Skilled Shot|Tracker|Trench Warfare|Very Trained'),K('Dead Lift*|Fearless*|Swing into Action*')]},
 Believer:{three:['knowledge','lore','resolve'],two:'presence',t:[K('Blinding Light|Cleanse the Spirit*|Empathetic|Helpful|Inspirational Healing*|Inspired|Instrument of Faith*|Storyteller|Symbol of Belief*'),K('Blessing of Sanctuary*|Dealer|Ear for Truth|Exile the Supernatural*|Hallowed Ground*|Healer|Very Empathetic|Wise'),K('Attune|Determination|Linguist|Scrappy|Very Wise|Ward of Protection'),K('Close Call*|Light in the Darkest Hour*|Prayer of Hope*')]},
 Guardian:{three:['melee','presence','resolve'],two:'athletics',t:[K('Brawler|Come and Get Me*|Determination|Dodgy|Fierce|Healer|Helpful|Inspired|Scrappy'),K('Rational Thinking|Set Them Up…|Skilled Fighter|Stick and Move|Strong|The Best Defense…|Trench Warfare|Very Fierce'),K('Ear for Truth|Heroic Disarm|Improved Come and Get Me*|Like a Rock*|Never Give Up*|Pulp Heroics|Very Strong'),K('Gotta Get Past Me*|Protector*')]},
 Hunter:{three:['intuition','melee','ranged'],two:'athletics',t:[K('Accurate|Ambush|Driver|Killing Blow|Quick Hands|Stick and Move|Sure-Footed|The Best Defense…|Tracker'),K('Cheap Shot|Fierce|I’ve Seen Worse*|Quick Loader|Skilled Shot|Two-Blade Fighting|Two-Pistol Fighting|Very Accurate'),K('Fast|If It Bleeds…*|Improved Tracker*|Suppressing Fire!|Very Fierce|Weak Spot'),K('Hunter’s Blind*|Slayer*|Trick Shooter*')]},
 Mystic:{three:['intuition','knowledge','presence'],two:'lore',t:[K('Blinding Light|Counterspell*|Dealer|Dodgy|Driver|Haunting Whispers*|Hypnotic Tone*|Light on Your Feet|Wise'),K('Attune|Azure Flame*|Linguist|Premonition*|Resolute|Shadows in the Eye*|Very Wise|Ward of Protection'),K('Driven by Horrors Seen*|Familiar Spirit*|Glimpses of Great Antiquity*|Mists of R’lyeh*|Storm of Spirits*|Very Resolute'),K('Banish*|Prescient*|Shrivelling*')]},
 Rogue:{three:['agility','knowledge','wits'],two:'intuition',t:[K('Ambush|Breaking and Entering*|Cheap Shot|Clever|Dodgy|Fast|Pickpocket|Quick Hands|The Best Defense…'),K('Accurate|Backstab*|Brawler|Empathic Mind|Scrappy|Stick and Move|Treasure Hunter|Very Clever'),K('Killing Blow|Known Liar*|Skilled Fighter|Storyteller|Two-Blade Fighting|Very Accurate'),K('Fade Away*|On a Roll*|Silver-Tongued*')]},
 Seeker:{three:['lore','ranged','wits'],two:'knowledge',t:[K('Brilliant Insight*|Dealer|Dodgy|Ear for Truth|Linguist|Scientific*|Smart|Sure-Footed|Weak Spot'),K('Attune|Empathetic|Empathic Mind|Storyteller|The Pen Is Mightier…*|Thinking Ahead*|Tracker|Very Smart'),K('Eat Lead!|Helpful|Killing Blow|Rational Thinking|Two-Pistol Fighting|Very Empathetic'),K('Flawless Memory*|I Have a Hunch*|Nosy Questions*')]},
 Survivor:{three:['athletics','intuition','melee'],two:'resolve',t:[K('Dealer|Eat Lead!|Fast|Light on Your Feet|Navigator|Nope!*|Quick Hands|Resolute|Scrappy'),K('Clever|Determination|Dodgy|Helpful|Set Them Up…|Suppressing Fire!|Trench Warfare|Very Resolute'),K('Empathic Mind|Pickpocket|Pulp Heroics|Skilled Fighter|Skilled Shot|Very Clever'),K('Last One Standing*|Not Done Yet*|Tough as Iron*')]},
};
// Knack effects: short summaries of the corebook rules, in our own words.
const KT={
// Adventurer unique
'Awe-inspiring Display':'Once per session, after a successful reaction against an attack or trap, everyone within 20 ft rolls a Resolve reaction. Those who fail or skip it take −1 per die on actions and reactions against you until the scene ends.',
'Dead Lift':'Once per scene, an Athletics attack lets you lift an engaged character and throw them up to 10 ft: they land prone with 1 damage and an injury (and so does anyone they land on). With 3+ successes they can’t react to avoid it.',
'Fearless':'When a 6 on a complex action triggers nothing else, you may lower your horror dice limit by 1.',
'Swing into Action':'Once per scene, a complex Athletics action swings you to anywhere within 50 ft on a rope, whip, vine, wire or chandelier. Raise the difficulty once to carry a passenger, or grab an object or person on the way with an Athletics reaction.',
// Believer unique
'Blessing of Sanctuary':'Faith. Complex Lore action: supernatural creatures can’t come within 5 ft of you (+5 ft per extra success); any already there take 1 damage and are pushed out. Keep it up with a simple action each turn. A creature can break it with a difficult Resolve action.',
'Cleanse the Spirit':'Faith. Once per session, complex Lore action on an engaged character: lower their horror dice limit by 1 per success. If you fail, you suffer 1 horror.',
'Close Call':'Faith. Once per session, when you’re dealt an injury you may avoid it and suffer 2 horror instead.',
'Exile the Supernatural':'Faith. Once per scene, complex Resolve action on an engaged character who is possessed or supernaturally influenced: they get a Resolve reaction to shake it off, +1 to their die per extra success.',
'Hallowed Ground':'Faith. Once per session, complex Lore action: the ground around you (10 ft across per success) is hallowed until the end of your next turn. Supernatural and otherworldly creatures on it attack with disadvantage.',
'Inspirational Healing':'Faith. Complex Lore action on yourself or someone within 10 ft: heal up to 3 damage. With 3+ successes they also add dice to their pool equal to the damage healed.',
'Instrument of Faith':'Faith. Once per session, a simple action blesses a weapon for the scene: attacks with it that roll any 6s deal +1 damage.',
'Light in the Darkest Hour':'Faith. Once per session, before the investigators’ turn: until your next turn, you and every ally in the scene ignore all injuries and traumas and can’t suffer new ones.',
'Prayer of Hope':'Faith. Once per scene, complex Presence action: per success, allies within 20 ft heal 1 damage and lower their horror dice limit by 1. With 3+ successes, allies also get advantage on complex actions for the rest of this turn.',
'Symbol of Belief':'Faith. While openly holding a meaningful religious item, complex Resolve action: until the end of the investigators’ next turn, monstrous and inhuman enemies (and humans under otherworldly influence) have disadvantage on complex actions against you.',
// Guardian unique
'Come and Get Me':'Complex Presence action targeting all Minor NPC enemies (or one Monstrous NPC) within 30 ft. On a success, next turn they must spend at least one die moving toward you and at least one attacking you.',
'Gotta Get Past Me':'Simple action to guard an area up to 10 ft across. When an enemy passes through, an Athletics reaction stops them moving for the rest of their turn; on a 6 they also take 2 damage.',
'Improved Come and Get Me':'Requires Come and Get Me. Affected enemies must spend all their dice moving toward you, and enemies engaged with you must spend all their dice attacking you.',
'Like a Rock':'Reduce all damage you’re dealt by 1. When you reduce damage (this knack or armor), it can go down to 0 instead of 1.',
'Never Give Up':'When you roll a 6 on a reaction to avoid an attack, heal 1 damage.',
'Protector':'When an ally engaged with you would be hit, a Resolve reaction lets you take the hit instead. On a 6, you both avoid it.',
// Hunter unique
'Hunter’s Blind':'Once per session in a narrative scene, complex Intuition action: build a blind for 3 people (+1 per extra success). Those inside have cover and can’t be found by mundane means unless they do something obvious.',
'I’ve Seen Worse':'Once per session, complex Presence action: lower your horror dice limit by 2. Each 1 you roll gives a random ally within 30 ft 1 horror.',
'If It Bleeds…':'Your successful attacks deal +1 damage to an NPC you’ve already injured this session.',
'Improved Tracker':'When tracking with Intuition, learn one extra detail about the target (injuries, diet, abilities…) per success beyond the first.',
'Slayer':'Every weapon you use (unarmed too) gets +1 damage (max 3) and an injury rating of 2.',
'Trick Shooter':'When a Ranged Combat action gets 3+ successes, add two dice to your pool right away.',
// Mystic unique
'Azure Flame':'Spell. Complex Lore action on a target within 100 ft: 1 damage per success. Any 6s give them the Burned injury; any 1s give you the Burned injury.',
'Banish':'Spell. Complex Lore action on an otherworldly Minor NPC within 20 ft: it returns to its world, barred for a month per success. Raise the difficulty once for a Major NPC, twice for a Monstrous one. A 1 costs you 1 horror; three 1s banish you too.',
'Counterspell':'Spell. When someone within 50 ft casts a spell, a Lore reaction (−1 to the die) makes it fail. On a 1 you suffer 1 horror.',
'Driven by Horrors Seen':'Once per turn before a complex action, if your horror dice limit is under 6, suffer 1 horror to add three dice to the roll.',
'Familiar Spirit':'Spell. Once per session, complex Intuition action: summon and talk to the spirit of someone you knew. It’s invisible to others, passes through walls at walking speed and can scout and report back.',
'Glimpses of Great Antiquity':'Spell. Once per session, a Lore action: on a success, ask the GM for one clue about the scene or refill your insight to its limit. On a failure, suffer 1 horror.',
'Haunting Whispers':'Spell. Complex Lore action on an NPC within 100 ft: they discard one die from their pool per success.',
'Hypnotic Tone':'+1 to each die on complex actions to persuade someone to do what you want.',
'Mists of R’lyeh':'Spell. Complex Lore action: you or an ally within 30 ft becomes an untouchable, unseen mist that can pass through anything air can, until the end of the investigators’ next turn. Each extra success adds a target or a turn. Any 1s: 1 horror to you and each target.',
'Premonition':'Once per scene, if your horror dice limit is under 6, suffer 1 horror and name a danger in the scene: you and allies within 15 ft get +1 to each reaction against it until the start of your next turn.',
'Prescient':'At the start of each session, roll four dice and set them aside. Before a complex action or reaction you may swap one of your dice for one of these results (each once). You suffer 2 horror per result left unused at session end.',
'Shadows in the Eye':'Spell. Once per scene, complex Lore action: set four horror dice beside your pool. Until the scene ends, spend them only on reactions against ranged attacks or on stealth actions.',
'Shrivelling':'Spell. Complex Lore action: one character within 50 ft takes 2 damage. At the start of their next turn they must pass a Lore or Athletics action or take 3 more damage and an injury (+2 to the roll). You suffer 1 horror per 1 rolled.',
'Storm of Spirits':'Spell. Complex Lore action on a target within 100 ft: they and everyone within 20 ft of them take 1 damage per success. Successes on horror dice also give each a trauma. Any 1s: you suffer 1 horror.',
// Rogue unique
'Backstab':'A successful attack on a target unaware of you automatically inflicts an injury, +1 to the injury roll (two injuries if the successes also reach the weapon’s injury rating).',
'Breaking and Entering':'+1 to each die on complex actions to get past locks and other security.',
'Fade Away':'Once per scene, complex Agility action: vanish, then reappear at the start of your next turn anywhere accessible in the scene.',
'Known Liar':'Once per scene, when you fail to lie, an Intuition reaction lets you tell a different lie that is believed without a check. On a 6 the new lie must be even bigger.',
'On a Roll':'Once per session after a successful complex action, go on a roll: add a bonus die to every complex action until the scene ends or you roll two 1s.',
'Silver-Tongued':'A successful lie with 2+ successes can’t be seen through. With 3+ successes, add a second related lie for free that also can’t be seen through.',
// Seeker unique
'Brilliant Insight':'When a complex Knowledge or Lore action rolls two or more 6s, you or an ally within earshot regain 1 insight (up to the limit).',
'Flawless Memory':'You remember everything you see or read, so no memory checks, and you can cast any spell you’ve read without the source. But whenever you suffer a trauma, add 1 to the roll.',
'I Have a Hunch':'Once per scene before a complex action, pick a number from 2 to 6: gain 1 insight (up to the limit) for each die showing it.',
'Nosy Questions':'Once per session in a social encounter, when you fail an action with an NPC, force them to reveal their allegiance or intentions, or let slip a key detail or location of their plan. If they’re violent or evil, they end the talk and attack.',
'Scientific':'+1 to each die on complex Knowledge actions to run an experiment or scientific analysis.',
'The Pen Is Mightier…':'+1 to each die when attacking with an improvised weapon tied to your background (a beaker, a book, a shovel…).',
'Thinking Ahead':'In a structured scene, after a complex Knowledge action that rolls any 6s, take a simple action without spending a die.',
// Survivor unique
'Last One Standing':'If the only allies within 50 ft are wounded, you may reroll one die on any complex action or reaction.',
'Nope!':'Once per session, pick a character in the scene: +2 to each die on reactions to avoid their attacks and effects, but you suffer 1 horror whenever you become engaged with them.',
'Not Done Yet':'Once per session, complex Resolve action: restore your pool limit to its maximum. With 2+ successes, also heal one injury.',
'Tough as Iron':'When you suffer an injury, roll a die: if it’s equal to or higher than your Resolve, ignore its effects until the end of the scene (it still counts for later injury rolls).',
// Universal
'Accurate':'Once per scene, reroll one die on a complex Agility or Ranged Combat action.',
'Ambush':'In a surprise round, refill one extra die and get advantage on all complex actions.',
'Attune':'Difficult complex Intuition action to attune to one tome or magic item: use it with advantage. Fail a use and it’s disadvantage for the rest of the session. One item at a time.',
'Blinding Light':'Faith, Spell. Complex Lore action: everyone else within 20 ft takes 1 damage and can’t react until the end of the next turn. With 2+ successes you choose who’s affected.',
'Brawler':'Use Athletics instead of Melee Combat for unarmed attacks and for reactions against melee. Your unarmed injury rating is 3, and you roll 1d3 for the injuries you inflict.',
'Cheap Shot':'When an enemy tries to leave your engagement, spend a die on a Melee Combat reaction; on a success they take 1 damage.',
'Clever':'Once per scene, reroll one die on a complex Presence or Wits action.',
'Dealer':'+1 to each die on complex actions to buy, sell or trade.',
'Determination':'Injuries from straining yourself use 1d3 instead of 1d6 on the injury table.',
'Dodgy':'Once per turn, reroll a reaction to avoid a ranged attack.',
'Driver':'+1 to each die on complex actions to drive or pilot a vehicle.',
'Ear for Truth':'Once per turn, reroll a reaction to spot a lie or resist being charmed.',
'Eat Lead!':'Before a Ranged Combat attack with a weapon that has 2+ ammo circles, spend one ammo to add a die to the attack.',
'Empathetic':'Once per scene, reroll one die on a complex Intuition or Presence action.',
'Empathic Mind':'After a few minutes with someone, a complex Intuition action reveals what drives them and gets a truthful answer to one question.',
'Fast':'When a complex Athletics action gets two successes, take a simple action right away without spending a die.',
'Fierce':'Once per scene, reroll one die on a complex Athletics or Melee Combat action.',
'Healer':'When mundane healing gets 3+ successes, the patient heals one extra damage and one injury.',
'Helpful':'Once per scene, a simple action describing how you help an ally gives them advantage on complex actions and reactions until the next investigators’ turn (or five minutes in a narrative scene).',
'Heroic Disarm':'When grappling an armed enemy with Athletics gets 2+ successes, also disarm them; with 3 successes you take the weapon.',
'Inspired':'Once per session at the start of the investigators’ turn, if you have no insight, gain 1.',
'Killing Blow':'+1 to the injury roll whenever you inflict an injury.',
'Light on Your Feet':'Once per turn, stand up from prone as a free action.',
'Linguist':'+1 to each die on complex actions to decipher a language you don’t know.',
'Navigator':'+1 to each die on complex actions to read a map or plot a route.',
'Pickpocket':'When someone becomes engaged with you or leaves your engagement, spend a die on an Agility reaction to steal one item they carry (not held).',
'Pulp Heroics':'Delay the effects of poison, gas, venom or other mind- or body-altering substances or spells indefinitely. While you do, simple actions become complex and complex actions get harder (up to very difficult).',
'Quick Hands':'Once per turn, take out or put away an item as a free action.',
'Quick Loader':'When a Ranged Combat attack gets 2+ successes, reload that weapon as a free action right after.',
'Rational Thinking':'When an ally within 30 ft would suffer horror, a Knowledge reaction reduces it by 1. On a 1 they suffer 1 more instead.',
'Resolute':'Once per scene, reroll one die on a complex Intuition or Resolve action.',
'Scrappy':'Once per turn, reroll a reaction to avoid a melee attack.',
'Set Them Up…':'After an ally hits a target engaged with you, an Athletics reaction knocks the target 5 ft back and prone.',
'Skilled Fighter':'A melee attack with 3+ successes can’t be avoided with a reaction.',
'Skilled Shot':'A ranged attack with 3+ successes can’t be avoided with a reaction.',
'Smart':'Once per scene, reroll one die on a complex Knowledge or Wits action.',
'Stick and Move':'After a melee attack with 2+ successes, disengage from all enemies as a free action.',
'Storyteller':'Once per scene, tell a charming or useful anecdote: +1 to each die on your next complex Knowledge or Presence action.',
'Strong':'Once per scene, reroll one die on a complex Agility or Athletics action.',
'Suppressing Fire!':'Before a Ranged Combat attack with a weapon that has 2+ ammo circles, spend one ammo: hit or miss, the target can’t move with simple actions until the end of their next turn.',
'Sure-Footed':'Cross difficult terrain with simple actions (5 ft each) instead of a complex action.',
'The Best Defense…':'When your attack gets 2+ successes, the target has disadvantage on complex actions until the start of your next turn.',
'Tracker':'+1 to each die on complex actions to follow tracks or a trail.',
'Trained':'Once per scene, reroll one die on a complex Melee Combat or Ranged Combat action.',
'Treasure Hunter':'+1 to each die on complex actions to spot or disarm a trap, and on reactions to avoid one.',
'Trench Warfare':'In cover, ranged attacks against you take −2 per die instead of −1 (minimum 1).',
'Two-Blade Fighting':'Wielding two one-handed blades: once per turn after an attack, gain an extra die usable only for an attack with the other blade.',
'Two-Pistol Fighting':'Wielding two pistols: once per turn after an attack, gain an extra die usable only for an attack with the other pistol.',
'Very Accurate':'Requires Accurate. Reroll one die on every complex Agility or Ranged Combat action.',
'Very Clever':'Requires Clever. Reroll one die on every complex Presence or Wits action.',
'Very Empathetic':'Requires Empathetic. Reroll one die on every complex Intuition or Presence action.',
'Very Fierce':'Requires Fierce. Reroll one die on every complex Athletics or Melee Combat action.',
'Very Resolute':'Requires Resolute. Reroll one die on every complex Intuition or Resolve action.',
'Very Smart':'Requires Smart. Reroll one die on every complex Knowledge or Wits action.',
'Very Strong':'Requires Strong. Reroll one die on every complex Agility or Athletics action.',
'Very Trained':'Requires Trained. Reroll one die on every complex Melee Combat or Ranged Combat action.',
'Very Wise':'Requires Wise. Reroll one die on every complex Knowledge or Resolve action.',
'Ward of Protection':'Spell. Complex Presence action: you or an ally within 50 ft takes 1 less damage from everything (minimum 1) for the rest of the scene.',
'Weak Spot':'Once per scene, complex Knowledge action on a target (2 successes for a Monstrous NPC): for the scene, injuries you or allies within 20 ft inflict on it are rolled twice, pick either.',
'Wise':'Once per scene, reroll one die on a complex Knowledge or Resolve action.',
};
function knackText(n){return KT[String(n||'').trim()]||'';}
// knack table for an archetype: [{name,tier,unique,text}]
function knacksFor(a){const d=ARCH[a];if(!d)return[];const out=[];d.t.forEach((list,i)=>list.forEach(n=>{const nm=n.replace(/\*$/,'');out.push({name:nm,tier:i+1,unique:n.endsWith('*'),text:knackText(nm)});}));return out;}
function maxFor(a,k){const d=ARCH[a];if(!d)return 4;if(d.two===k)return 2;if(d.three.includes(k))return 3;return 4;}

const TRAITS={
 Ambitious:['Spend 1 insight to add two successes to a successful check.','Can’t use Aid an Ally until the end of the scene.'],
 Analytical:['After an action, spend 1 insight to discard one horror die that rolled a 1, before any trauma.','Roll traumas twice and take the higher result for the rest of the session.'],
 Cautious:['Spend 1 insight for advantage on every complex action you make with two or more dice this turn.','Next turn, spend half your dice moving away from all opponents by the safest route.'],
 Imaginative:['When you spend insight for advantage, add two dice and drop the two lowest.','You can’t lower your horror dice limit for the rest of the session.'],
 Optimistic:['Spend 1 insight to heal 3 damage as a free action on your turn.','No reactions for the rest of the scene.'],
 Outgoing:['Spend 1 insight to use Presence for any action that interacts with someone.','Until the scene ends, allies interact with others at disadvantage.'],
 Reserved:['Spend 1 insight on your turn to lower your horror dice limit by 1.','Keep at least half your dice unspent each turn for the rest of the scene.'],
 Selfless:['When you Aid an Ally, spend 1 insight to also aid a second ally within 15 feet.','No complex actions on your next turn.'],
 Skeptical:['Spend 1 insight to automatically succeed at a reaction to detect a lie.','Next turn, you can’t interact with, respond to or attack anything supernatural.'],
 Stubborn:['After being hit, spend 1 insight instead of a reaction to reduce the damage by 3.','Can’t spend dice to move away from an opponent until the scene ends.'],
 Thrifty:['Spend 1 insight on your turn to produce an item worth $5.00 or less.','Won’t share items or supplies, and grabs any resources found, for the rest of the scene.'],
};

const R='Ranged Combat',M='Melee Combat';
const WEAPONS=[
 {n:'Browning M1918 Automatic Rifle',s:R,d:'3',i:'3',r:'200 ft',a:3,rc:4,c:319,sp:'Full Auto (+1 damage per success). Heavy Kick (Athletics 5+ or worse: disadvantage).'},
 {n:'Colt 1903 Pocket Hammerless .32',s:R,d:'2',i:'4',r:'30 ft',a:2,rc:1,c:20.5,sp:'Hard to Find (2 successes to spot).'},
 {n:'Colt 1911 Pistol',s:R,d:'2',i:'3',r:'75 ft',a:2,rc:1,c:36.75,sp:'None'},
 {n:'Colt Police Revolver',s:R,d:'2',i:'4',r:'75 ft',a:2,rc:0.2,c:30,sp:'Slow Reload (a simple action restores 1 ammo).'},
 {n:'Double-Barreled Shotgun',s:R,d:'3',i:'3',r:'50 ft',a:2,rc:0.07,c:45,sp:'Reload after 2 attacks. Buckshot (−2 to dodge it).'},
 {n:'Double Express Rifle',s:R,d:'4',i:'2',r:'100 ft',a:2,rc:0.5,c:285,sp:'Reload after 2 attacks. Brutal (+2 to injury rolls).'},
 {n:'M1903 Springfield Rifle',s:R,d:'3',i:'3',r:'240 ft',a:1,rc:0.75,c:35,sp:'None'},
 {n:'Petrol Bomb',s:R,d:'1',i:'–',r:'40 ft',a:0,rc:0,c:0.25,sp:'Single use. Splash; Fire (may cause Burned).'},
 {n:'Remington Model 95 Derringer',s:R,d:'2',i:'5',r:'10 ft',a:2,rc:0.06,c:18.4,sp:'Reload after 2 attacks. Very Hard to Find (3 successes to spot).'},
 {n:'Stick of Dynamite',s:R,d:'2',i:'4',r:'Thrown',a:0,rc:0,c:2,sp:'Single use. Blast Radius (2 damage to everyone within 20 ft).'},
 {n:'Thompson M1921A Submachine Gun',s:R,d:'2',i:'3',r:'75 ft',a:5,rc:5,c:175,sp:'Full Auto (+1 damage per success).'},
 {n:'Webley Service Revolver',s:R,d:'2',i:'3',r:'80 ft',a:2,rc:0.25,c:26.75,sp:'Slow Reload (a simple action restores 1 ammo).'},
 {n:'Winchester Model 12 Pump Shotgun',s:R,d:'3',i:'2',r:'40 ft',a:2,rc:0.2,c:63,sp:'Buckshot (−2 to dodge it). Slow Reload.'},
 {n:'Winchester Model 1894 Rifle',s:R,d:'3',i:'3',r:'100 ft',a:2,rc:0.75,c:44,sp:'Slow Reload (a simple action restores 1 ammo).'},
 {n:'Baseball Bat',s:M,d:'2',i:'3',r:'Engaged',a:0,rc:0,c:1.86,sp:'Breakable (breaks on two or more 1s).'},
 {n:'Blackjack',s:M,d:'2',i:'4',r:'Engaged',a:0,rc:0,c:2,sp:'Knockdown (2+ successes knocks the target prone).'},
 {n:'Brass Knuckles',s:M,d:'1',i:'3',r:'Engaged',a:0,rc:0,c:1,sp:'Hard to Find (2 successes to spot).'},
 {n:'Bullwhip',s:M,d:'1',i:'–',r:'10 ft',a:0,rc:0,c:5,sp:'Tangle (3+ successes: knock prone or disarm).'},
 {n:'Dagger',s:M,d:'2',i:'3',r:'Engaged',a:0,rc:0,c:4,sp:'None'},
 {n:'Hatchet',s:M,d:'3',i:'3',r:'Engaged',a:0,rc:0,c:2,sp:'Brutal (+2 to injury rolls).'},
 {n:'Axe',s:M,d:'4',i:'3',r:'Engaged',a:0,rc:0,c:3,sp:'Brutal (+2 to injury rolls).'},
 {n:'Improvised Weapon',s:M,d:'2',i:'4',r:'Engaged',a:0,rc:0,c:0.2,sp:'Fragile (breaks on a 1). Cost varies $0.20–$8.00.'},
 {n:'Machete',s:M,d:'3',i:'3',r:'Engaged',a:0,rc:0,c:6,sp:'Brutal (+2 to injury rolls).'},
 {n:'Pocketknife',s:M,d:'1',i:'4',r:'Engaged',a:0,rc:0,c:1.5,sp:'Very Hard to Find (3 successes to spot).'},
 {n:'Scout Knife (five-attachment)',s:M,d:'1',i:'4',r:'Engaged',a:0,rc:0,c:8,sp:'Very Hard to Find (3 successes to spot).'},
 {n:'Switchblade',s:M,d:'2',i:'4',r:'Engaged',a:0,rc:0,c:8,sp:'Hard to Find (2 successes to spot).'},
 {n:'Sword (One-Handed)',s:M,d:'3',i:'3',r:'Engaged',a:0,rc:0,c:30,sp:'Precise Thrust (a 6 on a hit adds 1 success).'},
 {n:'Sword Cane',s:M,d:'3',i:'3',r:'Engaged',a:0,rc:0,c:34,sp:'Precise Thrust (a 6 on a hit adds 1 success). Concealed in a cane.'},
];
const G=(cat,list)=>list.map(([n,c,note])=>({cat,n,c,note:note||''}));
const GEAR=[
 ...G('Protection',[['Bulletproof Vest (Plate)',100,'Cancels all damage and injuries from a hit; ruined after 3 hits.'],['Bulletproof Vest (Silk)',800,'−1 damage from ranged attacks (minimum 1).'],['Flowing Clothing',15,'Reroll a reaction to avoid a ranged attack once.'],['Heavy Clothing',30,'−1 damage from melee attacks (minimum 1).'],['Heavy Protective Gear',15,'−2 melee damage (minimum 1); −1 to injury rolls from melee.'],['Helmet',5,'−1 to injury rolls. Can be worn with other protection.'],['Improvised Shield',0.25,'Reroll a reaction to avoid a melee attack; breaks on a 1. Cost varies.']]),
 ...G('Useful items',[['Climbing Gear (hook and line)',5,'+1 to climbing rolls.'],['Climbing Gear (mountain kit)',20,'+1 to climbing rolls; a fall stops at the last piton.'],['Field Surgeon Kit',25,'Uses 3. +2 successes when healing.'],['First Aid Kit',3,'Uses 2. +1 success when healing.'],['General Tool Kit',5,'Uses 3. Repairs; once per session add a die to a related action.'],['Habitual Item',1,'Once per session, a simple action removes 1 horror. $1.00 per use.'],['Handcuffs',1.75,'Escaping takes 3 successes (Agility or Athletics).'],['Candle',0.1,'Light: one small room.'],['Torch',0.5,'Light: 20 ft.'],['Flashlight',3,'Light: 40 ft beam.'],['Lantern',5,'Light source.'],['Religious Symbol',3,'Once per session, +1 success on a Lore or Presence action.'],['Specialty Tool Kit',15,'Uses 4. Pick a trade; once per session add a die.'],['Textbook',3.75,'Pick a subject; consult it for advantage on a related action.']]),
 ...G('Tools and personal',[['Affordable Clothing',6],['Bag (Large)',15],['Bag (Medium)',10],['Bag (Small)',4],['Bandolier',2,'Holds up to three extra reloads.'],['Belt and Holster',3,'Holds a firearm and one reload.'],['Camera',23.4],['Dissection Kit',10],['Durable Clothing',25],['Fine Clothing',75],['Fingerprint Kit',3],['Folding Camera',9.4],['Gold Pocket Watch',25],['Hat',4.95],['Lockpicks',2],['Magnifying Glass',0.5],['Monocular (2x)',5],['Binoculars (4x)',10],['Binoculars (8x)',22],['Roll of Film',0.4],['Wristwatch',10]]),
 ...G('Outdoors',[['Camping Blanket',4],['Camping Mess Kit',4],['Compass',3],['Field Rations (1 day)',0.2],['Fishing Rod',2.17,'Price varies up to $39.25.'],['Fishing Tacklebox',4],['Rain Slicker and Hat',3.79],['Road Atlas',1],['Rope, Heavy (10 ft)',5],['Rope, Line (10 ft)',1],['Survival Kit',3],['Two-Person Tent',11]]),
 ...G('Transport',[['Bicycle',24],['Motorcycle',100,'Price varies up to $300.'],['Rowboat',35],['Touring Car (used)',250],['Touring Car (new)',900],['Truck (used)',550]]),
];

const SK=[['agility','Agility'],['athletics','Athletics'],['wits','Wits'],['presence','Presence'],['intuition','Intuition'],['knowledge','Knowledge'],['resolve','Resolve'],['melee','Melee Combat'],['ranged','Ranged Combat'],['lore','Lore']];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=v=>'$'+(Number(v)||0).toFixed(2);

// The investigator again inside the sheet (no activity log, no inline picture), so the sheet can rebuild itself in Safari.
function sheetData(c){const d={...c};delete d.log;if(typeof d.portrait==='string'&&d.portrait.indexOf('data:')===0)delete d.portrait;return JSON.stringify(d).replace(/</g,'\\u003c');}
// Buttons on the sheet. Back closes the tab, or returns to the ledger when the sheet opened in the same window.
// Print: in the iPhone/iPad home-screen app printing doesn't work, so the sheet reopens in Safari (iOS 17+), where it does.
const SHEET_JS='function closeSheet(){try{window.close()}catch(e){}setTimeout(function(){var m=location.hash.match(/back=([^&]+)/);if(m){location.href=decodeURIComponent(m[1]);return;}if(history.length>1)history.back();else location.href="./";},250);}'+
 'function iosApp(){return navigator.standalone===true||(/iP(hone|ad|od)/.test(navigator.userAgent)&&matchMedia("(display-mode: standalone)").matches);}'+
 'function doPrint(){if(!iosApp()){window.print();return;}var d=btoa(unescape(encodeURIComponent(JSON.stringify(SHEET)))).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");'+
 'location.href="x-safari-https://"+(location.host||"arkhamrpg.web.app")+"/print.html#d="+d+"&t="+document.getElementById("theme").value+"&p="+document.getElementById("paper").value+"&go=1";'+
 'setTimeout(function(){if(document.visibilityState==="visible"){var m=document.getElementById("pmsg");m.hidden=false;m.textContent="To print, open arkhamrpg.web.app in Safari and print the sheet from there.";}},1500);}';
// Printable two-page Letter sheet, same look as the paper-style sheet.
function sheetHtml(c){
 const knRows=[];const byT={1:[],2:[],3:[],4:[]};(c.knacks||[]).forEach(k=>{(byT[k.tier]||byT[1]).push(k);});
 [[1,3],[2,2],[3,2],[4,1]].forEach(([t,n])=>{const have=byT[t];for(let i=0;i<Math.max(n,have.length);i++){const k=have[i];knRows.push('<div class="kr"><span class="tl">Tier '+['I','II','III','IV'][t-1]+'</span><span>'+(k?'<b>'+e(k.name||'')+(/[.!?…]$/.test(k.name||'')?'':'.')+'</b> '+e(k.text||knackText(k.name)):'')+'</span></div>');}});
 const w=(c.weapons||[]).slice(0,4);while(w.length<3)w.push(null);
 const pips=n=>{let s='';for(let i=0;i<n;i++)s+='<i class="pip"></i>';return s||'—';};
 const skills=SK.map(([k,n])=>{const s=(c.skills||{})[k]||{r:6,max:''};return '<div class="sk"><span class="sn">'+n+'</span><span class="rt">'+s.r+'+</span><span class="mx"><small>max</small><em>'+(s.max?s.max+'+':'')+'</em></span></div>';}).join('');
 const lines=n=>'<div class="ln"></div>'.repeat(n);
 const f=(l,v,n)=>'<div class="fd"><span class="lb">'+l+'</span>'+(v?'<div class="val">'+e(v)+'</div>':'')+lines(v?Math.max(0,(n||1)-1):(n||1))+'</div>';
 const eq=(c.items||[]).map(it=>'<div class="eq"><b>'+e(it.name)+'</b>'+(it.note?' — '+e(it.note):'')+'</div>').join('');
 const luck=c.lucky&&c.lucky.name?'<div class="eq"><b>'+e(c.lucky.name)+'</b> (lucky item) \u2014 once per session, a simple action recovers 1 insight.</div>':'';
 const hab=c.habitual&&c.habitual.name?'<div class="eq"><b>'+e(c.habitual.name)+'</b>'+' \u00d7 '+(typeof c.habitual.uses==='number'?c.habitual.uses:1)+' (habitual) \u2014 once per session, a simple action uses one to remove 1 horror.</div>':'';
 const txt=v=>e(v||'').replace(/\n/g,'<br>');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light only"><meta name="viewport" content="width=880"><title>'+e(c.name||'Investigator')+' — Arkham investigator sheet</title>'+
 '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Marcellus+SC&family=IM+Fell+English+SC&display=swap">'+
 '<style>:root{--ink:#1f1a14;--frame:#3a3226;--label:#5a4f40;--accent:#7b2d26;--rule:#8a7a5c;--hair:#b9a986;--desk:#dcd6c8;--paper:#f4eedf;--panel:#fbf7ec;--cell:#ffffff;--head:"Marcellus SC",Georgia,serif}body.ledger{--ink:#2a1a0c;--frame:#4a2c14;--label:#5e4024;--accent:#6e3614;--rule:#8c6a42;--hair:#b8955e;--desk:#3b2616;--paper:#e9d8ae;--panel:#f0e2bc;--cell:#f6ebcd;--head:"IM Fell English SC",Georgia,serif}body.ledger{background:#3b2616 radial-gradient(circle at 30% 20%,#5a3a20 0,#3b2616 60%,#24160b 100%)}body.ledger .page{background:radial-gradient(ellipse at 50% 45%,#f3e5bb 0%,#ead7a7 50%,#dcc28b 82%,#c9a86b 100%);box-shadow:inset 0 0 70px rgba(110,70,20,.38),inset 0 0 14px rgba(90,50,15,.5),0 6px 24px rgba(0,0,0,.45)}body.ledger .page>*{position:relative;z-index:1}body.ledger .page::before{border:3px double #6b4424;inset:.16in}body.ledger .page::after{content:\"\";position:absolute;inset:0;pointer-events:none;z-index:0;background:linear-gradient(135deg,#4a2c14 0 .27in,#2e1a0a .27in .295in,transparent .295in) top left/.6in .6in no-repeat,linear-gradient(225deg,#4a2c14 0 .27in,#2e1a0a .27in .295in,transparent .295in) top right/.6in .6in no-repeat,linear-gradient(45deg,#4a2c14 0 .27in,#2e1a0a .27in .295in,transparent .295in) bottom left/.6in .6in no-repeat,linear-gradient(315deg,#4a2c14 0 .27in,#2e1a0a .27in .295in,transparent .295in) bottom right/.6in .6in no-repeat,url(\"data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27240%27 height=%27240%27><filter id=%27n%27><feTurbulence type=%27fractalNoise%27 baseFrequency=%27.85%27 numOctaves=%273%27 stitchTiles=%27stitch%27/><feColorMatrix values=%270 0 0 0 .42 0 0 0 0 .27 0 0 0 0 .1 0 0 0 .16 0%27/></filter><rect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/></svg>\")}body.ledger .panel{border:1.5px solid #5b3a1e;box-shadow:inset 0 0 0 3px var(--panel),inset 0 0 0 4px #a67c4e,0 1px 0 rgba(90,55,20,.25)}body.ledger .h{color:#5b3a1e;font-size:15px}body.ledger .h::before,body.ledger .h::after{background:#8c6a42;height:1.5px}body.ledger .kr,body.ledger td{border-bottom-color:#b7935d}body.ledger .holders{background:linear-gradient(#6b4424,#6b4424) center/100% 2px no-repeat}body.ledger .dh{background:#f3e6c2;border-color:#4a2c14;box-shadow:0 0 0 3px #e9d8ae,0 0 0 5px #6b4424}body.ledger .nm{color:#3a2210;text-shadow:0 1px 0 rgba(255,240,200,.6)}body.ledger .kick{color:#6e3614}body.ledger .rt{background:#f6ebcd;border-color:#3a2210;font-family:"EB Garamond",Georgia,serif;font-weight:600;font-variant-numeric:lining-nums;line-height:1}.pers{display:grid;grid-template-columns:1.35in 1fr 1fr;gap:0 18px;align-items:stretch}.pers>div{display:flex;flex-direction:column;gap:2px;min-width:0}.pers>div+div{border-left:1px solid var(--hair);padding-left:14px}.pt b{font-family:var(--head);font-size:19px;font-weight:400;line-height:1.15}.pp p{margin:0;font-size:13px;line-height:1.3}.ruled{flex:1;min-height:42px;background:repeating-linear-gradient(transparent 0 21px,var(--rule) 21px 22px)}.fit{flex:1 1 auto;display:flex;flex-direction:column;gap:9px;transform-origin:top left;min-height:0}@page{margin:0}*{box-sizing:border-box}html{color-scheme:light only}body{margin:0;background:var(--desk);font-family:"EB Garamond",Georgia,serif;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
 '.bar{position:sticky;top:0;z-index:2;background:#1f1a14;color:#f4eedf;padding:10px 16px;font:14px/1.4 system-ui,sans-serif;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap}.bar button,.bar select{font:inherit;padding:6px 12px;border:0;border-radius:4px;background:#f4eedf;color:#1f1a14;cursor:pointer}'+
 '.page{width:var(--pw,8.5in);height:var(--ph,11in);margin:20px auto;background:var(--paper);padding:.4in;display:flex;flex-direction:column;gap:9px;position:relative;overflow:hidden;page-break-after:always;break-after:page}'+
 '.page::before{content:"";position:absolute;inset:.18in;border:1px solid var(--hair);pointer-events:none}'+
 '.panel{background:var(--panel);border:1.5px solid var(--frame);box-shadow:inset 0 0 0 3px var(--panel),inset 0 0 0 4px var(--hair);padding:8px 14px}'+
 '.h{font-family:var(--head);font-size:14px;letter-spacing:3px;color:var(--accent);display:flex;align-items:center;gap:10px;margin:0 0 8px}.h::before,.h::after{content:"";flex:1;height:1px;background:var(--hair)}'+
 '.lb{font-family:var(--head);font-size:11px;letter-spacing:1.4px;color:var(--label)}.ln{border-bottom:1px solid var(--rule);height:20px}'+
 '.top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px}.nm{font-family:var(--head);font-size:40px;line-height:1.05}.sub{font-style:italic;font-size:16px}.kick{font-family:var(--head);font-size:11px;letter-spacing:4px;color:var(--accent)}'+
 '.xp{display:grid;grid-template-columns:repeat(2,.8in);gap:6px 18px;margin-right:.1in}.xp div{display:flex;flex-direction:column;align-items:center}.xp .lb{text-align:center}.xp b{font-family:var(--head);font-size:20px;border-bottom:1px solid var(--rule);min-height:24px;width:100%;text-align:center}'+
 '.row{display:flex;gap:12px}.sks{display:grid;grid-template-columns:1fr 1fr;column-gap:20px}.sk{display:flex;align-items:center;gap:8px;height:34px;border-bottom:1px dotted var(--hair)}.sn{flex:1;font-size:16px;font-weight:500}'+
 '.rt{width:30px;height:30px;border-radius:50%;border:2px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:var(--head);font-size:17px;background:var(--cell)}.mx{position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:30px;top:3px}.mx small{position:absolute;left:0;right:0;bottom:calc(50% + 10.7px);text-align:center;line-height:1;font-family:var(--head);font-size:8px;color:var(--label)}.mx em{font-style:normal;width:28px;height:20px;border:1px solid var(--rule);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;color:var(--accent);font-weight:600;box-sizing:border-box}'+
 '.dice{display:grid;grid-template-columns:repeat(6,1fr);gap:5px}.dice i{height:26px;border:1.5px solid var(--frame);border-radius:4px;background:var(--cell)}.box2{display:flex;gap:8px}.box2 div{flex:1;border:1.5px solid var(--frame);border-radius:18px;text-align:center;padding:2px 0}.box2 b{display:block;font-family:var(--head);font-size:20px;min-height:24px}'+
 '.kr{display:flex;gap:10px;align-items:baseline;min-height:21px;border-bottom:1px solid var(--hair);padding:2px 0;font-size:13.5px;line-height:1.3}.kr:last-child{border-bottom:0}.tl{font-family:var(--head);font-size:11px;letter-spacing:1px;color:var(--accent);width:48px;flex:none}'+
 'table{width:100%;border-collapse:collapse;font-size:13.5px}th{font-family:var(--head);font-weight:400;font-size:10.5px;letter-spacing:1px;color:var(--label);text-align:left;padding:0 4px 3px}td{border-bottom:1px solid var(--hair);padding:3px 4px;height:24px;vertical-align:middle}.pip{display:inline-block;width:11px;height:11px;border-radius:50%;border:1.5px solid var(--frame);margin-right:3px}'+
 '.fd{display:flex;flex-direction:column;gap:1px}.val{font-size:15px;border-bottom:1px solid var(--rule);min-height:20px}.eq{font-size:13.5px;border-bottom:1px solid var(--hair);padding:3px 0;line-height:1.3}.qr{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:12.5px;line-height:1.35}.tx{font-size:13.5px;line-height:1.35;min-height:40px}'+
 '.holders{display:flex;justify-content:space-around;align-items:center;height:1.12in;flex:none;background:linear-gradient(var(--rule),var(--rule)) center/100% 1px no-repeat}'+'.dh{width:.7in;height:.7in;transform:rotate(45deg);background:var(--panel);border:2px solid var(--ink);box-shadow:0 0 0 3px var(--paper),0 0 0 4.5px var(--accent);display:flex;align-items:center;justify-content:center}'+'.dh i{width:.56in;height:.56in;border:1px solid var(--hair);border-radius:3px;display:block}'+'@media print{body{background:none}.bar{display:none}.page{margin:0}}</style></head><body>'+
 '<div class="bar"><button onclick="closeSheet()">\u2039 Back</button><label for="theme">Style</label><select id="theme" onchange="setTheme(this.value)"><option value="classic">Classic</option><option value="ledger">Leather</option></select><label for="paper">Paper</label><select id="paper" onchange="setPaper(this.value)"><option value="letter">Letter (8.5 × 11 in)</option><option value="a4">A4 (210 × 297 mm)</option><option value="legal">Legal (8.5 × 14 in)</option></select><span>Print at 100% scale with margins set to None and background graphics on.</span><button onclick="doPrint()">Print</button><span id="pmsg" hidden></span></div>'+
 // page 1
 '<section class="page"><div class="top"><div style="display:flex;gap:14px;align-items:center">'+(c.portrait?'<img src="'+e(c.portrait)+'" alt="" style="width:.85in;height:.85in;object-fit:cover;border:2px solid var(--ink);box-shadow:0 0 0 3px var(--paper),0 0 0 4.5px var(--accent)">':'')+'<div><div class="kick">Arkham Investigator</div><div class="nm">'+e(c.name||'')+'</div><div class="sub">'+e([c.archetype,c.player&&('played by '+c.player)].filter(Boolean).join(' · '))+'</div></div></div>'+
 '<div class="xp"><div><span class="lb">Total XP</span><b>'+(c.xpTotal||0)+'</b></div><div><span class="lb">Unused XP</span><b>'+(c.xpUnused||0)+'</b></div></div></div>'+
 '<div class="holders" aria-label="Dice pool holders">'+'<div class="dh"><i></i></div>'.repeat(6)+'</div>'+
 '<div class="row"><div class="panel" style="flex:1"><div class="h">Skills</div><div class="sks">'+skills+'</div></div>'+
 '<div style="width:2.45in;display:flex;flex-direction:column;gap:12px"><div class="panel"><div class="h">Horror</div><div class="fd"><span class="lb">Horror dice limit</span><div class="val">'+(c.horrorLimit||'')+'</div></div></div>'+
 '<div class="panel" style="flex:1;display:flex;flex-direction:column"><div class="h">Insight</div><div class="box2" style="margin:auto 0"><div><span class="lb">Limit</span><b>'+(c.insightLimit||1)+'</b></div><div><span class="lb">Remaining</span><b>'+(typeof c.insight==='number'?c.insight:'')+'</b></div></div></div></div></div>'+
 '<div class="panel"><div class="h">Personality</div>'+(c.personality?
 '<div class="pers"><div class="pt"><span class="lb">Trait</span><b>'+e(c.personality)+'</b></div><div class="pp"><span class="lb">Positive</span><p>'+e(c.positive||'')+'</p></div><div class="pp"><span class="lb">Negative</span><p>'+e(c.negative||'')+'</p></div></div>'
 :'<div class="row"><div class="fd" style="width:1.6in"><span class="lb">Trait</span><div class="ln"></div></div><div class="fd" style="flex:1"><span class="lb">Positive</span><div class="ln"></div></div><div class="fd" style="flex:1"><span class="lb">Negative</span><div class="ln"></div></div></div>')+'</div>'+
 '<div class="panel"><div class="h">Knacks</div>'+knRows.join('')+'</div>'+
 '<div class="panel"><div class="h">Weapons</div><table><thead><tr><th style="width:26%">Weapon</th><th>Skill</th><th>Range</th><th>Dmg</th><th>Injury</th><th>Ammo</th><th style="width:28%">Special</th></tr></thead><tbody>'+
 w.map(x=>x?'<tr><td><b>'+e(x.name)+'</b></td><td>'+e((x.skill||'').replace(' Combat',''))+'</td><td>'+e(x.range)+'</td><td>'+e(x.dmg)+'</td><td>'+e(x.inj)+'</td><td>'+pips(Number(x.ammoMax)||0)+(function(){if(!x.name||x.fr)return x.reloads>0?'<div style="font-size:11px;white-space:nowrap">+'+x.reloads+' reload'+(x.reloads===1?'':'s')+'</div>':'';var k=String(x.name).trim().toLowerCase(),g=(c.weapons||[]).filter(function(y){return !y.fr&&String(y.name||'').trim().toLowerCase()===k;});var n=g.reduce(function(a,y){return a+(y.reloads||0);},0);if(g.length>1&&g[0]!==x)return '<div style="font-size:11px;white-space:nowrap">shares reloads</div>';return n>0?'<div style="font-size:11px;white-space:nowrap">+'+n+' reload'+(n===1?'':'s')+(g.length>1?' (shared)':'')+'</div>':'';})()+'</td><td style="font-size:12px">'+e(x.special)+'</td></tr>':'<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')+'</tbody></table></div>'+
 '<div class="row" style="flex:1"><div class="panel" style="flex:1;display:flex;flex-direction:column"><div class="h">Injuries</div><div class="ruled"></div></div><div class="panel" style="flex:1;display:flex;flex-direction:column"><div class="h">Traumas &amp; Effects</div><div class="ruled"></div></div></div></section>'+
 // page 2
 '<section class="page"><div class="top"><div class="nm" style="font-size:28px">'+e(c.name||'')+'</div><div class="kick">Background &amp; Resources</div></div>'+
 '<div class="panel" style="display:flex;flex-direction:column;gap:6px"><div class="h">Background</div>'+f('Place of origin',c.bg&&c.bg.origin)+f('Family &amp; friends',c.bg&&c.bg.family,2)+
 '<div class="row"><div style="flex:2">'+f('Employment',c.bg&&c.bg.employment)+'</div><div style="flex:1">'+f('Weekly salary',c.bg&&c.bg.salary)+'</div></div>'+f('First supernatural encounter',c.bg&&c.bg.encounter,2)+f('Notable enemies',c.bg&&c.bg.enemies)+'</div>'+
 '<div class="row"><div class="panel" style="flex:1;display:flex;flex-direction:column;gap:6px"><div class="h">Mundane Resources</div><div class="fd"><span class="lb">Money</span><div class="val" style="font-family:\'Marcellus SC\',serif;font-size:20px">'+$(c.money)+'</div></div>'+
 '<span class="lb">Equipment</span>'+hab+luck+eq+(c.reloads?'<div class="eq"><b>Extra reloads</b> × '+c.reloads+'</div>':'')+lines(Math.max(2,6-(c.items||[]).length))+f('Vehicle',c.bg&&c.bg.vehicle)+f('Lodging',c.bg&&c.bg.lodging)+'</div>'+
 '<div class="panel" style="flex:1;display:flex;flex-direction:column;gap:6px"><div class="h">Supernatural Resources</div><span class="lb">Tomes</span><div class="tx">'+txt(c.tomes)+'</div>'+lines(1)+'<span class="lb">Relics</span><div class="tx">'+txt(c.relics)+'</div>'+lines(1)+'<span class="lb">Eldritch debts or favors</span><div class="tx">'+txt(c.debts)+'</div>'+lines(1)+'</div></div>'+
 '<div class="panel" style="flex:1"><div class="h">Quick Reference</div><div class="qr">'+
 '<div><b>Tests.</b> Spend dice and roll. Any die at or above the skill rating is a success.</div><div><b>Actions.</b> Simple actions spend dice without rolling; complex actions roll.</div>'+
 '<div><b>Damage.</b> Each point lowers the pool limit by 1. At 0 you are wounded.</div><div><b>Strain.</b> Restore the pool limit to max, then suffer an injury at the end of your turn.</div>'+
 '<div><b>Injury.</b> More successes than a weapon’s injury rating also inflicts an injury (1d6 + 1 per injury).</div><div><b>Horror.</b> Refill horror dice first, up to your limit. A 1 on a horror die means a trauma.</div>'+
 '<div><b>Insight.</b> Refills each session. Spend for +1 success, advantage, a clue, or a handy detail.</div><div><b>Ammo.</b> Mark one off only when an attack rolls a 1. Reloading is a simple action.</div></div></div></section>'+'<script>var SHEET='+sheetData(c)+';'+SHEET_JS+'function setTheme(t){document.body.className=t==="ledger"?"ledger":"";if(window.fit)setTimeout(fit,50);document.getElementById("theme").value=t;try{localStorage.setItem("apl-sheet-theme",t)}catch(e){}}var _t="classic";try{_t=localStorage.getItem("apl-sheet-theme")||"classic"}catch(e){}setTheme(_t);var PAPERS={letter:["8.5in","11in","letter"],a4:["210mm","297mm","A4"],legal:["8.5in","14in","legal"]};function setPaper(k){var p=PAPERS[k]||PAPERS.letter;if(!PAPERS[k])k="letter";document.documentElement.style.setProperty("--pw",p[0]);document.documentElement.style.setProperty("--ph",p[1]);var st=document.getElementById("pagesize");if(!st){st=document.createElement("style");st.id="pagesize";document.head.appendChild(st);}st.textContent="@page{size:"+p[2]+";margin:0}";document.getElementById("paper").value=k;try{localStorage.setItem("apl-sheet-paper",k)}catch(e){}setTimeout(fit,30);}function fit(){document.querySelectorAll(".page").forEach(function(pg){var w=pg.querySelector(".fit");if(!w){w=document.createElement("div");w.className="fit";while(pg.firstChild)w.appendChild(pg.firstChild);pg.appendChild(w);}w.style.transform="";w.style.width="";w.style.flex="none";w.style.height="auto";var cs=getComputedStyle(pg);var avail=pg.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);var need=w.scrollHeight;if(need>avail+1){var r=avail/need;w.style.transform="scale("+r+")";w.style.width=(100/r)+"%";w.style.height=need+"px";}else{w.style.height="";w.style.flex="";}});}var _p="letter";try{_p=localStorage.getItem("apl-sheet-paper")||"letter"}catch(e){}setPaper(_p);fit();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);window.addEventListener("load",fit);window.addEventListener("beforeprint",fit);Array.prototype.forEach.call(document.images,function(i){i.addEventListener("load",fit);});<\/script></body></html>';
}
return {ARCH,knacksFor,knackText,maxFor,TRAITS,WEAPONS,GEAR,sheetHtml};
})();
