const socket=io({transports:['websocket','polling']}),app=document.getElementById('app'),qs=new URLSearchParams(location.search);
let code=(qs.get('code')||'').toUpperCase(),token=qs.get('sessionToken')||'',name=qs.get('name')||'',G=null,me=null,selected=null,lastPhase=null,roleVisible=true,roleAnimKey=null,voteAnimKey=null,timers=[],audioReady=false;
const roles={
 mafia:['🔪','المافيا','/games/mafia/assets/mafia.svg','تعمل في الظلام. اتفق مع المافيا على ضحية المدينة.'],
 godfather:['🕴️','العرّاب','/games/mafia/assets/godfather.svg','قائد المافيا. شارك فريقك القرار واحسم الاختيار عند التعادل.'],
 detective:['🕵️','المحقق','/games/mafia/assets/detective.svg','تحقق من لاعب واعرف فقط: مافيا أم ليس مافيا.'],
 doctor:['🩺','الطبيب','/games/mafia/assets/doctor.svg','احمِ لاعبًا من اغتيال المافيا.'],
 guard:['🛡️','الحارس','/games/mafia/assets/guard.svg','احمِ لاعبًا آخر. لا يمكنك حماية نفسك.'],
 poisoner:['☠️','المسمّم','/games/mafia/assets/poisoner.svg','سمّم لاعبًا، ويظهر أثر السم في ليلة لاحقة.'],
 informant:['🗞️','المخبر','/games/mafia/assets/informant.svg','اجمع دليلًا سريًا: مافيا أم ليس مافيا.'],
 jester:['🤡','المهرج','/games/mafia/assets/jester.svg','لا تصوّت ولا تملك حركة ليلية. هدفك أن يتم إخراجك.'],
 citizen:['👤','المواطن','/games/mafia/assets/citizen.svg','لا تملك حركة ليلية. ناقش وصوّت مع أهل المدينة.']
};
const R=r=>roles[r]||roles.citizen, esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function clearAll(){timers.forEach(x=>x.type==='i'?clearInterval(x.id):clearTimeout(x.id));timers=[]}
function later(fn,ms){const id=setTimeout(fn,ms);timers.push({type:'t',id});return id} function every(fn,ms){const id=setInterval(fn,ms);timers.push({type:'i',id});return id}
function unlockAudio(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;window._audio=window._audio||new C();if(window._audio.state==='suspended')window._audio.resume();audioReady=true}catch(e){}}
function audio(kind='tick'){
 if(!audioReady)return;
 try{
  const c=window._audio;
  const one=(f,d,v,type='sine',delay=0)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(f,c.currentTime+delay);o.type=type;g.gain.setValueAtTime(.0001,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(v,c.currentTime+delay+.025);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+delay+d);o.connect(g).connect(c.destination);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+d+.04)};
  const map={tick:[520,.08,.022],two:[610,.11,.03],three:[720,.13,.04],card:[180,.16,.035],reveal:[390,.5,.055],click:[260,.06,.018],pulse:[95,.16,.024],night:[110,.9,.018],day:[240,.65,.018],vote:[150,.55,.022],winnerMafia:[120,.8,.035],winnerCity:[420,.8,.035]};
  if(kind==='roleReveal'){one(180,.18,.04,'triangle',0);one(310,.28,.035,'sine',.09);return}
  if(kind==='night'){one(92,.8,.018,'sine',0);one(138,.9,.012,'sine',.18);return}
  if(kind==='day'){one(180,.35,.016,'sine',0);one(300,.6,.018,'sine',.12);return}
  if(kind==='vote'){one(125,.22,.025,'sine',0);one(165,.38,.022,'sine',.2);return}
  if(kind==='winnerMafia'){[0,1,2].forEach((i)=>one([120,150,190][i],.55,.04,'sine',i*.13));return}
  if(kind==='winnerCity'){[0,1,2].forEach((i)=>one([320,420,560][i],.55,.032,'sine',i*.13));return}
  const [f,d,v]=map[kind]||map.tick;one(f,d,v,kind==='card'?'triangle':kind==='pulse'?'sine':'sine');
 }catch(e){}
}
function timer(){const e=document.getElementById('timer');if(!e)return;const left=Math.max(0,G?.phaseUntil?Math.ceil((G.phaseUntil-Date.now())/1000):0);e.textContent=left+' ث'}
function startTimer(){timer();every(timer,200)}
function players(){return(G.players||[]).map(p=>`<div class="player ${p.alive===false?'dead':''}"><div class="player-ident"><span class="player-avatar">${p.avatar?`<img src="${esc(p.avatar)}" alt="">`:'👤'}</span><b>${esc(p.name)}</b></div><span>${p.alive===false?'💀 شبح':p.online===false?'🟡 غير متصل':'🟢 حي'}</span></div>`).join('')}
function roleMini(){if(!G?.myRole)return;let old=document.getElementById('roleMini');if(old)old.remove();const x=R(G.myRole);const el=document.createElement('aside');el.id='roleMini';el.className='role-mini';el.innerHTML=`<span class="mini-label">دورك</span><b>${roleVisible?esc(x[1]):'••••'}</b><button onclick="toggleRole()">${roleVisible?'إخفاء':'إظهار'}</button>`;document.body.appendChild(el)}
window.toggleRole=()=>{roleVisible=!roleVisible;roleMini()};
function post(t){clearAll();app.innerHTML=`<section class="center-page"><div class="glass"><div class="big-mark">🎭</div><h2>${t}</h2></div></section>`}
function toggleMafiaSettings(){const e=document.getElementById('mafiaHostSettings');if(!e)return;e.classList.toggle('hidden');}
function setup(){clearAll();const c=G.config||{};const citizenCount=Math.max(0,G.players.length-((c.mafiaCount||0)+(c.godfatherCount||0)+(c.detectiveCount||0)+(c.doctorCount||0)+(c.guardCount||0)+(c.poisonerCount||0)+(c.informantCount||0)+(c.jesterCount||0)));const fields=[['maxPlayers','عدد اللاعبين',c.maxPlayers,4,20],['mafiaCount','🔪 المافيا',c.mafiaCount,1,20],['godfatherCount','🕴️ العرّاب',c.godfatherCount,0,1],['detectiveCount','🕵️ المحقق',c.detectiveCount,0,20],['doctorCount','🩺 الطبيب',c.doctorCount,0,20],['guardCount','🛡️ الحارس',c.guardCount,0,20],['poisonerCount','☠️ المسمّم',c.poisonerCount,0,20],['informantCount','🗞️ المخبر',c.informantCount,0,20],['jesterCount','🤡 المهرج',c.jesterCount,0,20]];app.innerHTML=`<div class="mafia-bg lobby-bg"><header class="topbar"><div><strong>🎭 مافيا</strong><small>المدينة لا تثق بأحد</small></div><span class="room-code">${esc(G.code)}</span></header><section class="setup-hero"><div class="poster"><div class="poster-kicker">WELCOME TO</div><div class="poster-title">MAFIA</div><div class="poster-sub">ليلة واحدة قد تغيّر كل شيء</div></div><div class="setup-panel"><div class="panel-head"><span>⚙️ إعداد اللعبة</span><b>${G.players.length}/${c.maxPlayers}</b></div><div class="players-grid">${players()}</div><button class="mafia-settings-float ${G.isHost?'':'hidden'}" onclick="toggleMafiaSettings()">⚙️</button><div id="mafiaHostSettings" class="mafiaHostSettings ${G.isHost?'':'hidden'}"><div class="setting-block"><h3>🎭 توزيع الأدوار</h3><div class="setting-grid">${fields.map(x=>`<label><span>${x[1]}</span><input class="input" id="${x[0]}" type="number" min="${x[3]}" max="${x[4]}" value="${x[2]??0}"></label>`).join('')}</div></div><div class="setting-block"><h3>⏱️ أزمنة المراحل</h3><div class="setting-grid">${[['nightSec','الليل',c.nightSec,10,120],['discussionSec','النقاش',c.discussionSec,15,300],['voteSec','التصويت',c.voteSec,10,120]].map(x=>`<label><span>${x[1]} — ثانية</span><input class="input" id="${x[0]}" type="number" min="${x[3]}" max="${x[4]}" value="${x[2]}"></label>`).join('')}</div></div><div class="setting-grid extras"><label><span>كشف الدور عند الموت</span><select class="input" id="revealRole"><option value="1" ${c.revealRole?'selected':''}>نعم</option><option value="0" ${!c.revealRole?'selected':''}>لا</option></select></label><label><span>كشف التصويتات</span><select class="input" id="revealVotes"><option value="1" ${c.revealVotes?'selected':''}>نعم — الأعداد</option><option value="0" ${!c.revealVotes?'selected':''}>لا — الاسم فقط</option></select></label><label><span>التعادل</span><select class="input" id="tieMode"><option value="none" ${c.tieMode!=='revote'?'selected':''}>لا أحد يخرج</option><option value="revote" ${c.tieMode==='revote'?'selected':''}>إعادة التصويت</option></select></label></div></div><div class="mafia-balance-note">💡 اترك لاعبًا واحدًا على الأقل مواطنًا. التوزيع الحالي: <b>${citizenCount}</b> مواطن</div><button class="btn secondary" onclick="saveConfig()">حفظ الإعدادات</button><button class="btn primary big-btn" onclick="beginGame()" ${G.players.length!==c.maxPlayers?'disabled':''}>🎬 ابدأ ليلة المافيا</button></div></section></div>`}
window.saveConfig=()=>{unlockAudio();const n=id=>+document.getElementById(id).value;socket.emit('mafia:config',{maxPlayers:n('maxPlayers'),mafiaCount:n('mafiaCount'),godfatherCount:n('godfatherCount'),detectiveCount:n('detectiveCount'),doctorCount:n('doctorCount'),guardCount:n('guardCount'),poisonerCount:n('poisonerCount'),informantCount:n('informantCount'),jesterCount:n('jesterCount'),nightSec:n('nightSec'),discussionSec:n('discussionSec'),voteSec:n('voteSec'),revealRole:document.getElementById('revealRole').value==='1',revealVotes:document.getElementById('revealVotes').value==='1',tieMode:document.getElementById('tieMode').value})};
window.beginGame=()=>{unlockAudio();audio('click');socket.emit('mafia:start')};
function card(r,final=false){
 const x=R(r), order=['mafia','godfather','citizen','detective','doctor','guard','poisoner','informant','jester'], idx=Math.max(0,order.indexOf(r)), total=order.length;
 const team=['mafia','godfather'].includes(r)?'فريق المافيا':r==='jester'?'دور خاص':'فريق المدينة';
 const teamClass=['mafia','godfather'].includes(r)?'team-mafia':r==='jester'?'team-special':'team-city';
 return `<div class="role-card ${final?'final-card':''} ${teamClass}">
   <div class="role-card-frame">
     <div class="role-card-top"><span class="role-brand">الساحة • مافيا</span><span class="role-index">◆ ${String(idx+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span></div>
     <div class="role-image-wrap"><img src="${x[2]}" alt="${esc(x[1])}"><div class="image-shade"></div></div>
     <div class="role-card-bottom">
       <div class="role-team">◆ ${esc(team)}</div>
       <div class="role-card-name">${esc(x[1])}</div>
       <div class="role-card-desc">${esc(x[3])}</div>
     </div>
   </div>
 </div>`
}
function roleReveal(){
 clearAll();
 const until=G.phaseUntil||Date.now()+20000,total=20000,elapsed=Math.max(0,total-(until-Date.now()));
 app.innerHTML=`<section class="role-screen"><div class="cinema-title">المدينة نامت...</div><div class="role-stage" id="roleStage"></div><div class="role-caption" id="roleCaption">استعد...</div><div class="progress"><i id="roleProgress"></i></div></section>`;
 const st=document.getElementById('roleStage'),cap=document.getElementById('roleCaption'),prog=document.getElementById('roleProgress');
 const start=Date.now()-elapsed;let last=-1,lastCard=-1;
 function frame(){
  const e=Date.now()-start;
  if(e<3000){
   const n=3-Math.floor(e/1000);
   if(n!==last){last=n;st.innerHTML=`<div class="count-wrap"><small>توزيع الأدوار يبدأ بعد</small><strong>${n}</strong></div>`;audio(n===3?'three':n===2?'two':'tick')}
   cap.textContent='لا أحد يعرف من سيكون من...';
  }else if(e<15000){
   cap.textContent='توزيع الأدوار...';
   const keys=Object.keys(roles),step=Math.floor((e-3000)/180),idx=step%keys.length;
   if(idx!==lastCard){lastCard=idx;st.innerHTML=card(keys[idx]);audio('card')}
  }else{
   cap.textContent='هذه هويتك';
   st.innerHTML=card(G.myRole,true);
   if(prog)prog.style.width=Math.min(100,((e-15000)/5000)*100)+'%';
   if(!roleAnimKey||roleAnimKey!==G.phaseUntil){roleAnimKey=G.phaseUntil;audio('roleReveal');roleMini()}
   return;
  }
  if(prog)prog.style.width=Math.min(100,(e/total)*100)+'%';
  requestAnimationFrame(frame);
 }
 frame();
}
function targetButtons(){
 const isM=['mafia','godfather'].includes(G.myRole),marks={};
 (G.mafiaSelections||[]).forEach(x=>{marks[x.targetId]=marks[x.targetId]||[];marks[x.targetId].push(x)});
 return(G.players||[]).filter(p=>p.alive!==false&&p.id!==me).map(p=>{
  let extra='';
  if(isM&&(marks[p.id]||[]).length){
   const names=marks[p.id].map(x=>x.playerName).filter(Boolean);
   extra=`<span class="pick-count">اختيار المافيا: ${names.length}${names.length?` — ${names.map(esc).join('، ')}`:''}${marks[p.id].some(x=>x.submitted)?' ✓':''}</span>`;
  }
  return `<button class="target ${selected===p.id?'chosen':''}" onclick="chooseTarget('${p.id}')"><b>${esc(p.name)}</b>${extra}</button>`
 }).join('')
}
window.chooseTarget=id=>{if(G.myAction?.submitted)return;selected=id;unlockAudio();audio('click');render()};
function night(){clearAll();if(G.myAlive===false)return deadNight();const r=G.myRole,a=G.myAction||{},confirmed=!!a.submitted;if(['citizen','jester'].includes(r)){app.innerHTML=`<section class="game-page night-page"><div class="phase-pill">🌙 الليل</div><div class="night-clock">🌙</div><h1>${r==='jester'?'المهرج':'المواطن'}</h1><p class="subtle">${r==='jester'?'لا تملك حركة ليلية ولا تصوّت.':'لا تملك حركة ليلية. انتظر حلول النهار.'}</p><div class="timer" id="timer"></div><div class="safe-box">🤫 الجميع في الليل الآن</div></section>`;startTimer();roleMini();return}
 const isM=['mafia','godfather'].includes(r),isD=r==='doctor',isG=r==='guard',isP=r==='poisoner',isI=['detective','informant'].includes(r);let title=isM?'اختر ضحية مع فريقك':isD?'اختر من تحميه':isG?'اختر من تحرسه':isP?'اختر من تسممه':'اختر شخصًا للتحقق منه';let status='';
 if(confirmed&&isM){const consensus=G.mafiaConsensus;status=`<div class="confirmed-box">🔪 تم تأكيد اختيارك <b>${esc(G.players.find(p=>p.id===a.targetId)?.name||'')}</b><small>${consensus?.agreedTarget?'تم الاتفاق على نفس الضحية ✓':'لم يتم الاتفاق بعد بين المافيا'}</small><em>بانتظار حلول النهار...</em></div>`}
 else if(confirmed&&isD)status=`<div class="confirmed-box">🩺 تمت حماية ${esc(G.players.find(p=>p.id===a.targetId)?.name||'')} بنجاح<em>بانتظار حلول النهار...</em></div>`;
 else if(confirmed&&isG)status=`<div class="confirmed-box">🛡️ تمت الحراسة بنجاح<em>بانتظار حلول النهار...</em></div>`;
 else if(confirmed&&isP)status=`<div class="confirmed-box">☠️ تم تثبيت السم<em>بانتظار حلول النهار...</em></div>`;
 else if(confirmed&&isI)status=`<div class="confirmed-box">🕵️ لقد سألت عن ${esc(G.players.find(p=>p.id===a.targetId)?.name||'')}<div id="investigation" class="investigation"></div></div>`;
 app.innerHTML=`<section class="game-page night-page"><div class="phase-row"><span class="phase-pill">🌙 الليل ${G.round}</span><div class="timer" id="timer"></div></div><h1>${title}</h1>${isM&&G.mafiaConsensus?`<div class="mafia-consensus">🔪 اتفاق المافيا: <b>${G.mafiaConsensus.confirmed}/${G.mafiaConsensus.total}</b> أكدوا ${G.mafiaConsensus.agreedTarget?'نفس الضحية ✓':'— لم يتم الاتفاق بعد'}</div>`:''}${status}${!confirmed?`<div class="target-grid">${targetButtons()}</div><button class="btn primary confirm-btn" onclick="confirmNight()" ${selected?'':'disabled'}>تأكيد الاختيار</button>`:''}<div class="safe-box">🔒 اختيارك سري. بعد التأكيد لا يمكن تغييره.</div></section>`;startTimer();roleMini();selected=confirmed?a.targetId:selected;if(confirmed&&isI&&G.investigationResult)showInvestigation(G.investigationResult)}
