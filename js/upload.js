/* Pictures go to Cloud Storage instead of inside database documents.
   storeImage(dataUrl, folder) uploads a JPEG made by the cropper and resolves to its download URL.
   If the upload can't happen (offline, Storage unavailable), it resolves to the original data URL,
   which the database still accepts, so saving a picture never fails because of Storage.
   Folders: 'users/<uid>' for profile photos, 'campaigns/<cid>/<uid>' for everything in a campaign. */
(function(){
  var BUCKET='arkham-ledger.firebasestorage.app';
  var PREFIX='https://firebasestorage.googleapis.com/v0/b/'+BUCKET+'/o/';
  window.isStoredImage=function(u){return typeof u==='string'&&u.indexOf(PREFIX)===0&&/^[^"'<>\s]+$/.test(u);};
  // A picture we can safely put in an <img src>: one of ours in Storage, or an inline JPEG.
  window.imgOk=function(u){return typeof u==='string'&&(/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(u)||window.isStoredImage(u));};
  function storage(){
    try{var app=firebase.app('beta');return app.storage?app.storage():null;}catch(e){return null;}
  }
  function rand(){return (window.crypto&&crypto.randomUUID)?crypto.randomUUID().replace(/-/g,'').slice(0,20):Date.now().toString(36)+Math.random().toString(36).slice(2,10);}
  window.storeImage=function(dataUrl,folder){
    var st=storage();
    if(!st||!folder||typeof dataUrl!=='string'||dataUrl.indexOf('data:image/jpeg')!==0||(navigator.onLine===false))return Promise.resolve(dataUrl);
    var ref=st.ref(folder+'/'+rand()+'.jpg');
    var up=ref.putString(dataUrl,'data_url',{contentType:'image/jpeg',cacheControl:'public,max-age=31536000,immutable'})
      .then(function(){return ref.getDownloadURL();});
    var timeout=new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'));},20000);});
    return Promise.race([up,timeout]).then(function(url){return window.isStoredImage(url)?url:dataUrl;},function(e){console.warn('Picture upload',e);return dataUrl;});
  };
  // Best-effort removal of a stored picture that's no longer used (only works for pictures you uploaded).
  window.dropImage=function(url){
    var st=storage();if(!st||!window.isStoredImage(url))return Promise.resolve();
    try{return st.refFromURL(url).delete().catch(function(){});}catch(e){return Promise.resolve();}
  };
  // Removes every stored picture under a folder (campaign owner wiping a campaign, or your own account).
  window.dropFolder=function(folder){
    var st=storage();if(!st||!folder)return Promise.resolve();
    function walk(ref){return ref.listAll().then(function(r){return Promise.all(r.items.map(function(i){return i.delete().catch(function(){});}).concat(r.prefixes.map(walk)));});}
    return walk(st.ref(folder)).catch(function(){});
  };
})();
