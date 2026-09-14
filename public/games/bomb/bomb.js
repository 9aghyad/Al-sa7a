const socket=io();
let G=null,me=null,role='',code='',sessionToken='',pendingAnswer='';
const qp=new URLSearchParams(location.search);
code=(qp.get('code')||'').toUpperCase();
const aud={
  click:new Audio('/audio/click.wav'), correct:new Audio('/audio/correct.wav'),
  wrong:new Audio('/audio/wrong.wav'), reveal:new Audio('/audio/reveal.wav'),
  suspense:new Audio('/audio/suspense.wav'), explosion:new Audio('/audio/explosion.wav'),
  tick:new Audio('/audio/tick.wav'), win:new Audio('/audio/win.wav')
};
Object.values(aud).forEach(a=>{try{a.volume=.85}catch(e){}});
function sound(k){try{const a=aud[k];if(a){a.currentTime=0;a.play().catch(()=>{})}}catch(e){}}
function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function set(x){const el=document.getElementById('app');if(el)el.innerHTML=x}
function toast(x){let el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';el.className='bombToast';document.body.appendChild(el)}el.textContent=x;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),2600)}
function tick(until,id){clearInterval(window.__bt);let last=-1;const run=()=>{const e=document.getElementById(id);if(!e){clearInterval(window.__bt);return}const n=Math.max(0,Math.ceil((until-Date.now())/1000));e.textContent=n;if(n!==last){last=n;if(n>0)sound('tick')}if(n<=0)clearInterval(window.__bt)};run();window.__bt=setInterval(run,100)}
function teamName(id){return id==='A'?'الفريق الأحمر':'الفريق الأزرق'}
function teamIcon(id){return id==='A'?'🔴':'🔵'}
function teamsBar(){
 return `<div class="teamsBar">${(G.teams||[]).map(t=>`<div class="teamCard ${t.id==='A'?'red':'blue'} ${G.turnTeam===t.id?'active':''}">
   <div class="teamIdentity"><span>${teamIcon(t.id)}</span><div><b>${esc(teamName(t.id))}</b><small>${(t.players||[]).map(p=>esc(p.name)).join(' • ')||'بانتظار لاعب'}</small></div></div>
   <strong class="teamScore">${t.score||0}</strong>
   <div class="teamMeta">${G.turnTeam===t.id&&G.phase==='answer'?'<span class="turnNow">دور الفريق الآن</span>':''}<span class="strikes">${'✕'.repeat(t.strikes||0)}${'○'.repeat(3-(t.strikes||0))}</span></div>
 </div>`).join('')}</div>`
}
function header(label){
 return `<header class="bombTop"><div class="brand"><div class="bombLogo">💣</div><div><b>المفخخة</b><small>${esc(label)}</small></div></div><div class="roundInfo">الجولة <b>${G.round||0}</b> / ${G.maxRounds||0}</div><div class="roomCode">${esc(G.code)}</div></header>`
}
function questionBlock(){
 return `<section class="questionHero"><div class="floatingBomb">💣</div><span>السؤال</span><h1>${esc(G.question||'')}</h1><div class="questionMeta"><b>${(G.answers||[]).length} إجابات</b><b>${G.questionStats?.traps??(G.answers||[]).filter(a=>a.trap).length} مفخخات</b><b>${G.questionStats?.extra??(G.extra||[]).length} خارج اللوحة</b></div><div class="threeCountdown"><span>ابدأوا بعد</span><b id="questionTimer">3</b></div></section>`
}
function board(){
 const mineTeam=G.players?.find(x=>x.id===me)?.team;
 const canReveal=G.phase==='answer'&&G.current?.team===mineTeam&&G.current?.id===me;
 return `<section class="answerBoard">${(G.answers||[]).map((a,i)=>`<div class="answerTile ${a.revealed?'revealed':''} ${G.revealIndex===i&&G.phase==='reveal'?'revealTarget':''}">
   ${a.revealed?`<div class="answerFront ${a.trap?'trap':''}"><span class="answerNumber">${i+1}</span><div><b>${esc(a.text)}</b><small>${a.trap?'💣 مفخخة':'إجابة صحيحة'}</small></div><strong>${a.points>0?'+':''}${a.points}</strong></div>`:`<div class="answerBack"><span>${i+1}</span><b>?</b>${canReveal?`<button class="revealAnswer" onclick="revealAnswer(${i})">كشف الإجابة</button>`:''}</div>`}
 </div>`).join('')}</section>`
}
function turnPanel(){
 const mine=G.current?.id===me;
 return `<section class="turnPanel ${mine?'mine':''}">
   <div class="turnTop"><span>${teamIcon(G.current?.team)} ${mine?'دورك الآن':'الدور الآن'}</span><b>${esc(G.current?.name||'')}</b></div>
   ${mine?`<form onsubmit="event.preventDefault();submitAnswer()" class="answerForm"><input id="answerInput" autocomplete="off" autofocus placeholder="اكتب إجابتك هنا…"><button>إرسال الإجابة ↵</button><small>التصحيح تلقائي • لا يوجد مؤقت 10 ثوانٍ</small></form>`:`<div class="waitingPlayer"><div class="pulseDot"></div><b>${esc(G.current?.name||'اللاعب')} يجيب الآن</b><span>الفريق الآخر يشاهد…</span></div>`}
 </section>`
}
function judgePanel(){
 return `<section class="judgePanel">
   <div class="judgeHead"><span>🎙️ المقدم</span><h2>هل الإجابة صحيحة؟</h2><p><b>${esc(G.current?.name||'')}</b> أجاب: <strong>${esc(G.submitted||'')}</strong></p></div>
   <div class="spokenAnswer"><label>إجابة اللاعب التي قالها شفهيًا</label><input id="spokenInput" value="${esc(G.submitted||'')}" placeholder="اكتب ما قاله اللاعب…"></div><div class="judgeAnswers">${(G.answers||[]).map((a,i)=>`<button ${a.awarded?'disabled':''} onclick="judge(${i},false)"><span>${i+1}</span><b>${esc(a.text)}</b><small>${a.points>0?'+':''}${a.points} ${a.trap?'💣':''}</small></button>`).join('')}</div>
   <div class="judgeActions"><button class="outside" onclick="judge(-1,true)">✓ صحيحة خارج اللائحة <small>+${Math.max(1,Math.floor((G.points||10)/2))}</small></button><button class="wrong" onclick="judge(-1,false)">✕ خاطئة / خصم</button></div>
 </section>`
}
function revealPanel(){
 const k=G.result?.kind;
 const title=k==='trap'?'وقعت في المفخخة!':k==='listed'?'إجابة صحيحة':k==='outside'?'إجابة صحيحة خارج اللائحة':k==='revealed'?'تم كشف الإجابة':'إجابة خاطئة';
 return `<section class="revealPanel ${k==='trap'?'danger':k==='listed'||k==='outside'?'success':'fail'}">
   <div class="revealIcon">${k==='trap'?'💥':k==='listed'?'✓':k==='outside'?'★':'✕'}</div>
   <h2>${title}</h2><div class="resultAnswer">${esc(G.result?.matched||G.result?.answer||'')}</div>
   <div class="resultDelta">${G.result?.delta>0?'+':''}${G.result?.delta||0}</div>
   <small>${k==='trap'?'انفجرت الإجابة!':k==='outside'?'صحيحة لكن ليست ضمن الإجابات الأساسية':k==='revealed'?'لا نقاط — تم كشف الإجابة والانتقال للفريق الآخر':'النقاط أضيفت/خُصمت من الفريق'}</small>
 </section>`
}
function lobby(){
 const ready=(G.teams||[]).every(t=>(t.players||[]).some(p=>p.online!==false));
 const isHost=G.hostId===me;
 return `<section class="lobby"><div class="lobbyBomb">💣</div><span class="eyebrow">غرفة المفخخة</span><h1>${G.round?'الجولة التالية':'جاهزون؟'}</h1><p>${ready?'الفريقان جاهزان. صاحب الغرفة يبدأ اللعبة.':'لا يمكن بدء اللعبة حتى يدخل لاعب من الفريق الأحمر ولاعب من الفريق الأزرق.'}</p><div class="readyGrid">${(G.teams||[]).map(t=>`<div><span>${teamIcon(t.id)}</span><b>${esc(teamName(t.id))}</b><small>${(t.players||[]).filter(p=>p.online!==false).map(p=>esc(p.name)).join(' • ')||'بانتظار لاعب'}</small></div>`).join('')}</div>${isHost?`<button class="startGame" onclick="startGame()" ${ready?'':'disabled'}>🚀 ${G.round?'بدء الجولة':'بدء اللعبة'}</button>`:`<div class="waitingStart">⏳ بانتظار صاحب الغرفة لبدء اللعبة</div>`}<button class="changeQuestionLobby" onclick="newQuestion()">🔄 تغيير السؤال</button></section>`
}
function finished(){
 const a=G.teams?.[0],b=G.teams?.[1],win=a?.score===b?.score?null:(a?.score>b?.score?a:b);
 return `<section class="finished"><div>🏆</div><h1>${win?`فاز ${esc(teamName(win.id))}`:'تعادل!'}</h1><p>${a?.score||0} — ${b?.score||0}</p></section>`
}
function player(){
 const p=G.players?.find(x=>x.id===me),t=G.teams?.find(x=>x.id===p?.team);
 let body=G.phase==='lobby'?lobby():G.phase==='question'?questionBlock():G.phase==='answer'?turnPanel():G.phase==='judge'?`<div class="displayJudge"><span>⚡ يتم التصحيح تلقائيًا</span><b>${G.current?.id===me?'تم إرسال إجابتك':'الفريق الآخر يجيب'}</b><small>انتظروا لحظة الحقيقة…</small></div>`:G.phase==='reveal'?`<div class="truth"><span>لحظة الحقيقة</span><b>كشف الإجابة…</b></div>`:G.phase==='result'?revealPanel():finished();
 set(`<div class="bombApp player"><div class="playerIdentity"><span>${teamIcon(t?.id)} ${esc(t?.name||'')}</span><b>${esc(p?.name||'لاعب')}</b></div>${header('شاشة اللاعبين')}${teamsBar()}<main>${G.phase!=='lobby'&&G.phase!=='question'?`<div class="questionStrip"><span>السؤال</span><h1>${esc(G.question||'')}</h1><div class="questionCounts"><b>${G.questionStats?.listed||G.answers?.length||0} إجابات</b><b>${G.questionStats?.traps||0} مفخخات</b><b>${G.questionStats?.extra||0} خارج اللوحة</b></div></div>`:''}${G.phase!=='lobby'&&G.phase!=='question'?board():''}${body}</main>${G.hostId===me&&G.phase!=='lobby'&&G.phase!=='finished'?`<button class="changeQuestion" onclick="newQuestion()">🔄 تغيير السؤال</button>`:''}<button class="leaveBtn" onclick="leave()">خروج من الغرفة</button></div>`);
 if(G.phase==='question')tick(G.questionUntil,'questionTimer')
}
function render(){if(G)player()}
function startGame(){sound('click');socket.emit('bomb:start')}
function newQuestion(){if(confirm('تغيير السؤال؟ سيتم فتح سؤال جديد.'))socket.emit('bomb:changeQuestion')}
function revealAnswer(index){if(G?.phase!=='answer')return;sound('click');socket.emit('bomb:reveal',{index})}
function judge(index,outside){
 sound('click');
 if(outside){const v=document.getElementById('spokenInput')?.value?.trim()||prompt('تأكيد الإجابة الصحيحة خارج اللائحة:',G.submitted||'');if(!v)return;socket.emit('bomb:judge',{outside:true,index:-1,answer:v});}
 else socket.emit('bomb:judge',{outside:false,index,answer:document.getElementById('spokenInput')?.value?.trim()||G.submitted||''});
}
function submitAnswer(){
 const input=document.getElementById('answerInput'),v=input?.value?.trim();
 if(!v||G?.phase!=='answer'||G.current?.id!==me)return;
 socket.emit('bomb:submit',{answer:v,sessionToken,playerId:me},(err,res)=>{
   if(err||!res?.ok){toast(res?.reason==='not-your-turn'?'ليس دورك الآن':'تعذر إرسال الإجابة');return}
   input.disabled=true;toast('✓ تم التصحيح تلقائيًا');
 });
}
function leave(){if(code)socket.emit('room:leave',{code});location.href='/'}
socket.on('state',s=>{const old=G?.phase;G=s;if(old!==s.phase){if(s.phase==='question')sound('tick');if(s.phase==='answer')sound('suspense');if(s.phase==='reveal'){sound('suspense');setTimeout(()=>sound(s.result?.kind==='trap'?'explosion':'reveal'),2200);}if(s.phase==='result')sound(s.result?.kind==='trap'?'explosion':s.result?.kind==='listed'||s.result?.kind==='outside'?'correct':s.result?.kind==='revealed'?'reveal':'wrong');if(s.phase==='finished')sound('win')}render()});
socket.on('joined',x=>{me=x.playerId;sessionToken=x.sessionToken||sessionToken;socket.emit('room:sync',{code});toast('✓ دخلت الغرفة')});
socket.on('room:created',x=>{code=x.code;role='player';sessionToken=x.sessionToken||'';render()});
socket.on('errorMsg',toast);
socket.on('connect',()=>{if(code&&role==='player'&&sessionToken)socket.emit('room:resume',{code,sessionToken})});
role='player';const n=qp.get('name')||'لاعب',t=qp.get('team')==='B'?'B':'A',tok=qp.get('sessionToken')||'';if(code&&tok){sessionToken=tok;socket.emit('room:resume',{code,sessionToken:tok,name:n,team:t})}else if(code)socket.emit('room:join',{code,name:n,team:t})
