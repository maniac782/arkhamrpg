/* House rules for the original site (arkhamrpg.web.app without a campaign).
   Campaigns keep their own house rules in Settings instead. */
window.HOUSE_RULES = {
  weapons: [
    {n:'Slingshot', s:'Ranged Combat', d:'1', i:'\u2013', r:'40 ft', a:2, rc:0, fr:true, c:0, sp:'House rule. Free reloads.'}
  ],
  rules: [
    // Uncomment to let any gun use any gun's extra reloads:
    // {id:'universalAmmo', n:'Universal ammo', note:'Reloads are shared: any gun can use any gun\u2019s extra reloads.'}
  ],
  gear: [
    {cat:'Protection', n:'Fine Heavy Clothes', c:105, note:'House rule. Counts as heavy clothing and fine clothing: \u22121 damage from melee attacks (minimum 1).'},
    {cat:'Protection', n:'Cape', c:15, note:'House rule. Counts as flowing clothing: reroll a reaction to avoid a ranged attack once.'}
  ]
};
