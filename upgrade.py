from pathlib import Path
p=Path('/mnt/data/stage10/server.js')
s=p.read_text()
# liar room score/config
s=s.replace("function liarRoom(){return {type:'liar',code:makeCode('liar'),hostId:null,players:[],phase:'lobby',round:0,maxRounds:8,phaseUntil:0,question:'',liarQuestion:'',liarId:null,answers:{},votes:{},voted:false,history:[],caught:false,winnerText:null}}",
"function liarRoom(){return {type:'liar',code:makeCode('liar'),hostId:null,players:[],phase:'lobby',round:0,maxRounds:8,phaseUntil:0,question:'',liarQuestion:'',liarId:null,answers:{},votes:{},voted:false,history:[],caught:false,winnerText:null,scores:{},lastVoteCounts:{}}}")
# public add scores and vote counts on result
old="answers:g.phase==='discussion'||g.phase==='result'?g.players.map(p=>({id:p.id,answer:g.answers?.[p.id]?.answer||''})):[],caught:g.caught,liarName:g.phase==='result'?g.players.find(p=>p.id===g.liarId)?.name:null,question:g.phase==='result'?g.question:null,liarQuestion:g.phase==='result'?g.liarQuestion:null,winnerText:g.winnerText"
new="answers:g.phase==='discussion'||g.phase==='vote'||g.phase==='result'?g.players.map(p=>({id:p.id,answer:g.answers?.[p.id]?.answer||''})):[],caught:g.caught,liarName:g.phase==='result'?g.players.find(p=>p.id===g.liarId)?.name:null,question:g.phase==='result'?g.question:null,liarQuestion:g.phase==='result'?g.liarQuestion:null,winnerText:g.winnerText,scores:g.scores||{},voteCounts:g.phase==='result'?(g.lastVoteCounts||{}):{},leaderboard:g.players.map(p=>({id:p.id,name:p.name,score:g.scores?.[p.id]||0})).sort((a,b)=>b.score-a.score)}"
s=s.replace(old,new)
# initialize scores in start round
s=s.replace("const pair=liarQs[Math.floor(Math.random()*liarQs.length)],pool=g.players.filter(p=>p.online!==false);if(pool.length<4)return;g.round++;",
"const pair=liarQs[Math.floor(Math.random()*liarQs.length)],pool=g.players.filter(p=>p.online!==false);if(pool.length<4)return;pool.forEach(p=>{if(g.scores[p.id]==null)g.scores[p.id]=0});g.round++;")
# replace resolve function body up to next function
start=s.index('function liarResolveVote(g){')
end=s.index('\nfunction ', start+10)
newfn="""function liarResolveVote(g){
  if(g.phase!=='vote')return;
  const c={};Object.values(g.votes||{}).forEach(id=>c[id]=(c[id]||0)+1);
  let best=0,chosen=null;for(const [id,n] of Object.entries(c)){if(n>best){best=n;chosen=id}else if(n===best&&n>0)chosen=null}
  g.lastVoteCounts=c;g.caught=chosen===g.liarId;
  if(g.caught){for(const p of g.players.filter(p=>p.online!==false))if(p.id!==g.liarId)g.scores[p.id]=(g.scores[p.id]||0)+1}
  else g.scores[g.liarId]=(g.scores[g.liarId]||0)+2;
  g.phase='result';g.phaseUntil=Date.now()+7500;
  g.history.push({round:g.round,liarId:g.liarId,caught:g.caught,votes:c,question:g.question,liarQuestion:g.liarQuestion});
  g.winnerText=g.caught?'تم كشف الكذاب! كل من كشفه يحصل على نقطة.':'الكذاب نجا! ويحصل على نقطتين.';
  broadcastLiar(g);
  const until=g.phaseUntil;setTimeout(()=>{if(g.phase==='result'&&g.phaseUntil===until){liarStartRound(g)}},7600)
}"""
s=s[:start]+newfn+s[end:]
# add config event before liar start event
needle="s.on('liar:start',()=>{"
insert="""s.on('liar:config',({maxRounds}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='liar'||g.phase!=='lobby'||s.data?.pid!==g.hostId)return;g.maxRounds=Math.max(3,Math.min(15,Number(maxRounds)||8));broadcastLiar(g)});\n  """
s=s.replace(needle,insert+needle)
# Ensure resume handles liar already yes
# append richer bomb questions before lastQs
marker='const lastQs=['
extra="""const bombExtraQs=[
{q:'اذكر شيئًا في المطار',p:20,list:[['جواز سفر',false,20],['تذكرة',false,20],['طائرة',false,20],['حقيبة',false,20],['بوابة',false,20],['ثلاجة',true,-30]],extra:['مطار','موظف','جواز']},
{q:'اذكر شيئًا في الملعب',p:20,list:[['كرة',false,20],['جمهور',false,20],['مرمى',false,20],['حكم',false,20],['عشب',false,20],['ثلاجة',true,-30]],extra:['لاعب','مدرب','صافرة']},
{q:'اذكر شيئًا في المكتب',p:20,list:[['كمبيوتر',false,20],['قلم',false,20],['كرسي',false,20],['ورق',false,20],['طابعة',false,20],['وسادة',true,-30]],extra:['هاتف','دباسة','دفتر']},
{q:'اذكر شيئًا تراه في الشارع',p:20,list:[['سيارة',false,20],['إشارة مرور',false,20],['محل',false,20],['ناس',false,20],['رصيف',false,20],['ثلاجة',true,-30]],extra:['حافلة','دراجة','شجرة']},
{q:'اذكر شيئًا في الرحلة',p:20,list:[['حقيبة',false,20],['ماء',false,20],['جوال',false,20],['كاميرا',false,20],['طعام',false,20],['مقلاة',true,-30]],extra:['خريطة','شاحن','ملابس']},
{q:'اذكر شيئًا تستخدمه في الصيف',p:20,list:[['مكيف',false,20],['نظارة شمسية',false,20],['مروحة',false,20],['واقي شمس',false,20],['ماء',false,20],['مدفأة',true,-30]],extra:['قبعة','ملابس خفيفة','مسبح']},
{q:'اذكر شيئًا تستخدمه في الشتاء',p:20,list:[['معطف',false,20],['بطانية',false,20],['مدفأة',false,20],['شال',false,20],['قفازات',false,20],['مروحة',true,-30]],extra:['جوارب','مظلة','ملابس ثقيلة']},
{q:'اذكر شيئًا موجودًا في المطعم',p:20,list:[['طاولة',false,20],['كرسي',false,20],['قائمة الطعام',false,20],['أطباق',false,20],['نادل',false,20],['سرير',true,-30]],extra:['ملعقة','كوب','مناديل']},
{q:'اذكر شيئًا تشتريه من الصيدلية',p:20,list:[['دواء',false,20],['فيتامينات',false,20],['معقم',false,20],['مناديل',false,20],['شامبو',false,20],['كرة قدم',true,-30]],extra:['كريم','مسكن','فرشاة']},
{q:'اذكر شيئًا موجودًا في الفصل',p:20,list:[['سبورة',false,20],['طلاب',false,20],['معلم',false,20],['مقاعد',false,20],['كتب',false,20],['فرن',true,-30]],extra:['قلم','حقيبة','طاولة']},
{q:'اذكر شيئًا تأكله في الغداء',p:20,list:[['أرز',false,20],['دجاج',false,20],['سلطة',false,20],['لحم',false,20],['مكرونة',false,20],['شامبو',true,-30]],extra:['شوربة','خبز','سمك']},
{q:'اذكر شيئًا في غرفة المعيشة',p:20,list:[['كنبة',false,20],['تلفزيون',false,20],['طاولة',false,20],['سجادة',false,20],['ستارة',false,20],['دراجة',true,-30]],extra:['مكيف','مصباح','كرسي']},
{q:'اذكر شيئًا تستخدمه في المطبخ',p:20,list:[['سكين',false,20],['ملعقة',false,20],['قدر',false,20],['مقلاة',false,20],['خلاط',false,20],['وسادة',true,-30]],extra:['فرن','كوب','صحن']},
{q:'اذكر شيئًا في الحديقة',p:20,list:[['شجرة',false,20],['زهور',false,20],['عشب',false,20],['أرجوحة',false,20],['مقعد',false,20],['غسالة',true,-30]],extra:['نافورة','أطفال','كرة']},
{q:'اذكر شيئًا يفعله الناس في عطلة نهاية الأسبوع',p:20,list:[['النوم',false,20],['الخروج',false,20],['السفر',false,20],['اللعب',false,20],['زيارة الأصدقاء',false,20],['الذهاب للمدرسة',true,-30]],extra:['التسوق','السينما','البحر']},
{q:'اذكر شيئًا موجودًا في الحقيبة',p:20,list:[['محفظة',false,20],['جوال',false,20],['مفاتيح',false,20],['شاحن',false,20],['مناديل',false,20],['ثلاجة',true,-30]],extra:['قلم','سماعات','عطر']},
{q:'اذكر شيئًا تستخدمه للاستحمام',p:20,list:[['شامبو',false,20],['صابون',false,20],['منشفة',false,20],['ماء',false,20],['ليفة',false,20],['قلم',true,-30]],extra:['بلسم','شبشب','مرآة']},
{q:'اذكر شيئًا في السيارة وقت السفر',p:20,list:[['جوال',false,20],['شاحن',false,20],['ماء',false,20],['حقيبة',false,20],['مناديل',false,20],['ثلاجة',true,-30]],extra:['نظارة','موسيقى','خريطة']},
{q:'اذكر شيئًا تجده في الفندق',p:20,list:[['سرير',false,20],['منشفة',false,20],['تلفزيون',false,20],['حمام',false,20],['مفتاح',false,20],['سبورة',true,-30]],extra:['خزانة','ميني بار','وسادة']},
{q:'اذكر شيئًا يستخدمه اللاعب في كرة القدم',p:20,list:[['كرة',false,20],['حذاء',false,20],['قميص',false,20],['جوارب',false,20],['واقي الساق',false,20],['مقلاة',true,-30]],extra:['شورت','قفازات الحارس','صافرة']}
];
"""
s=s.replace(marker,extra+marker)
# combine bombQs after declaration closes. Use insertion after first array closing before lastQs.
needle='];\nconst lastQs=['
pos=s.find(needle, s.find('const bombQs=['))
if pos!=-1:
    s=s[:pos+2]+"\nconst bombAllQs=bombQs.concat(bombExtraQs);\n"+s[pos+2:]
    # Replace operational bombQs uses with bombAllQs except declaration and maybe references in text. Target functions only globally after declaration is safe if replace exact occurrences after declaration line.
    idx=s.find('const bombAllQs=')
    before=s[:idx]; after=s[idx:]
    after=after.replace('bombQs.filter','bombAllQs.filter').replace('bombQs.indexOf','bombAllQs.indexOf').replace('bombQs}','bombAllQs}').replace('bombQs.length','bombAllQs.length').replace('bombQs[','bombAllQs[')
    s=before+after
p.write_text(s)
