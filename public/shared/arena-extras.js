/* الساحة 2.0 — interactive home extras. Keeps the existing room/game system intact. */
(function(){
  'use strict';
  const CHALLENGES=[
    'العب جولة كاملة دون استخدام التلميحات','اربح جولة بفارق نقطة واحدة فقط',
    'العب لعبة لم تجربها هذا الأسبوع','كن أول من يجيب في جولة واحدة',
    'ارسم شيئًا يستطيع الجميع تخمينه','شارك في جولة فاميلي فيود',
    'العب مع شخصين على الأقل','اختر فريقًا وحققوا الفوز معًا',
    'جرّب جولة عشوائية دون تغيير الاختيارات','ارجع وأكمل غرفة غير مكتملة'
  ];
  const KEY='saha.arenaExtras.v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return {}}};
  const save=x=>{try{localStorage.setItem(KEY,JSON.stringify(x))}catch(_){}};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function ensureStyles(){
    if(document.getElementById('arenaExtrasCss'))return;
    const s=document.createElement('style');s.id='arenaExtrasCss';s.textContent=`
      .arenaExtras{margin:18px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .arenaExtraCard{min-width:0;padding:17px;border:1px solid rgba(155,170,255,.18);border-radius:22px;background:linear-gradient(145deg,rgba(30,36,67,.82),rgba(13,16,31,.88));box-shadow:0 14px 35px rgba(0,0,0,.16)}
      .arenaExtraHead{display:flex;align-items:center;gap:10px;margin-bottom:9px}.arenaExtraIcon{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:rgba(130,145,255,.14);font-size:22px;flex:none}
      .arenaExtraCard h3{font-size:17px;margin:0}.arenaExtraCard p{color:#aeb8d2;font-size:12px;line-height:1.7;margin:5px 0 12px}
      .arenaExtraBtn{width:100%;border:1px solid rgba(160,175,255,.22);border-radius:13px;padding:11px;background:rgba(120,137,255,.13);color:#f7f8ff;font-weight:850;cursor:pointer}
      .arenaExtraResult{margin-top:12px;padding:13px;border-radius:14px;background:rgba(255,255,255,.045);color:#f6f7ff;font-weight:800;line-height:1.7}
      .arenaExtraPills{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.arenaExtraPill{border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 9px;font-size:11px;color:#dbe2ff}
      .arenaExtraNote{font-size:10px!important;color:#8995b5!important;margin-top:9px!important}
      @media(max-width:600px){.arenaExtras{grid-template-columns:1fr}.arenaExtraCard{padding:15px}}
    `;document.head.appendChild(s);
  }
  function build(){
    const app=document.querySelector('.arenaHome');if(!app||document.getElementById('arenaExtras'))return;
    ensureStyles();
    const state=read();
    const section=document.createElement('section');section.id='arenaExtras';section.className='arenaExtras';
    section.innerHTML=`
      <article class="arenaExtraCard"><div class="arenaExtraHead"><span class="arenaExtraIcon">🎡</span><div><h3>عجلة التحديات</h3><p>اسحب تحديًا عشوائيًا وابدأ اللعب فورًا.</p></div></div><button class="arenaExtraBtn" id="arenaSpin">لفّ العجلة</button><div class="arenaExtraResult" id="arenaChallenge" aria-live="polite">${esc(state.challenge||'جاهز للتحدي؟ اضغط وخلّ الحظ يختار.')}</div><div class="arenaExtraPills"><span class="arenaExtraPill">تحديات متنوعة</span><span class="arenaExtraPill">اختيار عشوائي</span></div></article>
      <article class="arenaExtraCard"><div class="arenaExtraHead"><span class="arenaExtraIcon">🏅</span><div><h3>إنجازاتي وألقابي</h3><p>تابع نشاطك واحصل على ألقاب تشجيعية أثناء اللعب.</p></div></div><div class="arenaExtraPills" id="arenaTitles"></div><div class="arenaExtraResult" id="arenaStats"></div><p class="arenaExtraNote">هذه الإحصاءات محفوظة على هذا الجهاز فقط حاليًا، وليست ترتيبًا عالميًا بين اللاعبين.</p></article>
      <article class="arenaExtraCard"><div class="arenaExtraHead"><span class="arenaExtraIcon">📅</span><div><h3>أبطال الأسبوع والشهر</h3><p>مكان مخصص لعرض المنافسة الأسبوعية والشهرية.</p></div></div><div class="arenaExtraPills"><span class="arenaExtraPill">الأسبوع الحالي</span><span class="arenaExtraPill">هذا الشهر</span></div><div class="arenaExtraResult">سيظهر الترتيب المشترك هنا بعد ربط نظام النقاط الدائم على الخادم.</div><p class="arenaExtraNote">لم يتم عرض أسماء أو نقاط وهمية؛ الترتيب العام يحتاج مصدر نتائج مشتركًا.</p></article>
      <article class="arenaExtraCard"><div class="arenaExtraHead"><span class="arenaExtraIcon">🏆</span><div><h3>بطولة الساحة الكبرى</h3><p>ابدأ من نظام «بطل الساحة» الحالي دون إنشاء نظام غرف منفصل.</p></div></div><button class="arenaExtraBtn" id="arenaTournament">فتح بطل الساحة</button><div class="arenaExtraResult">تصفيات ← جولة مفاجأة ← نصف النهائي ← النهائي والتتويج</div><p class="arenaExtraNote">يحافظ الزر على مسار البطولة الحالي في المشروع.</p></article>`;
    const champion=app.querySelector('.championCard');
    if(champion)champion.insertAdjacentElement('afterend',section);else app.appendChild(section);
    const gamesPlayed=Math.max(0,Number(state.gamesPlayed)||0);
    const challenges=Math.max(0,Number(state.challenges)||0);
    const titles=[];
    if(gamesPlayed>=1)titles.push('🎮 لاعب جديد');
    if(gamesPlayed>=5)titles.push('🔥 عاشق التحدي');
    if(gamesPlayed>=15)titles.push('⚡ نجم الساحة');
    if(challenges>=3)titles.push('🎯 صيّاد التحديات');
    if(!titles.length)titles.push('🌱 اللقب الأول بانتظارك');
    document.getElementById('arenaTitles').innerHTML=titles.map(t=>'<span class="arenaExtraPill">'+esc(t)+'</span>').join('');
    document.getElementById('arenaStats').textContent='ألعاب بدأت من هذا الجهاز: '+gamesPlayed+' • تحديات اخترتها: '+challenges;
    document.getElementById('arenaSpin').addEventListener('click',()=>{
      const b=document.getElementById('arenaSpin');b.disabled=true;b.textContent='العجلة تدور…';
      let ticks=0;const timer=setInterval(()=>{
        document.getElementById('arenaChallenge').textContent=CHALLENGES[Math.floor(Math.random()*CHALLENGES.length)];
        if(++ticks>=12){clearInterval(timer);const challenge=CHALLENGES[Math.floor(Math.random()*CHALLENGES.length)];document.getElementById('arenaChallenge').textContent=challenge;const n=read();n.challenge=challenge;n.challenges=(Number(n.challenges)||0)+1;save(n);b.disabled=false;b.textContent='لفّ العجلة مرة ثانية';document.getElementById('arenaStats').textContent='ألعاب بدأت من هذا الجهاز: '+(Number(n.gamesPlayed)||0)+' • تحديات اخترتها: '+n.challenges;document.getElementById('arenaTitles').innerHTML=(n.challenges>=3?['🎯 صيّاد التحديات','🎮 لاعب جديد']:['🌱 اللقب الأول بانتظارك']).map(t=>'<span class="arenaExtraPill">'+esc(t)+'</span>').join('');}
      },90);
    });
    document.getElementById('arenaTournament').addEventListener('click',()=>{if(typeof unifiedEntry==='function')unifiedEntry('champion');else location.href='/games/champion/'});
  }
  function trackStart(){
    document.addEventListener('click',e=>{
      const el=e.target.closest('button,[role="button"]');if(!el)return;
      const txt=(el.textContent||'').trim();
      if(/إنشاء غرفة|ابدأ اللعب|ابدأ الجولة|انضمام إلى البطولة/.test(txt)){
        const s=read();s.gamesPlayed=(Number(s.gamesPlayed)||0)+1;save(s);
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
  trackStart();
  const observer=new MutationObserver(()=>{if(!document.getElementById('arenaExtras'))build()});
  observer.observe(document.body,{childList:true,subtree:true});
})();