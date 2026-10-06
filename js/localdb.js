/* Try it without an account: a campaign kept only in this browser's storage.
   LocalFB.app() looks enough like a Firebase app (auth + Firestore) for the ledger to run unchanged.
   Everything is saved in localStorage under LOCAL_KEY; signing in offers to copy it to the account.
   Nothing here talks to a server. */
(function(){
  var LOCAL_KEY='apl-local-v1';
  window.LOCAL_CAMP='onthisdevice';         // the campaign id the ledger uses for the device-only campaign
  window.LOCAL_UID='local';
  var store=null,subs=[],saveT=0,n=0,full=false;
  function load(){if(store)return store;try{var j=JSON.parse(localStorage.getItem(LOCAL_KEY)||'null');store=j&&j.docs?j.docs:{};}catch(e){store={};}return store;}
  function persist(){clearTimeout(saveT);saveT=setTimeout(function(){
    try{localStorage.setItem(LOCAL_KEY,JSON.stringify({v:1,saved:Date.now(),docs:store}));full=false;}
    catch(e){if(!full){full=true;window.dispatchEvent(new CustomEvent('local-full'));}}
  },150);}
  var clone=function(x){return x===undefined?undefined:JSON.parse(JSON.stringify(x));};
  // Special values (stand-ins for firebase.firestore.FieldValue)
  var FV={delete:function(){return {__lfv:'del'};},serverTimestamp:function(){return {__lfv:'ts'};},
    arrayUnion:function(){return {__lfv:'union',v:[].slice.call(arguments)};},arrayRemove:function(){return {__lfv:'remove',v:[].slice.call(arguments)};},
    increment:function(k){return {__lfv:'inc',v:k};}};
  function val(old,v){
    if(v&&typeof v==='object'&&v.__lfv){
      if(v.__lfv==='ts')return Date.now();
      if(v.__lfv==='union'){var a=Array.isArray(old)?old.slice():[];v.v.forEach(function(x){if(a.indexOf(x)<0)a.push(x);});return a;}
      if(v.__lfv==='remove'){return (Array.isArray(old)?old:[]).filter(function(x){return v.v.indexOf(x)<0;});}
      if(v.__lfv==='inc')return (Number(old)||0)+v.v;
    }
    if(v&&typeof v==='object'&&!Array.isArray(v)){var o={};Object.keys(v).forEach(function(k){if(!(v[k]&&v[k].__lfv==='del'))o[k]=val(undefined,v[k]);});return o;}
    return v===undefined?null:clone(v);
  }
  function applyPatch(obj,patch,dotted){
    Object.keys(patch).forEach(function(k){
      var path=dotted?k.split('.'):[k],o=obj;
      for(var i=0;i<path.length-1;i++){if(!o[path[i]]||typeof o[path[i]]!=='object')o[path[i]]={};o=o[path[i]];}
      var last=path[path.length-1],v=patch[k];
      if(v&&v.__lfv==='del')delete o[last];else o[last]=val(o[last],v);
    });
  }
  function fire(){setTimeout(function(){subs.slice().forEach(function(f){try{f();}catch(e){console.warn(e);}});},0);}
  var meta={fromCache:false,hasPendingWrites:false};
  function snap(p){var s=load();return {id:p.split('/').pop(),exists:p in s,data:function(){return clone(s[p]);},get:function(k){return s[p]?clone(s[p][k]):undefined;},metadata:meta,ref:docRef(p)};}
  function docRef(p){
    return {id:p.split('/').pop(),path:p,
      get:function(){return Promise.resolve(snap(p));},
      set:function(d,o){var s=load();if(o&&o.merge&&s[p])applyPatch(s[p],d,false);else{s[p]={};applyPatch(s[p],d,false);}persist();fire();return Promise.resolve();},
      update:function(d){var s=load();if(!(p in s)){var e=new Error('No document to update');e.code='not-found';return Promise.reject(e);}applyPatch(s[p],d,true);persist();fire();return Promise.resolve();},
      delete:function(){var s=load();delete s[p];persist();fire();return Promise.resolve();},
      collection:function(c){return query(p+'/'+c,[],null,0);},
      onSnapshot:function(cb,err){var f=function(){cb(snap(p));};subs.push(f);setTimeout(f,0);return function(){var i=subs.indexOf(f);if(i>=0)subs.splice(i,1);};}};
  }
  function cmp(a,op,b){
    switch(op){case '==':return a===b;case '!=':return a!==b;case '<':return a<b;case '<=':return a<=b;case '>':return a>b;case '>=':return a>=b;
      case 'array-contains':return Array.isArray(a)&&a.indexOf(b)>=0;case 'in':return Array.isArray(b)&&b.indexOf(a)>=0;}return false;
  }
  function query(c,conds,order,lim){
    function run(){
      var s=load(),depth=c.split('/').length+1;
      var ks=Object.keys(s).filter(function(k){return k.indexOf(c+'/')===0&&k.split('/').length===depth&&conds.every(function(w){return cmp(s[k][w[0]],w[1],w[2]);});});
      if(order)ks.sort(function(a,b){var x=s[a][order[0]],y=s[b][order[0]];return (x<y?-1:x>y?1:0)*(order[1]==='desc'?-1:1);});
      if(lim)ks=ks.slice(0,lim);
      var docs=ks.map(snap);
      return {docs:docs,size:docs.length,empty:!docs.length,metadata:meta,forEach:function(fn){docs.forEach(fn);}};
    }
    return {
      where:function(f,op,v){return query(c,conds.concat([[f,op,v]]),order,lim);},
      orderBy:function(f,d){return query(c,conds,[f,d||'asc'],lim);},
      limit:function(l){return query(c,conds,order,l);},
      get:function(){return Promise.resolve(run());},
      onSnapshot:function(cb){var f=function(){cb(run());};subs.push(f);setTimeout(f,0);return function(){var i=subs.indexOf(f);if(i>=0)subs.splice(i,1);};},
      doc:function(id){return docRef(c+'/'+(id||('l'+Date.now().toString(36)+(++n))));},
      add:function(d){var r=docRef(c+'/'+('l'+Date.now().toString(36)+(++n)));return r.set(d).then(function(){return r;});}
    };
  }
  var fs={doc:docRef,collection:function(c){return query(c,[],null,0);},
    batch:function(){var ops=[];return {set:function(r,d,o){ops.push(function(){return r.set(d,o);});},update:function(r,d){ops.push(function(){return r.update(d);});},delete:function(r){ops.push(function(){return r.delete();});},
      commit:function(){return ops.reduce(function(pr,o){return pr.then(o);},Promise.resolve());}};}};
  var user={uid:window.LOCAL_UID,isAnonymous:false,email:'',emailVerified:false,providerData:[]};
  var auth={currentUser:user,onAuthStateChanged:function(cb){setTimeout(function(){cb(user);},0);return function(){};},signOut:function(){return Promise.resolve();}};
  var app={name:'beta-local',auth:function(){return auth;},firestore:function(){return fs;}};

  window.LocalFB={
    app:function(){return app;},
    FieldValue:FV,
    exists:function(){return !!load()['campaigns/'+window.LOCAL_CAMP];},
    // Everything stored for the device-only campaign, as [path relative to the campaign, data] pairs.
    dump:function(){var s=load(),pre='campaigns/'+window.LOCAL_CAMP+'/';return {camp:clone(s['campaigns/'+window.LOCAL_CAMP]),docs:Object.keys(s).filter(function(k){return k.indexOf(pre)===0;}).map(function(k){return [k.slice(pre.length),clone(s[k])];})};},
    clear:function(){store={};try{localStorage.removeItem(LOCAL_KEY);}catch(e){}},
    // A fresh device-only campaign: you're the owner and the GM, with one blank investigator to start.
    create:function(name){
      var s=load(),c='campaigns/'+window.LOCAL_CAMP;
      if(s[c])return;
      s[c]={name:name||'My campaign',ownerUid:window.LOCAL_UID,gmUid:window.LOCAL_UID,memberIds:[window.LOCAL_UID],roles:{},names:{},created:Date.now(),local:true};
      s[c].roles[window.LOCAL_UID]='owner';s[c].names[window.LOCAL_UID]='You';
      persist();clearTimeout(saveT);try{localStorage.setItem(LOCAL_KEY,JSON.stringify({v:1,saved:Date.now(),docs:s}));}catch(e){}
    },
    // In the ledger: make firebase.app('beta') and FieldValue point at the device-only store.
    activate:function(){
      var fb=window.firebase;if(!fb)return;
      var realApp=fb.app;fb.app=function(nm){return nm==='beta'?app:realApp.apply(fb,arguments);};
      try{if(fb.firestore)fb.firestore.FieldValue=FV;}catch(e){}
    }
  };
})();
