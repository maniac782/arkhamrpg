/* Player options from other books that live on the sheet as lists: rituals, relics and favors.
   Each is offered only when the campaign owns its book (src); pg = the book's page.
   Text is a short summary in our own words, not the book's. Names are saved on the sheet in English. */
window.APL_EXTRAS = {
// Rituals (Songs of New Orleans, The Tradition of Voodoo). r: rarity, kw: keywords, d: how it works, sb: support bonus.
rituals:[
{n:tk('Augment'),src:'sn',pg:66,r:tk('Uncommon'),kw:tk('Spell, Faith'),
 d:tk('Using a piece or picture of an ancestor or animal, the lead channeler picks a skill and makes a complex Lore action: for 24 hours, +1 to each die with that skill. Each 1 rolled with it costs 1 horror.'),
 sb:tk('Each supporting channeler who passes a difficult complex Intuition action adds another skill.')},
{n:tk('Break Binding'),src:'sn',pg:66,r:tk('Common'),kw:tk('Spell, Faith'),
 d:tk('A complex Lore action over a small, brittle bone: for seven days, whoever is bound and snaps that bone breaks free of their chains or bindings.'),
 sb:tk('Each supporting channeler who passes a complex Wits action lets one more bone be charmed.')},
{n:tk('Influence'),src:'sn',pg:67,r:tk('Rare'),kw:tk('Spell'),
 d:tk('With a hardwood effigy bound in string or hair, a difficult complex Lore action on someone the lead channeler knows by name: if their dice pool maximum is 4 or lower, they’re compelled to do a task, or their feelings about someone change, for as long as the effigy lasts.'),
 sb:tk('Each supporting channeler who passes a difficult complex Presence action raises the dice pool maximum it can affect by 1.')},
{n:tk('Hex'),src:'sn',pg:67,r:tk('Rare'),kw:tk('Spell, Faith'),
 d:tk('With a piece of the target (hair, nail clippings, blood), a complex Lore action: for 24 hours the target takes −1 to each die on every action. Two or more 1s turn it back: every channeler takes the −1 for 24 hours and suffers 1 horror.'),
 sb:tk('Each supporting channeler who passes a difficult complex Intuition action adds a Minor NPC close to the target (a relative or underling).')},
{n:tk('Overgrowth'),src:'sn',pg:68,r:tk('Uncommon'),kw:tk('Spell, Faith'),
 d:tk('After marking the ground with salt, cornmeal or blood, a complex Intuition action: bare soil within 50 ft (10 ft more per extra success) chokes with plants for 24 hours, and anyone but the channelers moves through it at half speed.'),
 sb:tk('Each supporting channeler who passes a complex Intuition action adds 24 hours; with four, it’s permanent.')},
{n:tk('Animal Control'),src:'sn',pg:68,r:tk('Uncommon'),kw:tk('Spell, Faith'),
 d:tk('With fur, scales, a claw or a fang of a species, a complex Intuition action calls an animal of that kind with a dice pool maximum of 2 or less. For 24 hours it follows simple orders and can scout and report back.'),
 sb:tk('Each supporting channeler who passes a complex Intuition action raises the dice pool maximum it can call by 1.')},
{n:tk('Restorative Healing'),src:'sn',pg:69,r:tk('Uncommon'),kw:tk('Faith'),
 d:tk('With the patient surrounded by vèvè and healing herbs, a complex Lore action: they heal every instance of one injury of their choice, and their dice pool limit returns to its maximum.'),
 sb:tk('Each supporting channeler who passes a complex Lore action heals one more kind of injury.')},
{n:tk('Imbue Charm'),src:'sn',pg:69,r:tk('Rare'),kw:tk('Spell, Faith'),
 d:tk('With a pouch of another known ritual’s components and a wearable item, a very difficult complex Lore action binds that ritual into the item (a gris-gris). Its wearer, knowing the ritual, can later channel it with a simple action and 1 insight, as if they had just barely succeeded. Then it must be imbued again.'),
 sb:tk('Each supporting channeler who passes a very difficult complex Lore action adds one more use before reimbuing.')}
],
// Relics (Songs of New Orleans, Tools of Investigation).
relics:[
{n:tk('The Thunderbolt'),src:'sn',pg:82,r:tk('Unique'),alt:'Earthshaker, The Rattler, Boogie-Woogie Bari',
 d:tk('An enchanted, silver-plated baritone saxophone. A complex Presence action plays a sonic blast: everyone else within 30 ft discards every die in their pool and must pass an Athletics reaction or fall prone. It can also damage objects and buildings, and it’s always loud.')},
{n:tk('Chef Paul’s Utensils'),src:'sn',pg:83,r:tk('Unique'),alt:'Tasting Spoons, The Sous Chef’s Friend',
 d:tk('An enchanted roll of engraved silver cutlery. Eating with them adds two dice to actions and reactions to resist poisons, toxins and allergens, and a complex Knowledge action names every ingredient in a dish, poisons included.')},
{n:tk('The Finger of St. Roch'),src:'sn',pg:83,r:tk('Unique'),alt:'The Healer’s Hand, The Relic of Montpelier, The Confessor’s Boon',
 d:tk('A jeweled gold reliquary holding a saint’s mummified finger. Its holder never suffers the Sickened injury (they suffer no injury instead) and shrugs off minor ailments like colds and food poisoning.')}
],
// Favors (Songs of New Orleans, Tools of Investigation). xp: cost to accept, ben: benefits, dec: when declined, lose: how it’s lost.
favors:[
{n:tk('Favor from the Arabella Barn Drivers'),src:'sn',pg:77,xp:1,
 ben:tk('Name your driver when boarding a streetcar and roll 1d6: on 4+ the ride is free. You can also ask your driver for rumors and gossip.'),
 dec:tk('Drivers think you’re a snob; it won’t be offered again.'),
 lose:tk('Badmouthing streetcar drivers or being seen taking a taxi; it won’t be offered again.')},
{n:tk('An Alderman’s Favor'),src:'sn',pg:78,xp:2,
 ben:tk('The alderman helps with city government: introductions, permits and red tape, and in a pinch bigger risks like getting you out of jail.'),
 dec:tk('The alderman distrusts you: disadvantage on complex actions to influence them.'),
 lose:tk('After one risky, substantial favor (“that makes us square”), with no penalty; or by publicly embarrassing them.')},
{n:tk('Steamboat Captain’s Favor'),src:'sn',pg:78,xp:2,
 ben:tk('Free passage on the Mississippi for you and allies while the captain is in port, short detours (under a day), or up to 200 lb of cargo instead.'),
 dec:tk('None.'),
 lose:tk('Violence or insults toward the captain or crew, or bringing them serious trouble. You may be put ashore on the spot.')},
{n:tk('Voodoo Practitioner’s Favor'),src:'sn',pg:78,xp:1,
 ben:tk('Once per session the practitioner joins your ritual as a supporting channeler, or performs a ritual for you (the GM decides which they know).'),
 dec:tk('None.'),
 lose:tk('Having them perform a ritual for you (no penalty), or if they suffer horror while supporting your ritual.')},
{n:tk('Favor of The Polks'),src:'sn',pg:78,xp:2,
 ben:tk('Once per session the bootlegging Polks get you an item, even an illegal one, within 24 hours; very expensive things may only be loaned.'),
 dec:tk('None.'),
 lose:tk('Asking for something worth $100+ without passing a complex Presence action, or the Polks deciding you’re square. Getting caught committing a crime with their item can bring a hit on you.')},
{n:tk('Favor of Buckner'),src:'sn',pg:79,xp:1,
 ben:tk('Introductions to important people, and interest-free loans of up to $2,000, one at a time.'),
 dec:tk('He insists on a $50 gift; refusing that too may enrage him.'),
 lose:tk('Making no effort to repay a loan for two months: he collects, legally or not.')}
]
};
