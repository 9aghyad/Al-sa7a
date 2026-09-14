from pathlib import Path
p=Path('/mnt/data/v18/server.js')
s=p.read_text()
s=s.replace("function guessRoom(){return {type:'guess',code:makeCode('guess'),hostId:null,players:[],category:'🐾 حيوانات',phase:'lobby',round:0,maxRounds:5,secret:{},guessed:{},revealedBy:{},scores:{},usedCategories:[],usedWords:{},history:[],roundWinners:[]}}", "function guessRoom(){return {type:'guess',code:makeCode('guess'),hostId:null,players:[],category:'🐾 حيوانات',phase:'lobby',round:0,maxRounds:5,roundsLocked:false,secret:{},guessed:{},revealedBy:{},scores:{},usedCategories:[],usedWords:{},history:[],roundWinners:[]}}")
s=s.replace("s.on('guess:category',({category}={})=>{const g=games.get(s.data?.game);if(g?.type==='guess'&&CATS[category]&&g.phase==='lobby'&&s.data?.pid===g.hostId){g.category=category;broadcast(g)}});", "s.on('guess:category',({category}={})=>{const g=games.get(s.data?.game);if(g?.type==='guess'&&CATS[category]&&g.phase==='lobby'&&s.data?.pid===g.hostId){if((g.usedCategories||[]).includes(category))return;g.category=category;broadcast(g)}});")
s=s.replace("s.on('guess:setRounds',({rounds}={})=>{const g=games.get(s.data?.game);if(g?.type==='guess'&&g.phase==='lobby'&&s.data?.role==='player'){g.maxRounds=Math.max(1,Math.min(30,Number(rounds)||5));broadcast(g)}});", "s.on('guess:setRounds',({rounds}={})=>{const g=games.get(s.data?.game);if(g?.type==='guess'&&g.phase==='lobby'&&!g.roundsLocked&&s.data?.pid===g.hostId){g.maxRounds=Math.max(1,Math.min(30,Number(rounds)||5));broadcast(g)}});")
s=s.replace("s.on('guess:start',()=>{const g=games.get(s.data?.game);if(g?.type!=='guess'||g.players.length<2||s.data?.pid!==g.hostId)return;g.phase='round';g.round++;const arr=guessPool(g.category,g.round);", "s.on('guess:start',()=>{const g=games.get(s.data?.game);if(g?.type!=='guess'||g.players.length<2||s.data?.pid!==g.hostId||g.phase!=='lobby'||!g.category)return;if(g.round>0&&(g.usedCategories||[]).includes(g.category))return;g.roundsLocked=true;g.usedCategories=g.usedCategories||[];g.usedCategories.push(g.category);g.phase='round';g.round++;const arr=guessPool(g.category,g.round);")
s=s.replace("s.on('guess:next',()=>{const g=games.get(s.data?.game);if(g?.type==='guess'&&g.round<g.maxRounds&&s.data?.pid===g.hostId){g.phase='lobby';broadcast(g)}});", "s.on('guess:next',()=>{const g=games.get(s.data?.game);if(g?.type==='guess'&&g.round<g.maxRounds&&s.data?.pid===g.hostId){g.phase='lobby';g.category=null;broadcast(g)}});")
p.write_text(s)

