/* Arkham Ledger — public-domain paintings and engravings used as campaign banners when a campaign has no picture
   of its own. They're shown straight from Wikimedia Commons (no copies stored here). Every one is out of copyright:
   the artists died long ago and the works were published before 1929. */
window.CAMPAIGN_ART=[
 {f:'Atkinson Grimshaw - A Moonlit Evening (1880).jpg',t:'A Moonlit Evening',a:'John Atkinson Grimshaw, 1880'},
 {f:'John Atkinson Grimshaw - Old English House by Moonlight - 2013.907 - Museum of Fine Arts.jpg',t:'Old English House by Moonlight',a:'John Atkinson Grimshaw'},
 {f:'Silver Moonlight by John Atkinson Grimshaw.jpg',t:'Silver Moonlight',a:'John Atkinson Grimshaw'},
 {f:'John Atkinson Grimshaw - A moonlit lane.jpg',t:'A Moonlit Lane',a:'John Atkinson Grimshaw'},
 {f:'John Atkinson Grimshaw - Liverpool Quay by Moonlight (1887).jpg',t:'Liverpool Quay by Moonlight',a:'John Atkinson Grimshaw, 1887'},
 {f:'John Atkinson Grimshaw (1836-1893) - The Thames by Moonlight with Southwark Bridge, London - 1781 - Guildhall Art Gallery.jpg',t:'The Thames by Moonlight',a:'John Atkinson Grimshaw'},
 {f:'John Atkinson Grimshaw - Whitby - B2012.28 - Yale Center for British Art.jpg',t:'Whitby',a:'John Atkinson Grimshaw'},
 {f:'Caspar David Friedrich - The Abbey in the Oakwood - WGA08240.jpg',t:'The Abbey in the Oakwood',a:'Caspar David Friedrich, 1810'},
 {f:'Friedrich - Two Men Contemplating the Moon.jpg',t:'Two Men Contemplating the Moon',a:'Caspar David Friedrich'},
 {f:'Caspar David Friedrich - Mondaufgang über dem Meer.jpg',t:'Moonrise over the Sea',a:'Caspar David Friedrich, 1822'},
 {f:'Caspar David Friedrich - Monk by the Sea.jpg',t:'The Monk by the Sea',a:'Caspar David Friedrich, 1810'},
 {f:'Arnold Böcklin - Die Toteninsel III (Alte Nationalgalerie, Berlin).jpg',t:'Isle of the Dead',a:'Arnold Böcklin, 1883'},
 {f:'Arnold Böcklin - Die Toteninsel I (Basel, Kunstmuseum).jpg',t:'Isle of the Dead (first version)',a:'Arnold Böcklin, 1880'},
 {f:'Albert Pinkham Ryder - Moonlit Cove - Google Art Project.jpg',t:'Moonlit Cove',a:'Albert Pinkham Ryder'},
 {f:'James Abbott McNeill Whistler - Nocturne- Blue and Silver - Chelsea - Google Art Project.jpg',t:'Nocturne: Blue and Silver, Chelsea',a:'James McNeill Whistler, 1871'},
 {f:'Whistler Nocturne Blue and Gold - Southampton Water 1872.jpg',t:'Nocturne: Blue and Gold, Southampton Water',a:'James McNeill Whistler, 1872'},
 {f:'Childe Hassam - Gloucester Harbour (c. 1899).jpg',t:'Gloucester Harbor',a:'Childe Hassam, c. 1899'},
 {f:'Stage Fort across Gloucester Harbor MET DT5586.jpg',t:'Stage Fort across Gloucester Harbor',a:'Fitz Henry Lane, 1862'},
 {f:'Paul Gustave Dore Raven1.jpg',t:'The Raven',a:'Gustave Doré, 1884'},
 {f:'Paul Gustave Dore Raven14.jpg',t:'The Raven',a:'Gustave Doré, 1884'},
 {f:'Paul Gustave Dore Raven24.jpg',t:'The Raven',a:'Gustave Doré, 1884'}
];
// Wikimedia serves a resized copy of any Commons file at this address.
window.artUrl=function(i,w){var x=window.CAMPAIGN_ART[i];return x?'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(x.f.replace(/ /g,'_'))+'?width='+(w||500):'';};
// Which painting a campaign shows: the owner's choice, otherwise one picked from the campaign id.
window.artFor=function(c){var n=window.CAMPAIGN_ART.length;if(c&&Number.isInteger(c.art)&&c.art>=0&&c.art<n)return c.art;var h=0,s=String((c&&(c.id||c.name))||'x');for(var k=0;k<s.length;k++)h=(h*31+s.charCodeAt(k))>>>0;return h%n;};
