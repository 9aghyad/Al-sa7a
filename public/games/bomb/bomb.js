const socket=io();
let G=null,me=null,role='',code='',sessionToken='',pendingAnswer='',resumeBusy=false;
function bombSessionKey(c){return 'bomb.session.'+String(c||'').toUpperCase()}
function loadBombSession(){try{return JSON.parse(localStorage.getItem(bombSessionKey(code))||'null')}catch(e){return null}}
function saveBombSession(){if(!code||!sessionToken)return;try{const p=(G?.players||[]).find(x=>x.id===me);const t=p?.team||new URLSearchParams(location.search).get('team')||'A';const n=p?.name||new URLSearchParams(location.search).get('name')||'لاعب';localStorage.setItem(bombSessionKey(code),JSON.stringify({code,name:n,team:t,token:sessionToken,savedAt:Date.now()}))}catch(e){}}
function clearBombSession(){try{localStorage.removeItem(bombSessionKey(code))}catch(e){}}

const aud={buzz:new Audio('/audio/buzz.wav'),correct:new Audio('/audio/correct.wav'),wrong:new Audio('/audio/wrong.wav'),reveal:new Audio('/audio/reveal.wav'),suspense:new Audio('/audio/suspense.wav'),explosion:new Audio('/audio/explosion.wav'),tick:new Audio('/audio/tick.wav'),win:new Audio('/audio/win.wav')};
function sound(k){try{const a=aud[k];if(!a)return;a.currentTime=0;a.play().catch(()=>{});}catch(e){}}
function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function set(x){const el=document.getElementById('app');if(el)el.innerHTML=x}
function toastLocal(x){let el=document.getElementById('localToast');if(!el){el=document.createElement('div');el.id='localToast';el.className='bombLocalToast';document.body.appendChild(el)}el.textContent=x;clearTimeout(window.__toastT);window.__toastT=setTimeout(()=>el.remove(),2600)}
function tick(until,id){clearInterval(window.__bt);let last=-1;const tense={};const run=()=>{const e=document.getElementById(id);if(!e){clearInterval(window.__bt);return}const n=Math.max(0,Math.ceil((until-Date.now())/1000));e.textContent=n;e.classList.toggle('dangerTimer',n<=3);if(n!==last){last=n;if(n>0)sound('tick');if(n<=3&&!tense[n]){tense[n]=1;sound('suspense');try{navigator.vibrate?.(n===1?[120,70,120]:[70])}catch(e){}}}if(n<=0)clearInterval(window.__bt)};run();window.__bt=setInterval(run,100)}
function teamLabel(id){return id==='A'?'الفريق الأحمر':'الفريق الأزرق'}
function teamIcon(id){return id==='A'?'🔴':'🔵'}
function teams(){return `<div class="bombTeams">${(G.teams||[]).map(t=>`<section class="bombTeam ${t.id==='A'?'redTeam':'blueTeam'} ${G.turnTeam===t.id?'activeTeam':''}"><div class="teamTop"><span>${teamIcon(t.id)}</span><div><b>${teamLabel(t.id)}</b><small>${(t.players||[]).map(p=>esc(p.name)).join(' • ')||'بانتظار لاعب'}</small></div><strong>${t.score||0}</strong></div><div class="teamBottom"><span>${G.turnTeam===t.id&&G.phase==='answer'?'⚡ دوره الآن':''}</span><span class="strikes">${'✕'.repeat(t.strikes||0)}${'○'.repeat(3-(t.strikes||0))}</span></div></section>`).join('')}</div>`}
function board(host=false){return `<div class="bombBoard">${(G.answers||[]).map((a,i)=>`<div class="bombTile ${a.revealed?'isRevealed':''} ${G.revealIndex===i&&G.phase==='reveal'?'aboutToReveal':''}">${a.revealed?`<div class="answerFace"><span class="answerNo">${i+1}</span><b>${esc(a.text)}</b><small class="${a.points<0?'negative':''}">${a.points>0?'+':''}${a.points} نقطة ${a.trap?'💣':''}</small></div>`:`<div class="questionFace"><span>?</span><small>إجابة ${i+1}</small></div>`}${host&&!a.revealed&&G.phase!=='reveal'?`<button class="revealBtn" onclick="reveal(${i})">كشف</button>`:''}</div>`).join('')}</div>`}
function roundHeader(label='المفخخة'){return `<div class="bombHeader"><div><span class="brandMark">💣</span><div><b>${label}</b><small>جولة ${G.round}/${G.maxRounds}</small></div></div><div class="roomCode">${esc(G.code)}</div></div>`}
function questionStage(){const listed=G.questionStats?.listed??(G.answers||[]).length,traps=G.questionStats?.traps??0,extra=G.questionStats?.extra??0;return `<div class="questionStage"><div class="questionPulseIcon">💣</div><div class="questionStageLabel">السؤال • الجولة ${G.round||1}</div><h2>${esc(G.question||'')}</h2><div class="questionStats visibleStats"><span>📋 ${listed} ${listed===1?'إجابة':'إجابات'}</span><span>💣 ${traps} مفخخة</span><span>➕ ${extra} إضافات صحيحة</span></div><div class="stageCountdown">تبدأ أول إجابة بعد <b id="questionTimer">10</b> ثوانٍ</div></div>`}
function answerInput(){return `<form class="typedPanel" id="answerForm" onsubmit="event.preventDefault();submit()"><div class="typedTitle">✍️ اكتب إجابتك</div><div class="inputRow"><input id="ans" name="answer" class="input answerInput" autocomplete="off" autocapitalize="sentences" autofocus placeholder="كلمة واحدة…"><button type="submit" class="sendAnswer">إرسال ↵</button></div><small>🧠 التصحيح الذكي يتقبل الأخطاء الإملائية والإجابات القريبة.</small><div id="submitStatus" class="submitStatus" aria-live="polite"></div></form>`}
function answerStage(){const mine=G.current?.id===me;return `<div class="answerCard ${mine?'mine':''}"><div class="turnBadge">${teamIcon(G.current?.team)} ${mine?'دورك الآن':`دور ${esc(G.current?.name||'اللاعب')}`}</div><div class="timer hugeTimer" id="answerTimer">10</div><div class="fuseLine"><span></span></div>${mine?answerInput():`<p class="waitingText">${esc(G.current?.name||'اللاعب')} يكتب إجابته الآن…</p>`}</div>`}
function resultStage(){const k=G.result?.kind;return `<div class="resultCard ${k==='trap'?'trapResult':k==='listed'?'goodResult':k==='outside'?'outsideResult':k==='timeout'?'timeoutResult':'badResult'}"><div class="resultIcon">${k==='trap'?'💥':k==='listed'?'✨':k==='outside'?'🟡':k==='timeout'?'⏰':'✕'}</div><div class="resultTitle">${k==='trap'?'وقعت في المفخخة!':k==='outside'?'إجابة صحيحة خارج اللائحة':k==='listed'?'إجابة صحيحة':k==='timeout'?'انتهى الوقت':'إجابة خاطئة'}</div><div class="megaDelta">${G.result?.delta>0?'+':''}${G.result?.delta||0}</div><div class="resultAnswer">${G.result?.smart?`🧠 صُححت إلى: <b>${esc(G.result.matched)}</b>`:esc(G.result?.matched||G.result?.answer||(k==='timeout'?'لم يتم إرسال إجابة':''))}</div>${k==='timeout'?`<small class="timeoutPenalty">خصم 20 نقطة • Strike ${G.result?.strikes||0}/3</small>`:''}</div>`}
function presenter(){let action='';if(G.phase==='lobby'){const ready=(G.teams||[]).every(t=>(t.players||[]).some(p=>p.online!==false));action=`<div class="lobbyCard"><div class="lobbyIcon">💣</div><h1>${G.round?'الجولة التالية جاهزة':'الغرفة جاهزة'}</h1><p>${ready?'الفريقان جاهزان. اضغط للبدء.':'نحتاج لاعبًا متصلًا من كل فريق.'}</p><button class="primaryAction" onclick="start()" ${ready?'':'disabled'}>${G.round?'بدء الجولة التالية':'بدء اللعبة'}</button></div>`}else if(G.phase==='question')action=questionStage();else if(G.phase==='answer')action=answerStage();else if(G.phase==='judge')action=`<div class="judgeCard"><div class="judgeTitle">🎙️ لوحة الحكم</div><p><b>${esc(G.current?.name||'')}</b> أجاب: <strong>${esc(G.submitted||'انتهى الوقت')}</strong></p><div class="judgeGrid">${(G.answers||[]).map((a,i)=>`<button onclick="judge(${i},false)" ${a.awarded?'disabled':''}><b>${i+1}</b>${esc(a.text)}<small>${a.points>0?'+':''}${a.points}${a.trap?' 💣':''}</small></button>`).join('')}</div><div class="judgeActions"><button class="outsideBtn" onclick="judge(-1,true)">✓ صحيحة خارج اللائحة (+${Math.max(1,Math.floor((G.points||10)/2))})</button><button class="wrongBtn" onclick="judge(-1,false)">✕ خطأ / Strike</button></div></div>`;else if(G.phase==='reveal')action=`<div class="truthCard"><span>لحظة الحقيقة</span><b>المربع ينكشف…</b></div>`;else if(G.phase==='result')action=resultStage();else action=`<div class="finishedCard">🏆 انتهت اللعبة</div>`;set(`<div class="bombApp presenterView">${roundHeader('المفخخة • الحكم')}${teams()}<main class="bombMain">${G.phase==='question'?'':`<div class="questionBlock"><span>السؤال</span><h1>${esc(G.question||'جاهز؟')}</h1></div>`}${G.phase==='question'?'':board(true)}${action}</main><div class="hostTools"><button onclick="window.open('/games/bomb/display?code=${encodeURIComponent(G.code)}','_blank')">🖥️ فتح الشاشة</button><button class="changeQBtn" onclick="changeQuestion()">🔄 تغيير السؤال</button><button onclick="leaveRoom()">خروج من الغرفة</button></div></div>`);if(G.phase==='answer')tick(G.answerUntil,'answerTimer')}
function display(){let center;if(G.phase==='lobby')center=`<div class="lobbyCard"><div class="lobbyIcon">💣</div><h1>المفخخة</h1><p>كل دور يحمل إجابة… وبعض الإجابات تنفجر.</p></div>`;else if(G.phase==='question')center=questionStage();else if(G.phase==='answer')center=answerStage();else if(G.phase==='judge')center=`<div class="truthCard"><span>الحكم يراجع الإجابة</span><b>انتظروا النتيجة…</b></div>`;else if(G.phase==='reveal')center=`<div class="truthCard"><span>لحظة الحقيقة</span><b>كشف المربع</b></div>`;else if(G.phase==='result')center=resultStage();else center=`<div class="finishedCard">🏆 انتهت اللعبة</div>`;set(`<div class="bombApp displayView">${roundHeader('المفخخة • الشاشة')}${teams()}<main class="bombMain">${G.phase==='question'?'':`<div class="questionBlock"><span>سؤال الجولة</span><h1>${esc(G.question||'')}</h1></div>`}${G.phase==='question'?'':board(false)}${center}</main></div>`);if(G.phase==='answer')tick(G.answerUntil,'answerTimer')}
function player(){const p=(G.players||[]).find(x=>x.id===me),t=(G.teams||[]).find(x=>x.id===p?.team);let body;if(G.phase==='lobby')body=`<div class="lobbyCard playerLobby"><div class="lobbyIcon">💣</div><h1>أنت داخل الغرفة</h1><p>دور الفريقين بالتناوب. عندما يحين دورك سيظهر حقل الإجابة.</p></div>`;else if(G.phase==='question')body=questionStage();else if(G.phase==='answer')body=answerStage();else if(G.phase==='judge')body=`<div class="truthCard"><span>تم إرسال إجابتك</span><b>المقدم يراجعها…</b></div>`;else if(G.phase==='reveal')body=`<div class="truthCard"><span>لحظة الحقيقة</span><b>المربع ينكشف…</b></div>`;else if(G.phase==='result')body=resultStage();else body=`<div class="finishedCard">🏆 انتهت اللعبة</div>`;set(`<div class="bombApp playerView">${roundHeader(`المفخخة • ${esc(p?.name||'لاعب')}`)}<div class="playerTop"><span class="myTeam">${teamIcon(t?.id)} ${esc(t?.name||'')}</span>${G.turnTeam?`<span>الدور: ${teamIcon(G.turnTeam)} ${teamLabel(G.turnTeam)}</span>`:''}</div><main class="bombMain">${G.phase==='question'?'':`<div class="questionBlock"><span>السؤال</span><h1>${esc(G.question||'بانتظار السؤال…')}</h1></div>`}${G.phase==='question'?'':board(false)}${body}</main><button class="leaveBtn" onclick="leaveRoom()">خروج من الغرفة</button></div>`);if(G.phase==='answer')tick(G.answerUntil,'answerTimer')}
function render(){if(!G)return;if(role==='presenter')presenter();else if(role==='display')display();else player();if(G.phase==='question')tick(G.questionUntil,'questionTimer');if(G.phase==='answer')tick(G.answerUntil,'answerTimer')}
function start(){socket.emit('bomb:start')}
function submit(){
  const input=document.getElementById('ans'),btn=document.querySelector('.sendAnswer'),status=document.getElementById('submitStatus');
  const v=input?.value?.trim()||'';
  if(!v||!G?.current||G.phase!=='answer')return;
  if(pendingAnswer===v && input?.disabled)return;
  pendingAnswer=v;
  try{localStorage.setItem(bombSessionKey(code)+'.pending',v)}catch(e){}
  if(input)input.disabled=true;
  if(btn){btn.disabled=true;btn.textContent='جارٍ الإرسال…';}
  if(status)status.textContent='';
  let attempts=0;
  const send=()=>{
    attempts++;
    if(!socket.connected){
      if(status)status.textContent='الاتصال انقطع — محفوظة، ستُرسل تلقائيًا عند رجوع الاتصال.';
      if(attempts<8 && Date.now()<(G.answerUntil||0)+1800)setTimeout(send,250);
      return;
    }
    socket.timeout(5000).emit('bomb:submit',{answer:v,sessionToken,playerId:me},(err,res)=>{
      if(!err&&(res?.ok||res?.duplicate)){
        pendingAnswer='';
        try{localStorage.removeItem(bombSessionKey(code)+'.pending')}catch(e){}
        if(status)status.textContent='✓ تم إرسال الإجابة';
        return;
      }
      if(res?.reason==='timeout'){
        pendingAnswer='';
        try{localStorage.removeItem(bombSessionKey(code)+'.pending')}catch(e){}
        return;
      }
      if(G?.phase==='answer'&&pendingAnswer===v&&attempts<12){
        if(status)status.textContent='إعادة الإرسال…';
        setTimeout(send,220);
      }else if(status){status.textContent='تعذر تأكيد الإرسال — سنحاول تلقائيًا عند عودة الاتصال.';}
    });
  };
  send();
}

