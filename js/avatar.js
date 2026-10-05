/* Arkham Ledger — the little round account icon: an uploaded photo, or the username's first letter on a colour chosen on the account page. */
window.AVATAR_COLORS={slate:'#56606f',crimson:'#a3322a',rust:'#b0582c',forest:'#2f6b4f',teal:'#1f6f78',navy:'#2d4a8a',violet:'#6a3d8f',rose:'#9b3b63',brass:'#8a6417'};
window.acctIcon=function(name,prof){
  prof=prof||{};
  if(typeof prof.photo==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(prof.photo))return '<img class="av" src="'+prof.photo+'" alt="">';
  var c=window.AVATAR_COLORS[prof.color]||window.AVATAR_COLORS.slate;
  var ic=String(name||'?').charAt(0).toUpperCase();
  return '<span class="av" aria-hidden="true" style="background:'+c+'">'+String(ic).replace(/[&<>"']/g,'')+'</span>';
};
