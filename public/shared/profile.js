/* Saha persistent player profile + avatar transport */
(function(){
  const KEY='saha.profile.v1';
  function read(){let p={id:'',name:'لاعب',avatar:'',avatarType:'image'};try{p={...p,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}if(!p.id){p.id=(crypto.randomUUID?crypto.randomUUID():('p-'+Date.now()+'-'+Math.random().toString(36).slice(2)));try{localStorage.setItem(KEY,JSON.stringify(p))}catch(e){}}return p}
  function write(p){try{localStorage.setItem(KEY,JSON.stringify(p));return true}catch(e){return false}}
  window.sahaGetProfile=read; window.sahaSaveProfile=write;
  window.sahaProfileAvatar=function(){const p=read();return p.avatar||''};
  window.sahaProfilePayload=function(){const p=read();return {avatar:p.avatar||''}}
  const originalIO=window.io;
  if(typeof originalIO==='function'&&!window.__sahaProfileIO){
    window.__sahaProfileIO=true;
    window.io=function(){const sock=originalIO.apply(this,arguments);if(sock&&!sock.__sahaAvatarEmit){const emit=sock.emit.bind(sock);sock.emit=function(event,payload,...rest){if(['room:create','room:join','room:resume'].includes(event)){payload={...(payload||{}),avatar:window.sahaProfileAvatar()}}return emit(event,payload,...rest)};sock.__sahaAvatarEmit=true}return sock};
  }
})();