function judge(i,o){if(o){const v=prompt('اكتب الإجابة الصحيحة خارج اللائحة:','');if(!v)return;socket.emit('bomb:judge',{index:-1,outside:true,answer:v})}else socket.emit('bomb:judge',{index:i,outside:false})}
function reveal(i){socket.emit('bomb:reveal',{index:i})}
function leaveRoom(){saveBombSession();if(code)socket.emit('room:leave',{code});location.href='/games/bomb/roles?code='+encodeURIComponent(code)+'&mode='+encodeURIComponent(new URLSearchParams(location.search).get('mode')||'1')+'&resume=1';}
function changeQuestion(){if(!code)return;if(confirm('تغيير السؤال بالكامل؟ سيتم إلغاء الدور الحالي وإعادة السؤال دون خسارة نقاط الجولة.'))socket.emit('bomb:changeQuestion')}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target?.id==='ans'){e.preventDefault();document.getElementById('answerForm')?.requestSubmit?.()}});
socket.on('state',s=>{const old=G?.phase;G=s;if(old!==s.phase){if(s.phase==='answer')sound('suspense');if(s.phase==='reveal'){sound('suspense');setTimeout(()=>sound('reveal'),280);}if(s.phase==='result')sound(s.result?.kind==='trap'?'explosion':s.result?.kind==='listed'||s.result?.kind==='outside'?'correct':'wrong');if(s.phase==='question')sound('buzz')}render()});
socket.on('joined',x=>{me=x.playerId;sessionToken=x.sessionToken||sessionToken;resumeBusy=false;saveBombSession();try{pendingAnswer=pendingAnswer||localStorage.getItem(bombSessionKey(code)+'.pending')||''}catch(e){}render();if(pendingAnswer&&G?.phase==='answer'&&socket.connected){const v=pendingAnswer;setTimeout(()=>{socket.timeout(2200).emit('bomb:submit',{answer:v,sessionToken},(err,res)=>{if(!err&&res?.ok){pendingAnswer='';try{localStorage.removeItem(bombSessionKey(code)+'.pending')}catch(e){}}})},80)}});
socket.on('resumeFailed',x=>{if(role!=='player'||!code)return;resumeBusy=false;const saved=loadBombSession();if(saved?.token&&saved.token===sessionToken){clearBombSession()}sessionToken='';pendingAnswer='';toastLocal('تعذر استعادة الجلسة القديمة. يمكنك الدخول من جديد بدون إنشاء جلسة مكررة.');});
socket.on('connect',()=>{if(role==='player'&&code&&sessionToken&&!resumeBusy){resumeBusy=true;socket.emit('room:resume',{code,sessionToken,name:new URLSearchParams(location.search).get('name')||'',team:new URLSearchParams(location.search).get('team')||'A'})}});
socket.on('disconnect',()=>{if(role==='player'&&code){saveBombSession();try{if(pendingAnswer)localStorage.setItem(bombSessionKey(code)+'.pending',pendingAnswer)}catch(e){}}});socket.on('errorMsg',x=>{if(String(x).includes('تعذر استعادة الجلسة'))return;if(!G)toastLocal(x);});
const qp=new URLSearchParams(location.search);code=(qp.get('code')||'').toUpperCase();
if(location.pathname.includes('/presenter')){role='presenter';socket.emit('room:presenter',{code})}else if(location.pathname.includes('/display')){role='display';socket.emit('room:display',{code})}else{role='player';const n=qp.get('name')||'لاعب',t=qp.get('team')||'A',tok=qp.get('sessionToken')||'',saved=tok?{token:tok,name:n,team:t}:loadBombSession();if(saved?.token)socket.emit('room:resume',{code,sessionToken:saved.token});else socket.emit('room:join',{code,name:n,team:t})}
Object.values(aud).forEach(a=>{try{a.volume=.85}catch(e){}});