p=Path('/mnt/data/v18/public/index.html')
s=p.read_text()
s=s.replace("const audioFiles={click:'/audio/click.wav',buzz:'/audio/buzz.wav',tick:'/audio/tick.wav',win:'/audio/win.wav',wrong:'/audio/wrong.wav',reveal:'/audio/reveal.wav',vote:'/audio/vote.wav',million:'/audio/million.wav',suspense:'/audio/suspense.wav',explosion:'/audio/explosion.wav',countdown:'/audio/countdown.wav'};", "const audioFiles={click:'/audio/click.wav',buzz:'/audio/buzz.wav',tick:'/audio/tick.wav',win:'/audio/win.wav',wrong:'/audio/wrong.wav',reveal:'/audio/reveal.wav',vote:'/audio/vote.wav',million:'/audio/million.wav',suspense:'/audio/suspense.wav',explosion:'/audio/explosion.wav',countdown:'/audio/countdown.wav',applause:'/audio/applause.wav'};")
# Replace guess CSS block by append overrides, easier and safer
insert = r'''\n/* v18 — Guess exact-reference layout polish */
.guess-page{background:radial-gradient(circle at 50% 0%,rgba(103,65,255,.30),transparent 30%),linear-gradient(135deg,#090d2d 0%,#141052 48%,#100a32 100%);padding:12px 18px 28px}
.guess-page .guessShell{width:min(1280px,100%)}
.guess-page .guess-ref-menu{display:none!important}
.guess-page .guess-ref-top{grid-template-columns:1fr auto;gap:18px;margin-bottom:12px}
.guess-page .guess-ref-brand{grid-column:1 / -1;grid-row:1;text-align:center}
.guess-page .guess-ref-meta{grid-column:2;grid-row:1;position:absolute;right:18px;top:18px;z-index:5}
.guess-page .guess-ref-brand .guessLogo{width:145px;height:105px}
.guess-page .guess-ref-brand h1{font-size:clamp(44px,7vw,74px);margin:-42px 0 7px}
.guess-page .guess-ref-instruction{max-width:930px;margin:10px auto 24px;padding:13px 20px;border-radius:24px}
.guess-page .guessCards{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.guess-page .guessPerson{min-height:0;height:auto;padding:11px;border-radius:27px;display:grid;grid-template-columns:1fr;gap:8px;align-content:start}
.guess-page .guessPerson.me{grid-column:2;grid-row:1}
.guess-page .guessSecret{order:0;height:142px;min-height:142px;margin:0;border-radius:21px}
.guess-page .guessWordVisual{height:100%;min-height:142px;flex-direction:row;justify-content:center;gap:12px;padding:10px 12px}
.guess-page .guessWordVisual img{width:118px;height:92px;flex:0 0 118px;border-radius:16px}
.guess-page .guessWordVisual .guessWordEmoji{font-size:48px;display:none}
.guess-page .guessWordVisual b{font-size:clamp(25px,3vw,34px);line-height:1.15;align-self:center}
.guess-page .guessWordVisual .small{display:none}
.guess-page .guessAvatar{width:50px;height:50px;justify-self:start;margin:0}
.guess-page .guessName{font-size:21px;color:#fff}
.guess-page .guessPerson.me .guessName{color:#ffda4d}
.guess-page .guessRole{font-size:12px}
.guess-page .guessRevealBtn{border-radius:15px;padding:11px;font-size:16px}
.guess-page .guessSelfTag{padding:9px;font-size:14px}
.guess-page .guessActions{margin-top:18px}
.guess-page .guessRanking{display:none}
.guess-page .guessInputWrap{border-radius:22px}
.guess-page .guessFXCard{min-width:min(90vw,560px);text-align:center}
.guess-round-result{position:relative;overflow:hidden;padding:24px;border-radius:34px;background:linear-gradient(145deg,rgba(11,29,79,.98),rgba(25,8,67,.98));border:2px solid #5b5cff;box-shadow:0 0 60px rgba(99,55,255,.28),0 25px 80px rgba(0,0,0,.45)}
.guess-round-result:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 5%,rgba(255,211,64,.18),transparent 35%);pointer-events:none}
.guess-result-badge{display:inline-flex;padding:9px 18px;border-radius:999px;background:#18165b;border:2px solid #8d55ff;color:#fff;font-weight:1000}
.guess-result-title{font-size:clamp(34px,6vw,64px);color:#ffd447;text-shadow:0 4px 0 #8b3e00;margin:10px 0}
.guess-result-sub{color:#d8dcf2;font-size:18px}
.guess-result-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px}
.guess-result-row{display:flex;align-items:center;gap:12px;padding:12px 15px;border-radius:18px;background:rgba(4,15,45,.72);border:1px solid rgba(88,156,255,.35)}
.guess-result-row .rnum{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#193b85;color:#fff;font-weight:1000}
.guess-result-row .rname{flex:1;font-weight:1000}.guess-result-row .rscore{font-size:20px;font-weight:1000;color:#ffd447}
.guess-final-page{min-height:100vh;padding:18px;background:radial-gradient(circle at 50% 20%,rgba(125,58,255,.35),transparent 40%),linear-gradient(135deg,#0a0b31,#26105b 55%,#080c2b)}
.guess-final-wrap{width:min(1250px,100%);margin:auto;position:relative}
.guess-final-title{text-align:center;font-size:clamp(42px,7vw,76px);color:#ffd447;text-shadow:0 5px 0 #8a3d00;margin:10px 0}
.guess-final-sub{text-align:center;color:#d8def2;font-size:20px}
.guess-podium{display:grid;grid-template-columns:1fr 1.2fr 1fr;align-items:end;gap:14px;max-width:1000px;margin:70px auto 25px}
.guess-podium-place{position:relative;text-align:center;padding:20px 12px 14px;border-radius:30px 30px 18px 18px;border:2px solid #347aff;background:linear-gradient(180deg,#182f76,#0b163a);box-shadow:0 20px 60px rgba(0,0,0,.4)}
.guess-podium-place.first{min-height:300px;border-color:#ffd34a;background:linear-gradient(180deg,#6f4a0a,#241804);box-shadow:0 0 50px rgba(255,205,57,.25)}
.guess-podium-place.second{min-height:245px;border-color:#a9c7ff}.guess-podium-place.third{min-height:215px;border-color:#e88b56}
.guess-podium-avatar{width:92px;height:92px;border-radius:50%;margin:-65px auto 8px;display:grid;place-items:center;background:#13285c;border:4px solid #8fb8ff;font-size:44px;box-shadow:0 0 30px rgba(76,161,255,.35)}
.guess-podium-place.first .guess-podium-avatar{border-color:#ffd34a;background:#5d3b08}.guess-podium-place.third .guess-podium-avatar{border-color:#e88b56}
.guess-podium-medal{font-size:42px}.guess-podium-name{font-size:23px;font-weight:1000}.guess-podium-score{font-size:28px;color:#ffd447;font-weight:1000;margin-top:5px}
.guess-final-list{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:15px;border-radius:28px;background:rgba(5,15,43,.82);border:2px solid #1f64d8}.guess-final-row{display:flex;align-items:center;gap:9px;padding:12px;border-radius:18px;background:rgba(22,45,96,.65);border:1px solid rgba(80,145,255,.3)}
.guess-next-btn{display:block;width:min(300px,90%);margin:24px auto 0;padding:16px 24px;border-radius:999px;background:linear-gradient(180deg,#ffd62f,#f09f18);color:#2b1b00;font-size:22px;font-weight:1000;box-shadow:0 12px 35px rgba(255,193,37,.35)}
@media(max-width:1000px){.guess-page .guessCards{grid-template-columns:repeat(2,minmax(0,1fr))}.guess-page .guessPerson.me{grid-column:auto;grid-row:auto}.guess-podium{max-width:850px}}
@media(max-width:700px){.guess-page{padding:10px 10px 22px}.guess-page .guess-ref-meta{position:static;grid-column:1;grid-row:2;justify-self:center;flex-direction:row}.guess-page .guess-ref-top{grid-template-columns:1fr}.guess-page .guess-ref-brand .guessLogo{width:115px;height:82px}.guess-page .guessCards{grid-template-columns:1fr}.guess-page .guessSecret{height:118px;min-height:118px}.guess-page .guessWordVisual{min-height:118px}.guess-page .guessWordVisual img{width:95px;height:76px;flex-basis:95px}.guess-page .guessWordVisual b{font-size:27px}.guess-result-list{grid-template-columns:1fr}.guess-podium{grid-template-columns:1fr;max-width:360px;margin-top:65px}.guess-podium-place.first{order:1}.guess-podium-place.second{order:0}.guess-podium-place.third{order:2}.guess-final-list{grid-template-columns:1fr}}
'''
s=s.replace('</style>', insert+'</style>', 1)
# Replace guessRender/lobby/results/final functions in a bounded way
start=s.index('function guessRender(){')
end=s.index('function guessFX(', start)
new=r'''function guessRender(){
 document.body.classList.remove('market-page'); document.body.classList.add('guess-page');
 if(G.phase==='lobby')return guessLobby();if(G.phase==='results')return guessResults();if(G.phase==='finished')return guessFinal();
 set(`<div class="guessShell">
   <div class="guess-ref-top"><div></div><div class="guess-ref-brand"><div class="guessLogo">💡</div><h1>خمنها</h1><p>اكتشف ما يخفيه الآخرون</p></div><div class="guess-ref-meta"><span class="guessBadge">👥 ${G.players.length} لاعبين</span><span class="guessBadge">🪙 ${G.scores?.[me]||0}</span></div></div>
   <div class="guess-ref-instruction"><span class="eye">👁️</span>شاهد بطاقات اللاعبين الآخرين وخمّن ما هو الشيء الخاص بكل لاعب!<br><small>تذكّر: صاحب البطاقة لا يرى ما هو مخفي عنه.</small></div>
   <div class="guessCards">${G.players.map((x)=>{const own=x.id===me;const word=x.revealedWord;return `<div class="guessPerson ${own?'me':''}">
      <div class="guessSecret ${word?'is-revealed':''}">${own?`<div><div class="lock" style="font-size:45px">🔒</div><div class="hiddenText">مخفي عنك</div></div>`:word?`<div class="guessWordVisual"><img src="${guessImage(word)}" alt="${esc(word)}" loading="lazy" onerror="this.style.display='none'"><div class="guessWordEmoji">${guessEmoji(word)}</div><b>${esc(word)}</b></div>`:`<div><div class="lock" style="font-size:45px">🔒</div><div class="hiddenText">الكلمة مخفية</div></div>`}</div>
      <div class="guessName">${esc(x.name)} ${own?'(أنت)':''}</div><div class="guessRole">${own?'🔒 هذه الكلمة مخفية عنك':'👁️ يمكنك رؤية كلمته'}</div>
      <div class="guessAvatar">${own?'🙈':'👤'}</div>
      ${own?`<div class="guessSelfTag">🎯 خمّن كلمتك من الأسئلة</div>`:`<button class="guessRevealBtn ${word?'isOpen':''}" onclick="gr('${x.id}')">${word?'🔒 إغلاق الكلمة':'👁️ كشف الكلمة'}</button>`}
    </div>`}).join('')}</div>
   <div class="guessActions"><div class="guessInputWrap"><input id="guessIn" class="input" placeholder="اكتب تخمينك هنا…" autocomplete="off" onkeydown="if(event.key==='Enter')gg()"><button class="guessGuessBtn" onclick="gg()">🎯 خَمِّن</button></div><div class="notice center">💬 اسأل اللاعبين أسئلة تساعدك على معرفة كلمتك</div></div>
 </div><div id="guessFX" class="guessFX"><div class="guessFXCard"></div></div>`);
}
function guessLobby(){document.body.classList.remove('market-page');document.body.classList.add('guess-page');const host=G.hostId===me;const availableCats=cats.filter(c=>!(G.usedCategories||[]).includes(c));const shownCats=G.round>0?availableCats:cats;set(`<div class="guessShell"><div class="guessLobbyHero"><div class="guessLogo" style="margin:auto">🧠</div><h1>خمنها</h1><div class="small">كل لاعب يحمل كلمة لا يستطيع رؤيتها</div><div class="guessMeta" style="justify-content:center;margin-top:14px"><span class="guessBadge">${G.code}</span><span class="guessBadge">${G.maxRounds} جولات</span></div></div><div class="guessHostBanner">${host?'👑 أنت منشئ الغرفة — أنت الوحيد الذي يختار فئة اللعب.':'👀 فئة اللعب يحددها منشئ الغرفة فقط.'}</div><h3>🎲 ${G.round>0?'اختر فئة جديدة للجولة التالية':'الفئة'}</h3><div class="grid3">${shownCats.map(c=>`<button class="mode ${G.category===c?'selected':''} ${!host?'readonlyMode':''}" ${host?`onclick="gc('${esc(c)}')" disabled=${(G.usedCategories||[]).includes(c)}`:'disabled'}>${c}</button>`).join('')}</div>${host&&!G.roundsLocked?`<h3>عدد الجولات</h3><div class="grid3">${[5,10,15,20].map(n=>`<button class="mode ${G.maxRounds===n?'selected':''}" onclick="pickGuessRounds(${n})">${n} جولات</button>`).join('')}</div>`:`<div class="notice center" style="margin-top:14px">🔒 عدد الجولات ثابت ولا يمكن تغييره بعد بدء اللعبة.</div>`}<h3>👥 اللاعبون</h3><div class="guessCards">${G.players.map(p=>`<div class="guessPerson"><div class="guessAvatar">👤</div><div class="guessName">${esc(p.name)} ${p.id===G.hostId?'👑':''}</div><div class="guessRole">🟢 جاهز للعب</div></div>`).join('')}</div>${host?`<button class="btn gold" style="width:100%;margin-top:18px;font-size:19px" onclick="gs()" ${!G.category?'disabled':''}>🚀 ${G.round>0?'ابدأ الجولة التالية':'ابدأ اللعبة'}</button>`:`<div class="notice center" style="margin-top:18px">⏳ بانتظار منشئ الغرفة لاختيار الفئة وبدء الجولة…</div>`}</div>`)}
function pickGuessRounds(n){socket.emit('guess:setRounds',{rounds:n});}
function guessResults(){document.body.classList.add('guess-page');const ps=G.players.slice().sort((a,b)=>(G.scores[b.id]||0)-(G.scores[a.id]||0));const winners=G.roundWinners||[];set(`<div class="guessShell"><div class="guess-round-result center"><div class="guess-result-badge">🏆 الجولة ${G.round} من ${G.maxRounds}</div><div class="guess-result-title">انتهت الجولة!</div><div class="guess-result-sub">${winners.length?`أحسنتم! تم احتساب نقاط من عرف كلمته.`:'لم ينجح أحد في معرفة الكلمة.'}</div><div class="guess-result-list">${ps.map((p,i)=>`<div class="guess-result-row"><span class="rnum">${i+1}</span><span class="rname">${esc(p.name)} ${p.id===me?'⭐':''}</span><span class="rscore">${G.scores[p.id]||0} نقطة</span></div>`).join('')}</div>${G.hostId===me?`<button class="guess-next-btn" onclick="gnext()">اختيار فئة الجولة التالية ➜</button>`:`<div class="notice" style="margin-top:20px">⏳ بانتظار منشئ الغرفة للانتقال للجولة التالية…</div>`}</div></div>`)}
function guessFinal(){document.body.className='guess-final-page';const ps=G.players.slice().sort((a,b)=>(G.scores[b.id]||0)-(G.scores[a.id]||0));const top=ps.slice(0,3);const second=top[1],first=top[0],third=top[2];set(`<div class="guess-final-wrap"><div class="guess-final-title">🏆 الفائزون</div><div class="guess-final-sub">انتهت جميع الجولات — هذا هو الترتيب النهائي</div><div class="guess-podium">${second?`<div class="guess-podium-place second"><div class="guess-podium-avatar">👤</div><div class="guess-podium-medal">🥈</div><div class="guess-podium-name">${esc(second.name)}</div><div class="guess-podium-score">⭐ ${G.scores[second.id]||0}</div></div>`:''}${first?`<div class="guess-podium-place first"><div class="guess-podium-avatar">👑</div><div class="guess-podium-medal">🥇</div><div class="guess-podium-name">${esc(first.name)}</div><div class="guess-podium-score">⭐ ${G.scores[first.id]||0}</div></div>`:''}${third?`<div class="guess-podium-place third"><div class="guess-podium-avatar">👤</div><div class="guess-podium-medal">🥉</div><div class="guess-podium-name">${esc(third.name)}</div><div class="guess-podium-score">⭐ ${G.scores[third.id]||0}</div></div>`:''}</div><div class="guess-final-list">${ps.map((p,i)=>`<div class="guess-final-row"><b style="width:30px">${i+1}</b><span style="flex:1">${esc(p.name)}</span><b style="color:#ffd447">⭐ ${G.scores[p.id]||0}</b></div>`).join('')}</div><button class="guess-next-btn" onclick="home()">🔄 لعبة جديدة</button></div>`);sound('applause');}
'''
s=s[:start]+new+s[end:]
# Improve FX text and correct result
s=s.replace("socket.on('guess:correct',x=>{sound('win');guessFX('correct',`🎉 ${esc(x.player||'اللاعب')} حزَرها!`,`+${x.points} نقطة`);toast(`🎉 ${x.player||'اللاعب'} عرفها وحصل على +${x.points} نقطة`)});", "socket.on('guess:correct',x=>{sound('win');guessFX('correct',`🎉 ${esc(x.player||'اللاعب')} حزَرها!`,`حصل على +${x.points} نقطة 🏆`);toast(`🎉 ${x.player||'اللاعب'} عرفها وحصل على +${x.points} نقطة`);});")
p.write_text(s)
