/* Arkham Ledger — public-domain weird and cosmic-horror art (sea monsters, Doré, Harry Clarke's Poe, 1928 Weird Tales covers, Böcklin, Redon, Goya, Fuseli) used as campaign banners when a campaign has no picture
   of its own. They're shown straight from Wikimedia Commons (no copies stored here). Every one is out of copyright:
   the artists died long ago and the works were published before 1929. */
window.CAMPAIGN_ART=[
 {f:'Denys de Montfort Poulpe Colossal.jpg',t:'The Colossal Octopus',a:'Pierre Denys de Montfort, 1801'},
 {f:'Naturalistslibra25-p326a-kraken.jpg',t:'The Kraken',a:'The Naturalist\u2019s Library, 19th century'},
 {f:'Destruction of Leviathan.png',t:'The Destruction of Leviathan',a:'Gustave Dor\u00e9, 1865'},
 {f:'Dore-I Watched the Water-Snakes.jpg',t:'I Watched the Water-Snakes',a:'Gustave Dor\u00e9, The Rime of the Ancient Mariner, 1876'},
 {f:'Rime of the Ancient Mariner-Albatross-Dore.jpg',t:'The Ice Was All Around',a:'Gustave Dor\u00e9, The Rime of the Ancient Mariner, 1876'},
 {f:'Harry Clarke The Fall of the House of Usher.jpg',t:'The Fall of the House of Usher',a:'Harry Clarke, 1919'},
 {f:'PrematureBurial-Clarke.jpg',t:'The Premature Burial',a:'Harry Clarke, 1919'},
 {f:'Valdemar-Clarke.jpg',t:'The Facts in the Case of M. Valdemar',a:'Harry Clarke, 1919'},
 {f:'Ligeia-Clarke.jpg',t:'Ligeia',a:'Harry Clarke, 1919'},
 {f:'Weird Tales February 1928.jpg',t:'Weird Tales, February 1928',a:'Weird Tales magazine'},
 {f:'Weird Tales July 1928.jpg',t:'Weird Tales, July 1928',a:'Weird Tales magazine'},
 {f:'Weird Tales August 1928.jpg',t:'Weird Tales, August 1928',a:'Weird Tales magazine'},
 {f:'Arnold Böcklin - Die Pest.jpg',t:'The Plague',a:'Arnold B\u00f6cklin, 1898'},
 {f:'Arnold Böcklin - Die Toteninsel III (Alte Nationalgalerie, Berlin).jpg',t:'Isle of the Dead',a:'Arnold B\u00f6cklin, 1883'},
 {f:'Odilon Redon - The Cyclops, c. 1914.jpg',t:'The Cyclops',a:'Odilon Redon, c. 1914'},
 {f:'Redon.eye-balloon.jpg',t:'The Eye, Like a Strange Balloon',a:'Odilon Redon, 1878'},
 {f:'Redon smiling-spider.jpg',t:'The Smiling Spider',a:'Odilon Redon, 1881'},
 {f:'John Martin - Pandemonium - WGA14149.jpg',t:'Pandemonium',a:'John Martin, 1841'},
 {f:'Francisco de Goya- The Sleep of Reason Produces Monsters.JPG',t:'The Sleep of Reason Produces Monsters',a:'Francisco de Goya, 1799'},
 {f:'Henry Fuseli (1741–1825), The Nightmare, 1781.jpg',t:'The Nightmare',a:'Henry Fuseli, 1781'},
 {f:'Haeckel Discomedusae 8.jpg',t:'Discomedusae',a:'Ernst Haeckel, Art Forms in Nature, 1904'}
];
// Wikimedia serves a resized copy of any Commons file at this address.
window.artUrl=function(i,w){var x=window.CAMPAIGN_ART[i];return x?'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(x.f.replace(/ /g,'_'))+'?width='+(w||500):'';};
// Which painting a campaign shows: the owner's choice, otherwise one picked from the campaign id.
window.artFor=function(c){var n=window.CAMPAIGN_ART.length;if(c&&Number.isInteger(c.art)&&c.art>=0&&c.art<n)return c.art;var h=0,s=String((c&&(c.id||c.name))||'x');for(var k=0;k<s.length;k++)h=(h*31+s.charCodeAt(k))>>>0;return h%n;};
