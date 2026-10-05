/* Arkham Ledger — the little round account icon: a colour and either the username's first letter or a symbol, chosen on the account page. */
window.AVATAR_COLORS={slate:'#56606f',crimson:'#a3322a',rust:'#b0582c',forest:'#2f6b4f',teal:'#1f6f78',navy:'#2d4a8a',violet:'#6a3d8f',rose:'#9b3b63',brass:'#8a6417'};
window.AVATAR_ICONS=['\u2726','\u263E','\u2720','\u2660','\u2625','\u2756','\u2693','\u2727'];
window.acctIcon=function(name,prof){
  prof=prof||{};
  if(typeof prof.photo==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(prof.photo))return '<img class="av" src="'+prof.photo+'" alt="">';
  var c=window.AVATAR_COLORS[prof.color]||window.AVATAR_COLORS.slate;
  var ic=window.AVATAR_ICONS.indexOf(prof.icon)>=0?prof.icon:String(name||'?').charAt(0).toUpperCase();
  return '<span class="av" aria-hidden="true" style="background:'+c+'">'+String(ic).replace(/[&<>"']/g,'')+'</span>';
};
