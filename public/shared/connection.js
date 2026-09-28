(function(){
  if(document.body) document.body.classList.add('arena-v2');
  if(document.getElementById('sahaConnectionStatus')) return;
  const box=document.createElement('div');box.id='sahaConnectionStatus';
  box.innerHTML='<span class="sahaConnDot"></span><span class="sahaConnText">جاري الاتصال…</span>';
  document.body.appendChild(box);
  function socketReady(){try{return typeof socket!=='undefined'&&socket&&socket.connected===true}catch(e){return false}}
  function update(){
    const net=navigator.onLine!==false, connected=socketReady();
    box.classList.toggle('offline',!net||!connected);box.classList.toggle('online',net&&connected);
    box.querySelector('.sahaConnText').textContent=!net?'🔴 لا يوجد اتصال بالإنترنت':connected?'🟢 متصل':'🟡 جاري الاتصال بالسيرفر…';
  }
  window.addEventListener('online',update);window.addEventListener('offline',update);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
  setInterval(update,700);update();
  window.sahaConnectionUpdate=update;
})();