function showInvestigation(result){const box=document.getElementById('investigation');if(!box)return;box.innerHTML=`<div class="investigation-wait">جاري قراءة الدليل...</div>`;later(()=>{const mafia=result==='mafia';box.innerHTML=`<div class="evidence-card ${mafia?'bad':'good'}"><img src="${mafia?R('mafia')[2]:R('citizen')[2]}"><strong>${mafia?'مافيا':'ليس مافيا'}</strong></div><small>بانتظار حلول النهار...</small>`;audio('reveal')},1000)}
window.confirmNight=()=>{if(!selected||G.myAction?.submitted)return;unlockAudio();audio('click');socket.emit('mafia:nightAction',{targetId:selected,confirm:true});selected=null};
function deadNight(){app.innerHTML=`<section class="game-page ghost-page"><div class="ghost-icon">👻</div><h1>أنت ميت</h1><p>لا يمكنك القيام بدورك، أنت ميت... الله يرحمك.</p><div class="timer" id="timer"></div><div class="safe-box">يمكنك مشاهدة اللعبة فقط دون معرفة أي أدوار سرية.</div></section>`;startTimer();roleMini()}
function discussion(){
 clearAll();
 const early=G.earlyVoteCount||0,total=G.earlyVoteTotal||0;
 const chat=(G.chat||[]).map(x=>`<div class="chat-line"><b>${esc(x.name)}</b><span>${esc(x.text)}</span></div>`).join('');
 app.innerHTML=`<section class="game-page day-page"><div class="phase-row"><span class="phase-pill">☀️ النهار</span><div class="timer" id="timer"></div></div><div class="day-story" id="dayStory"><span>حلّ الصباح...</span></div><div class="early-card"><div><b>التصويت المبكر</b><strong>${early}/${total}</strong></div><button class="btn primary" onclick="requestVote()" ${G.myAlive===false||G.myVoteRequest?'disabled':''}>${G.myVoteRequest?'تم طلب التصويت ✓':'التصويت الآن'}</button><small>عندما يطلب التصويت أكثر من نصف اللاعبين يبدأ فورًا.</small></div><div class="chat-box">${chat||'<span class="subtle">المدينة صامتة...</span>'}</div>${G.myAlive!==false?`<div class="chat-send"><input class="input" id="chatText" placeholder="اكتب اتهامك..." maxlength="180"><button class="btn secondary" onclick="sendChat()">إرسال</button></div>`:'<div class="ghost-note">👻 أنت شبح — المشاهدة فقط</div>'}</section>`;
 animateDay();startTimer();roleMini();
}
function animateDay(){
 const box=document.getElementById('dayStory'),r=G.lastNightResult||{};
 later(()=>{if(box)box.innerHTML='<span>حلّ الصباح...</span>'},450);
 later(()=>{if(box)box.innerHTML='<span>لكن المدينة لم تستيقظ كما كانت...</span>';audio('pulse')},1300);
 later(()=>{if(box)box.innerHTML=r.victimName?`<strong class="death">💀 تم العثور على ${esc(r.victimName)} خارج اللعبة.</strong>`:r.saved?'<strong class="saved">هذه الليلة... لم يخسر أحد حياته.</strong>':'<strong>🌙 مرت الليلة دون ضحية.</strong>';audio('reveal')},3000)
}
window.requestVote=()=>{unlockAudio();audio('click');socket.emit('mafia:requestVote')};window.sendChat=()=>{const e=document.getElementById('chatText');if(e?.value.trim()){socket.emit('mafia:chat',{text:e.value.trim()});e.value=''}};
function vote(){clearAll();if(G.myAlive===false)return deadVote();if(G.myRole==='jester')return noVote();const a=G.myAction||{};app.innerHTML=`<section class="game-page vote-page"><div class="phase-row"><span class="phase-pill">🗳️ التصويت</span><div class="timer" id="timer"></div></div><h1>من يخرج الليلة؟</h1>${a.submitted?'<div class="confirmed-box">✅ تم تسجيل تصويتك<br><em>انتظر بقية المدينة...</em></div>':`<div class="target-grid">${targetButtons()}</div><button class="btn primary confirm-btn" onclick="sendVote()" ${selected?'':'disabled'}>تأكيد التصويت</button>`}</section>`;selected=a.submitted?a.targetId:selected;startTimer();roleMini()}
function noVote(){app.innerHTML=`<section class="game-page ghost-page"><div class="ghost-icon">🤡</div><h1>المهرج لا يصوّت</h1><p>شاهد ما يحدث فقط.</p><div class="timer" id="timer"></div></section>`;startTimer();roleMini()}
function deadVote(){app.innerHTML=`<section class="game-page ghost-page"><div class="ghost-icon">👻</div><h1>أنت ميت</h1><p>لا يمكنك التصويت. شاهد ما يحدث فقط.</p><div class="timer" id="timer"></div></section>`;startTimer();roleMini()}
window.sendVote=()=>{if(!selected||G.myAction?.submitted)return;unlockAudio();audio('click');socket.emit('mafia:vote',{targetId:selected});selected=null};
function voteResult(){
 clearAll();const v=G.voteResult||{},rows=v.rows||[];
 if(voteAnimKey===G.phaseUntil)return;voteAnimKey=G.phaseUntil;
 app.innerHTML=`<section class="vote-result"><div class="phase-pill">الحكم</div><h1 id="voteTitle">المدينة تحبس أنفاسها...</h1><div class="slow-roulette" id="slowRoulette"></div><div id="voteFinal"></div></section>`;
 const box=document.getElementById('slowRoulette'),names=rows.map(x=>x.name);let i=0,delay=500;
 const iv=every(()=>{box.innerHTML=`<span>${esc(names[i++%Math.max(1,names.length)]||'...')}</span>`;audio('card');delay=Math.min(900,delay+55)},delay);
 later(()=>{clearAll();const f=document.getElementById('voteFinal');
   if(v.tie)f.innerHTML='<div class="result-big">⚖️ لا يوجد إجماع... لا أحد يخرج.</div>';
   else if(v.eliminatedName){let details='';if(G.revealVotes)details=`<div class="vote-table-title">كشف التصويتات</div><div class="vote-table">${rows.map(x=>`<div><span>${esc(x.name)}</span><b>${x.count}</b></div>`).join('')}</div>`;f.innerHTML=`<div class="result-label">تم اختيار</div><div class="result-big">${esc(v.eliminatedName)}</div>${details}`}
   audio('reveal')
 },4700)
}
function finished(){
 clearAll();
 const w=G.winnerText||'citizens',isM=w==='mafia',isJ=w==='jester';
 const text=isM?'المافيا':isJ?'المهرج':'المواطنون';
 const cls=isM?'mafia-win':isJ?'jester-win':'citizen-win';
 const winnerPlayers=(G.winnerPlayers||[]);
 app.innerHTML=`<section class="winner-screen ${cls}"><div class="winner-content"><div class="winner-kicker">انتهت اللعبة</div><div class="winner-word">${text}</div><div class="winner-line"></div><div class="winner-sub">الفائزون</div><div class="winner-players">${winnerPlayers.map(p=>`<span>${esc(p.name)}</span>`).join('')||'<span>الفريق الفائز</span>'}</div><div class="winner-note">تم حسم مصير المدينة</div>${G.isHost?'<button class="btn primary winner-replay" onclick="restartGame()">إعادة اللعبة بنفس اللاعبين</button>':''}</div></section>`;
 roleMini();
 if(w==='mafia')audio('winnerMafia');else if(w==='citizens')audio('winnerCity');else audio('reveal');
}
window.restartGame=()=>{unlockAudio();audio('click');socket.emit('mafia:restart')};
function render(){if(!G)return post('جاري الاتصال بالمدينة...');if(lastPhase!==G.phase){lastPhase=G.phase;if(G.phase!=='role')clearAll();selected=null;if(G.phase==='night')audio('night');else if(G.phase==='discussion')audio('day');else if(G.phase==='vote')audio('vote')}if(G.phase==='lobby')return setup();if(G.phase==='role')return roleReveal();if(G.phase==='night')return night();if(G.phase==='discussion')return discussion();if(G.phase==='vote')return vote();if(G.phase==='voteResult')return voteResult();if(G.phase==='finished')return finished();post('جاري الانتقال...')}
let joinSent=false;function connectMafia(){if(!code||joinSent)return;if(token){joinSent=true;socket.emit('room:resume',{code,sessionToken:token,name})}else{joinSent=true;socket.emit('room:join',{code,name:name||'لاعب'})}}
socket.on('connect',()=>{unlockAudio();connectMafia()});socket.on('joined',x=>{code=x.code;me=x.playerId;token=x.sessionToken;try{localStorage.setItem('mafia.session',JSON.stringify({code,token,name:name||'لاعب',updatedAt:Date.now()}))}catch(e){}socket.emit('room:sync',{code})});socket.on('state',s=>{G=s;render()});socket.on('errorMsg',m=>{joinSent=false;post('⚠️ '+esc(m))});socket.on('resumeFailed',x=>{joinSent=false;if(x?.finished)post('⚠️ انتهت اللعبة.');else if(code&&name){joinSent=true;socket.emit('room:join',{code,name:name||'لاعب'})}else post('⚠️ '+esc(x.message||'تعذر استعادة الغرفة'))});if(socket.connected)connectMafia();
