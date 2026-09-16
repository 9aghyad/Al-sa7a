const express=require('express');const http=require('http');const crypto=require('crypto');const fs=require('fs');const {Server}=require('socket.io');const path=require('path');
const app=express(),server=http.createServer(app),io=new Server(server,{perMessageDeflate:false});app.use(express.static(path.join(__dirname,'public'),{maxAge:0}));app.get('/health',(_,r)=>r.json({ok:true}));app.get(['/player','/display','/presenter'],(_,r)=>r.sendFile(path.join(__dirname,'public','index.html')));
app.get('/games/family-feud/',(_,r)=>r.sendFile(path.join(__dirname,'public','games','family-feud','index.html')));
app.get('/games/family-feud/presenter',(_,r)=>r.sendFile(path.join(__dirname,'public','games','family-feud','presenter.html')));
app.get('/games/family-feud/display',(_,r)=>r.sendFile(path.join(__dirname,'public','games','family-feud','display.html')));
app.get('/games/family-feud/players',(_,r)=>r.sendFile(path.join(__dirname,'public','games','family-feud','players.html')));app.get(['/games/mafia','/games/mafia/','/games/mafia/players','/games/mafia/players/'],(_,r)=>r.sendFile(path.join(__dirname,'public','games','mafia','players.html')));app.get('/games/bomb/',(_,r)=>r.sendFile(path.join(__dirname,'public','games','bomb','index.html')));app.get('/games/bomb/roles',(_,r)=>r.redirect('/games/bomb/'));app.get('/games/bomb/presenter',(_,r)=>r.redirect('/games/bomb/'));app.get('/games/bomb/display',(_,r)=>r.redirect('/games/bomb/'));app.get('/games/bomb/players',(_,r)=>r.sendFile(path.join(__dirname,'public','games','bomb','players.html')));
const games=new Map();const SESSION_FILE=path.join(__dirname,'data','sessions.json');const SESSION_RETENTION_MS=24*60*60*1000;const DISCONNECT_GRACE_MS=5*60*1000;
function persistGames(){try{fs.mkdirSync(path.dirname(SESSION_FILE),{recursive:true});const arr=[...games.values()].map(g=>({...g}));fs.writeFileSync(SESSION_FILE,JSON.stringify(arr));}catch(e){console.error('session save failed',e.message)}}
function rekey(obj,oldId,newId){if(!obj||oldId===newId)return;if(Object.prototype.hasOwnProperty.call(obj,oldId)){obj[newId]=obj[oldId];delete obj[oldId]}}
function restorePlayerIdentity(g,p,s){p.socketId=s.id;p.online=true;p.disconnectedAt=null;s.data.pid=p.id;s.data.sessionToken=p.sessionToken;s.data.team=p.team;s.data.game=g.code;s.data.role='player';s.join(g.code);return p}
function sessionToken(){return crypto.randomBytes(18).toString('hex')}
const prefixes={family:'A',guess:'B',market:'C',bomb:'D',last:'E',million:'G',mafia:'M'};
const familyModeCodes={verbal:'1',written:'2',players:'3',presenter:'1',display:'2'};
const familyMode=v=>{const x=String(v||'').toLowerCase();return familyModeCodes[x]||(['1','2','3'].includes(x)?x:'1')};
const clean=v=>String(v||'').trim().toUpperCase();function makeCode(game,mode){let c;if(game==='family'||game==='bomb'){const m=game==='family'?familyMode(mode):(['1','2','3'].includes(String(mode))?String(mode):'1');do c=prefixes[game]+m+crypto.randomInt(0,100).toString().padStart(2,'0');while(games.has(c));return c}do c=prefixes[game]+crypto.randomInt(0,1000).toString().padStart(3,'0');while(games.has(c));return c}function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ـ/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim()}function dist(a,b){a=norm(a);b=norm(b);let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(c[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[b.length]}function smart(a,b){a=norm(a);b=norm(b);if(!a||!b)return false;if(a===b||a.replace(/\s/g,'')===b.replace(/\s/g,''))return true;const bs=b.split(' ');if(a.split(' ').length===1&&a.length>=3&&bs.includes(a))return true;const d=dist(a,b),m=Math.max(a.length,b.length);return d<=Math.max(1,Math.floor(m*.22));}
const bombAliases=[['طائرة','طيارة'],['سيارة','سياره'],['جوال','هاتف'],['هاتف','جوال'],['موبايل','جوال'],['دراجة','دراجه'],['ثلاجة','ثلاجه'],['مكنسة','مكنسه'],['كنبة','أريكة'],['أريكة','كنبة'],['بطاطا','بطاطس'],['خبز','عيش'],['نقود','فلوس'],['مال','فلوس']];
function bombAlias(a,b){const x=norm(a),y=norm(b);if(x===y)return true;return bombAliases.some(pair=>(norm(pair[0])===x&&norm(pair[1])===y)||(norm(pair[1])===x&&norm(pair[0])===y));}
function bombSmartMatch(input,answer){const a=norm(input),b=norm(answer);if(!a||!b)return {ok:false,fuzzy:false};if(a===b||a.replace(/\s/g,'')===b.replace(/\s/g,''))return {ok:true,fuzzy:false};if(bombAlias(a,b))return {ok:true,fuzzy:true};const bs=b.split(' ');if(a.split(' ').length===1&&a.length>=3&&bs.includes(a))return {ok:true,fuzzy:true};const d=dist(a,b),m=Math.max(a.length,b.length),firstSame=a[0]===b[0],ok=firstSame&&d<=Math.max(1,Math.floor(m*.15));return {ok,fuzzy:ok&&d>0};}
function defaultQuestions(){return [{"q":"اذكر شيئًا تأخذه معك إلى المدرسة","a":[["حقيبة",30],["قلم",24],["دفتر",18],["كتاب",14],["ماء",8],["ممحاة",6]]},{"q":"اذكر شيئًا تجده في المطبخ","a":[["ثلاجة",30],["فرن",22],["ملعقة",18],["طبق",12],["كوب",10],["سكين",8]]},{"q":"اذكر شيئًا تفعله قبل النوم","a":[["الجوال",30],["الأسنان",25],["الوجه",15],["قراءة",12],["الماء",10],["النور",8]]},{"q":"اذكر شيئًا تنساه أحيانًا عند الخروج من البيت","a":[["المفاتيح",30],["الجوال",25],["المحفظة",20],["الشاحن",12],["النظارة",7],["المظلة",6]]},{"q":"اذكر شيئًا تشربه في الصباح","a":[["قهوة",35],["ماء",25],["شاي",18],["حليب",12],["عصير",10]]},{"q":"اذكر شيئًا تجده في غرفة النوم","a":[["سرير",35],["خزانة",22],["وسادة",18],["مرآة",10],["مصباح",8],["تلفزيون",7]]},{"q":"اذكر شيئًا تشتريه من السوبرماركت","a":[["ماء",25],["حليب",22],["خبز",20],["عصير",14],["شيبس",10],["مناديل",9]]},{"q":"اذكر شيئًا يفعله الناس في الإجازة","a":[["السفر",30],["النوم",22],["الخروج",20],["اللعب",12],["التسوق",9],["الراحة",7]]},{"q":"اذكر شيئًا تأخذه إلى البحر","a":[["ماء",28],["منشفة",22],["واقي",18],["كرة",12],["نظارة",10],["قبعة",10]]},{"q":"اذكر شيئًا موجودًا في السيارة","a":[["مقعد",25],["مكيف",22],["جوال",18],["شاحن",14],["مناديل",11],["ماء",10]]},{"q":"اذكر شيئًا تستخدمه لتنظيف البيت","a":[["مكنسة",33],["ممسحة",27],["منظف",20],["إسفنجة",13],["قفازات",7]]},{"q":"اذكر شيئًا تجده في الحمام","a":[["مرآة",25],["صابون",22],["منشفة",20],["فرشاة",15],["دش",10],["مغسلة",8]]},{"q":"اذكر شيئًا يأكله الناس على الفطور","a":[["بيض",30],["خبز",25],["جبن",18],["فول",12],["تمر",8],["مربى",7]]},{"q":"اذكر شيئًا يفعله الناس عندما يشعرون بالملل","a":[["الجوال",32],["النوم",24],["تلفزيون",18],["اللعب",12],["الخروج",8],["الأكل",6]]},{"q":"اذكر شيئًا يوقظك من النوم","a":[["منبه",40],["الجوال",20],["الشمس",15],["شخص",12],["الضوضاء",8],["العطش",5]]},{"q":"اذكر شيئًا يضيع كثيرًا في البيت","a":[["المفاتيح",30],["ريموت",24],["الجوال",20],["الشاحن",12],["النظارة",8],["الجوارب",6]]},{"q":"اذكر شيئًا تجده في الثلاجة","a":[["ماء",25],["حليب",22],["عصير",18],["خضار",15],["جبن",11],["فاكهة",9]]},{"q":"اذكر شيئًا يشتريه الناس كهدية","a":[["عطر",28],["ورد",22],["شوكولاتة",18],["ساعة",14],["ملابس",10],["لعبة",8]]},{"q":"اذكر شيئًا يفعله الناس في المطعم","a":[["الأكل",40],["الطلب",20],["التحدث",15],["التصوير",10],["الشرب",8],["الحساب",7]]},{"q":"اذكر شيئًا تراه في السماء","a":[["شمس",28],["سحاب",25],["طائرة",18],["قمر",15],["نجوم",9],["طيور",5]]},{"q":"اذكر شيئًا يستخدمه الطالب","a":[["قلم",28],["كتاب",24],["دفتر",20],["حقيبة",14],["ممحاة",8],["مسطرة",6]]},{"q":"اذكر شيئًا موجودًا في غرفة المعيشة","a":[["كنبة",30],["تلفزيون",25],["طاولة",18],["سجادة",12],["ستارة",8],["مكيف",7]]},{"q":"اذكر شيئًا يفعله الناس عندما تمطر","a":[["البيت",30],["فتح",25],["معطف",18],["شاي",12],["تصوير",8],["قيادة",7]]},{"q":"اذكر شيئًا يحب الأطفال في الحديقة","a":[["أرجوحة",30],["زحليقة",25],["كرة",18],["دراجة",12],["الجري",8],["الرمل",7]]},{"q":"اذكر شيئًا موجودًا في المكتب","a":[["كمبيوتر",30],["قلم",22],["أوراق",20],["كرسي",15],["طابعة",8],["هاتف",5]]},{"q":"اذكر شيئًا يفعله الناس في المطار","a":[["الانتظار",28],["حقائب",22],["التفتيش",18],["طائرة",15],["الأكل",10],["التسجيل",7]]},{"q":"اذكر شيئًا يفعله الناس في العيد","a":[["الأهل",28],["العيدية",22],["لبس",20],["الحلويات",12],["الصلاة",10],["التصوير",8]]},{"q":"اذكر شيئًا مشهورًا في رمضان","a":[["الإفطار",30],["التمر",22],["السحور",18],["الصلاة",15],["القطايف",9],["الفانوس",6]]},{"q":"اذكر شيئًا تستخدمه في الطبخ","a":[["ملعقة",25],["سكين",22],["قدر",20],["مقلاة",15],["فرن",10],["لوح",8]]},{"q":"اذكر شيئًا يفعله الناس بعد العودة من العمل","a":[["الراحة",28],["الأكل",22],["ملابس",18],["الاستحمام",14],["النوم",10],["الجوال",8]]},{"q":"اذكر شيئًا تحتاجه في السفر","a":[["جواز",30],["ملابس",24],["جوال",18],["شاحن",12],["مال",9],["حقيبة",7]]},{"q":"اذكر شيئًا يفعله الناس في الشاطئ","a":[["السباحة",30],["المشي",20],["كرة",18],["الاسترخاء",15],["التصوير",10],["الأكل",7]]},{"q":"اذكر شيئًا يجعلك سعيدًا","a":[["العائلة",30],["الأصدقاء",22],["المال",18],["النجاح",14],["السفر",9],["الهدايا",7]]},{"q":"اذكر شيئًا يجعل الناس غاضبين","a":[["الزحمة",28],["التأخير",22],["الكذب",20],["الضوضاء",12],["الانتظار",10],["الخلاف",8]]},{"q":"اذكر شيئًا قد ينكسر بسهولة","a":[["زجاج",30],["كوب",24],["طبق",18],["مرآة",12],["هاتف",9],["مصباح",7]]},{"q":"اذكر شيئًا تضعه في محفظتك","a":[["هوية",30],["نقود",25],["بطاقة",20],["صور",10],["إيصالات",8],["مفتاح",7]]},{"q":"اذكر شيئًا موجودًا في الملعب","a":[["كرة",30],["لاعبون",25],["جمهور",18],["مرمى",12],["حكم",8],["مدرجات",7]]},{"q":"اذكر شيئًا تأخذه إلى النادي الرياضي","a":[["ماء",28],["منشفة",22],["حذاء",20],["ملابس",15],["سماعات",9],["حقيبة",6]]},{"q":"اذكر شيئًا تفعله عند الفوز","a":[["الاحتفال",30],["الصراخ",20],["التصفيق",18],["التصوير",12],["العناق",10],["الضحك",10]]},{"q":"اذكر شيئًا تفعله عند الخسارة","a":[["الحزن",28],["المحاولة",22],["الصمت",18],["التفكير",14],["الضحك",10],["التهنئة",8]]},{"q":"اذكر شيئًا تشتريه للبيت","a":[["أثاث",28],["تلفزيون",22],["ستارة",18],["سجادة",14],["مكيف",10],["مصباح",8]]},{"q":"اذكر شيئًا تستخدمه في الشتاء","a":[["معطف",31],["بطانية",27],["مدفأة",22],["شاي",13],["مظلة",7]]},{"q":"اذكر شيئًا تستخدمه في الصيف","a":[["مكيف",30],["ماء",24],["مروحة",18],["نظارة",12],["آيس",9],["قبعة",7]]},{"q":"اذكر حيوانًا أليفًا","a":[["قط",35],["كلب",28],["طائر",15],["سمكة",12],["أرنب",10]]},{"q":"اذكر فاكهة مشهورة","a":[["تفاح",25],["موز",22],["برتقال",18],["بطيخ",15],["فراولة",12],["عنب",8]]},{"q":"اذكر لونًا مشهورًا للسيارات","a":[["أبيض",30],["أسود",25],["فضي",18],["أحمر",12],["أزرق",10],["رمادي",5]]},{"q":"اذكر شيئًا تجده في المدرسة","a":[["طلاب",28],["معلم",22],["سبورة",18],["مقاعد",14],["كتب",10],["حقيبة",8]]},{"q":"اذكر شيئًا تفعله في نهاية الأسبوع","a":[["النوم",28],["الخروج",25],["الأهل",20],["التسوق",12],["اللعب",8],["السفر",7]]},{"q":"اذكر شيئًا تضعه على المائدة","a":[["طبق",28],["ملعقة",22],["كوب",20],["ماء",14],["مناديل",9],["خبز",7]]},{"q":"اذكر شيئًا تسمعه في الصباح","a":[["منبه",30],["الأذان",22],["سيارات",18],["الطيور",12],["التلفزيون",10],["العائلة",8]]},{"q":"اذكر شيئًا تفعله عندما تكون مريضًا","a":[["النوم",28],["الراحة",24],["الدواء",20],["الطبيب",14],["الماء",8],["البيت",6]]},{"q":"اذكر شيئًا تستخدمه للتواصل","a":[["جوال",35],["رسالة",20],["مكالمة",18],["واتساب",12],["بريد",8],["فيديو",7]]}];}
function ffRoom(mode,rounds=5){mode=familyMode(mode);return {type:'family',code:makeCode('family',mode),mode,players:[],teams:[{id:'A',name:'الفريق الأحمر',score:0,strikes:0,doubleUsed:false,players:[]},{id:'B',name:'الفريق الأزرق',score:0,strikes:0,doubleUsed:false,players:[]}],rounds:Math.max(1,Math.min(100,Number(rounds)||5)),currentRound:0,questionIndex:-1,question:'',answers:[],phase:'lobby',lock:null,answerLock:null,bank:defaultQuestions(),usedQuestionIndexes:[]}}
function guessRoom(){return {type:'guess',code:makeCode('guess'),hostId:null,players:[],category:null,phase:'lobby',round:0,maxRounds:5,roundsLocked:false,secret:{},guessed:{},revealedBy:{},scores:{},usedCategories:[],usedWords:{},history:[],roundWinners:[]}}
const CATS=require('./games/guess/data.js');
function pickUnused(arr,used){const choices=arr.map((_,i)=>i).filter(i=>!used.includes(arr[i]));if(!choices.length){used.length=0;choices.push(...arr.map((_,i)=>i))}return arr[choices[Math.floor(Math.random()*choices.length)]]}
function guessPool(cat,round){const c=CATS[cat];if(!c)return[];const levels=['easy','medium','hard'];return c[levels[(Math.max(1,round)-1)%3]]||[]}
function marketRoom(mode,maxRounds){return {type:'market',code:makeCode('market'),mode:mode==='players'?'players':'presenter',players:[],phase:'lobby',round:0,maxRounds:Math.max(1,Math.min(30,Number(maxRounds)||10)),question:'',points:0,used:[],current:null,answerUntil:0,buzzUntil:0,votes:{},scores:{},doubleUsed:{},doubleActive:false,history:[]}}
const marketQs=[
['اذكر 5 أشياء تجدها في شنطة السفر',20],['اذكر 5 أكلات شعبية سعودية',30],['اذكر 5 أشياء تستخدمها في السيارة',15],['اذكر 5 دول عربية',10],['اذكر 5 أشياء في المطبخ',15],['اذكر 5 أشياء تشتريها من السوبرماركت',10],['اذكر 5 ألعاب مشهورة',20],['اذكر 5 لاعبين كرة قدم',25],['اذكر 5 أشياء في البحر',15],['اذكر 5 أشياء غالية',30],['اذكر 5 وظائف',10],['اذكر 5 أشياء تفعلها في الإجازة',15],
['اذكر 5 أشياء يحتاجها الطالب',10],['اذكر 5 مشروبات باردة',10],['اذكر 5 حلويات مشهورة',15],['اذكر 5 مدن سعودية',20],['اذكر 5 أشياء في غرفة النوم',10],['اذكر 5 أشياء تأخذها للبر',25],['اذكر 5 أشياء في الملعب',15],['اذكر 5 تطبيقات يستخدمها الناس يوميًا',20],
['اذكر 5 أشياء تفعلها قبل النوم',10],['اذكر 5 أشياء في المكتب',10],['اذكر 5 حيوانات أليفة',10],['اذكر 5 حيوانات مفترسة',20],['اذكر 5 أشياء لونها أبيض',10],['اذكر 5 أشياء تستخدم في الرياضة',15],['اذكر 5 أشياء في المطار',15],['اذكر 5 أشياء تشتريها كهدية',20],['اذكر 5 أشياء في الثلاجة',10],['اذكر 5 أشياء تسبب الزحمة',20],
['اذكر 5 أشياء في العيد',15],['اذكر 5 أشياء في رمضان',15],['اذكر 5 أشياء تسمعها في الصباح',10],['اذكر 5 أشياء موجودة في الفندق',20],['اذكر 5 أماكن تذهب لها مع الأصدقاء',15],['اذكر 5 أكلات تبدأ بحرف الميم',25],['اذكر 5 أشياء تبدأ بحرف السين',25],['اذكر 5 دول تبدأ بحرف الألف',25],['اذكر 5 لاعبين سعوديين',25],['اذكر 5 أفلام مشهورة',20],
['اذكر 5 شخصيات كرتونية',15],['اذكر 5 أدوات تنظيف',10],['اذكر 5 قطع ملابس',10],['اذكر 5 أشياء تستخدمها في الصيف',15],['اذكر 5 أشياء تستخدمها في الشتاء',15],['اذكر 5 أشياء في السيارة من الداخل',20],['اذكر 5 أشياء يمكن أن تنكسر',20],['اذكر 5 أشياء يشتريها الناس عند افتتاح بيت جديد',25],['اذكر 5 أشياء تجعل الرحلة ممتعة',20],['اذكر 5 أشياء تخاف منها',25],
['اذكر 5 رياضات فردية',15],['اذكر 5 رياضات جماعية',15],['اذكر 5 فواكه',10],['اذكر 5 خضروات',10],['اذكر 5 أنواع قهوة',15],['اذكر 5 مطاعم أو أنواع مطاعم',20],['اذكر 5 وظائف تحتاج زيًا رسميًا',20],['اذكر 5 أشياء في الحمام',10],['اذكر 5 أشياء تحملها في محفظتك',15],['اذكر 5 أشياء تضيع في البيت',20]
];
function marketStart(g){if(g.round>=g.maxRounds){g.phase='finished';broadcast(g);return}const available=marketQs.filter((_,i)=>!g.used.includes(i));if(!available.length)g.used=[];const pool=available.length?available:marketQs;const picked=pool[Math.floor(Math.random()*pool.length)];const idx=marketQs.indexOf(picked);g.used.push(idx);g.round++;g.question=picked[0];g.points=picked[1];g.phase='question';g.questionUntil=Date.now()+1700;g.current=null;g.votes={};g.answerUntil=0;g.buzzUntil=0;g.doubleActive=false;broadcast(g);setTimeout(()=>{if(g.phase==='question'){g.phase='points';g.questionUntil=0;g.pointsUntil=Date.now()+1100;broadcast(g);setTimeout(()=>{if(g.phase==='points'){g.phase='countdown';g.countdownUntil=Date.now()+3000;broadcast(g);setTimeout(()=>{if(g.phase==='countdown'){g.phase='buzz';g.buzzUntil=Date.now()+5000;broadcast(g);setTimeout(()=>{if(g.phase==='buzz'&&g.buzzUntil<=Date.now()){g.phase='results';g.history.push({round:g.round,player:null,question:g.question,points:g.points,result:'انتهى وقت الضغط',delta:0});broadcast(g)}},5100)}},3100)}},1200)}},1800)}
function millionRoom(mode){return {type:'million',code:makeCode('million'),mode:(game==='bomb'?'3':(['1','2','3'].includes(String(mode))?String(mode):'1')),players:[],phase:'lobby',started:false,ladder:[1000,5000,10000,25000,50000,100000,250000,500000,1000000],guaranteed:[50000,500000],questions:[{"level":0,"q":"ما عاصمة المملكة العربية السعودية؟","o":["جدة","الرياض","الدمام","أبها"],"a":1},{"level":0,"q":"كم عدد أيام الأسبوع؟","o":["5","6","7","8"],"a":2},{"level":0,"q":"أي حيوان يُعرف بسفينة الصحراء؟","o":["حصان","جمل","فيل","أسد"],"a":1},{"level":0,"q":"ما لون الموز غالبًا عند نضجه؟","o":["أزرق","أصفر","بنفسجي","أسود"],"a":1},{"level":0,"q":"كم ضلعًا للمثلث؟","o":["2","3","4","5"],"a":1},{"level":1,"q":"ما الكوكب المعروف بالكوكب الأحمر؟","o":["الزهرة","المريخ","المشتري","عطارد"],"a":1},{"level":1,"q":"كم شهرًا في السنة؟","o":["10","11","12","13"],"a":2},{"level":1,"q":"ما أكبر محيط في العالم؟","o":["الأطلسي","الهندي","الهادئ","المتجمد"],"a":2},{"level":1,"q":"أي عنصر رمزه O؟","o":["ذهب","أكسجين","حديد","فضة"],"a":1},{"level":1,"q":"كم دقيقة في الساعة؟","o":["30","45","60","90"],"a":2},{"level":2,"q":"ما عاصمة فرنسا؟","o":["مدريد","باريس","روما","برلين"],"a":1},{"level":2,"q":"كم عدد ألوان قوس قزح التقليدية؟","o":["5","6","7","8"],"a":2},{"level":2,"q":"أي حيوان هو الأسرع برًا؟","o":["فهد","حصان","أسد","ذئب"],"a":0},{"level":2,"q":"ما اللغة الرسمية في البرازيل؟","o":["الإسبانية","البرتغالية","الفرنسية","الإنجليزية"],"a":1},{"level":2,"q":"ما أكبر قارة؟","o":["أفريقيا","أوروبا","آسيا","أستراليا"],"a":2},{"level":3,"q":"من رسم لوحة الموناليزا؟","o":["بيكاسو","ليوناردو دا فنشي","فان غوخ","رامبرانت"],"a":1},{"level":3,"q":"ما الغاز الأكثر وجودًا في الغلاف الجوي؟","o":["الأكسجين","النيتروجين","الهيدروجين","ثاني أكسيد الكربون"],"a":1},{"level":3,"q":"كم لاعبًا يبدأ به فريق كرة القدم داخل الملعب؟","o":["9","10","11","12"],"a":2},{"level":3,"q":"ما عاصمة اليابان؟","o":["أوساكا","طوكيو","كيوتو","هيروشيما"],"a":1},{"level":3,"q":"أي كوكب هو الأكبر في المجموعة الشمسية؟","o":["زحل","المشتري","الأرض","نبتون"],"a":1},{"level":4,"q":"ما العنصر الذي رمزه Fe؟","o":["الحديد","الذهب","الفضة","النحاس"],"a":0},{"level":4,"q":"ما أعمق محيطات العالم؟","o":["الأطلسي","الهندي","الهادئ","المتجمد الشمالي"],"a":2},{"level":4,"q":"من مؤلف رواية البؤساء؟","o":["فيكتور هوغو","تولستوي","شكسبير","ديكنز"],"a":0},{"level":4,"q":"ما الوحدة الأساسية لقياس شدة التيار الكهربائي؟","o":["الفولت","الأمبير","الواط","الأوم"],"a":1},{"level":4,"q":"ما عاصمة أستراليا؟","o":["سيدني","ملبورن","كانبيرا","بيرث"],"a":2},{"level":5,"q":"أي حضارة بنت ماتشو بيتشو؟","o":["الرومان","الإنكا","الفراعنة","الإغريق"],"a":1},{"level":5,"q":"ما اسم العملية التي تصنع بها النباتات غذاءها؟","o":["التنفس","البناء الضوئي","التخمير","الهضم"],"a":1},{"level":5,"q":"كم عدد عظام جسم الإنسان البالغ تقريبًا؟","o":["106","206","306","406"],"a":1},{"level":5,"q":"أي دولة ليست عضوًا في شبه الجزيرة الإسكندنافية جغرافيًا؟","o":["النرويج","السويد","فنلندا","الدنمارك"],"a":3},{"level":5,"q":"ما الكوكب الذي يملك أكبر عدد معروف من الأقمار في هذه اللعبة؟","o":["الأرض","عطارد","زحل","الزهرة"],"a":2},{"level":6,"q":"ما اسم أصغر عظمة في جسم الإنسان؟","o":["المطرقة","الركاب","الزند","الشظية"],"a":1},{"level":6,"q":"أي طبقة من الغلاف الجوي تحدث فيها معظم ظواهر الطقس؟","o":["التروبوسفير","الستراتوسفير","الميزوسفير","الإكسوسفير"],"a":0},{"level":6,"q":"ما عاصمة كندا؟","o":["تورنتو","فانكوفر","أوتاوا","مونتريال"],"a":2},{"level":6,"q":"ما العدد الذري للكربون؟","o":["4","6","8","12"],"a":1},{"level":6,"q":"أي بحر يفصل بين أوروبا وأفريقيا؟","o":["بحر العرب","البحر المتوسط","بحر البلطيق","بحر الشمال"],"a":1},{"level":7,"q":"أي عالم وضع قوانين الحركة الثلاثة؟","o":["أينشتاين","نيوتن","غاليلو","داروين"],"a":1},{"level":7,"q":"ما أكبر غدة في جسم الإنسان؟","o":["البنكرياس","الكبد","الغدة الدرقية","النخامية"],"a":1},{"level":7,"q":"أي مدينة تُعرف بمدينة القنوات؟","o":["البندقية","مدريد","أثينا","براغ"],"a":0},{"level":7,"q":"ما الرمز الكيميائي للذهب؟","o":["Ag","Au","Fe","Gd"],"a":1},{"level":7,"q":"أي محيط يحيط بالقارة القطبية الجنوبية؟","o":["الأطلسي","المتجمد الشمالي","الجنوبي","الهندي"],"a":2},{"level":8,"q":"ما اسم النظرية التي تفسر انحناء الزمكان بفعل الكتلة والطاقة؟","o":["النسبية العامة","الكمومية","التطور","الأوتار"],"a":0},{"level":8,"q":"أي ثابت رياضي يساوي تقريبًا 3.14159؟","o":["في","هـ","باي","فاي"],"a":2},{"level":8,"q":"ما أقدم جامعة ما زالت تعمل وفق تاريخ تأسيسها التقليدي؟","o":["القرويين","هارفارد","السوربون","أكسفورد"],"a":0},{"level":8,"q":"ما الوحدة الدولية للتردد؟","o":["نيوتن","هرتز","جول","باسكال"],"a":1},{"level":8,"q":"ما عاصمة منغوليا؟","o":["أستانا","أولان باتور","طشقند","بيشكيك"],"a":1}],playersState:{},history:[],turnOrder:[],turnIndex:0,turnPlayer:null}}
function millionPick(g,st,level){let pool=g.questions.filter(q=>q.level===level&&!st.used.includes(q.q));if(!pool.length){const levelWords=new Set(g.questions.filter(q=>q.level===level).map(q=>q.q));st.used=st.used.filter(x=>!levelWords.has(x));pool=g.questions.filter(q=>q.level===level)}return pool[Math.floor(Math.random()*pool.length)]}
function millionInitPlayer(g,p){if(g.playersState[p.id])return;const q=millionPick(g,{used:[]},0);g.playersState[p.id]={level:0,bank:0,guaranteed:0,active:true,secured:null,lifelines:{audience:true,fifty:true,change:true,secure:true},question:q,options:q.o.slice(),used:[q.q]}}
function millionAdvance(g){if(!g.turnOrder?.length){g.turnPlayer=null;g.phase='finished';return}for(let step=1;step<=g.turnOrder.length;step++){const idx=(g.turnIndex+step)%g.turnOrder.length;const id=g.turnOrder[idx];if(g.playersState[id]?.active){g.turnIndex=idx;g.turnPlayer=id;g.phase='play';return}}g.turnPlayer=null;g.phase='finished'}
function pubMillion(g){return {...g,questions:undefined,playersState:Object.fromEntries(Object.entries(g.playersState).map(([id,x])=>[id,{...x,question:x.question?x.question.q:undefined,options:x.options}]))}}
function pub(g){if(g.type==='family'){const teams=(g.teams||[]).map(t=>({...t,players:(g.players||[]).filter(p=>p.team===t.id).map(p=>({id:p.id,name:p.name,online:p.online!==false,status:p.online!==false?'online':(p.disconnectedAt&&Date.now()-p.disconnectedAt<DISCONNECT_GRACE_MS?'reconnecting':'away')}))}));return {...g,players:(g.players||[]).map(p=>({id:p.id,name:p.name,team:p.team,online:p.online!==false,disconnectedAt:p.disconnectedAt||null,status:p.online!==false?'online':(p.disconnectedAt&&Date.now()-p.disconnectedAt<DISCONNECT_GRACE_MS?'reconnecting':'away')})),teams,bank:undefined}}if(g.type==='guess')return null;if(g.type==='million')return pubMillion(g);return g}
function mafiaPublic(g,sid){const sock=io.sockets.sockets.get(sid),pid=sock?.data?.pid,host=g.hostId===pid;const me=g.players.find(p=>p.id===pid);const out={type:'mafia',code:g.code,phase:g.phase,phaseUntil:g.phaseUntil||0,players:g.players.map(p=>({id:p.id,name:p.name,alive:p.alive!==false,online:p.online!==false,status:p.online!==false?'online':'away',role:g.phase==='finished'?p.role:undefined})),config:g.config,myRole:me?.role,myAction:g.phase==='night'?(g.nightActions?.[pid]||null):g.phase==='vote'?(g.votes?.[pid]?{submitted:true,targetId:g.votes[pid]}:null):null,isHost:host,winnerText:g.winnerText||null,chat:(g.chat||[]).slice(-60),voteResult:g.voteResult||null};if(g.phase==='night'&&me?.role==='detective'&&g.investigationResults?.[pid]!==undefined)out.investigationResult=g.investigationResults[pid];if(g.phase==='vote'&&g.voteResults&&Date.now()>=g.phaseUntil)out.voteResults=g.voteResults;if(g.phase==='discussion'&&g.lastNightResult)out.lastNightResult=g.lastNightResult;return out}
function broadcastMafia(g){const room=io.sockets.adapter.rooms.get(g.code);if(!room)return;for(const sid of room){const sock=io.sockets.sockets.get(sid);if(sock)io.to(sid).emit('state',mafiaPublic(g,sid))}persistGames()}
function broadcast(g){if(g.phase==='finished'&&!g.finishedAt)g.finishedAt=Date.now();if(g.type==='mafia'){broadcastMafia(g);return}if(g.type==='guess'){broadcastGuess(g);persistGames();return}if(g.type==='bomb'){broadcastBomb(g);persistGames();return}io.to(g.code).emit('state',pub(g));persistGames()}
function bombPublicState(g,sid){const isHost=io.sockets.sockets.get(sid)?.data?.role==='presenter';const answers=(g.answers||[]).map(a=>isHost||a.revealed?{text:a.text,points:a.points,trap:a.revealed?a.trap:undefined,revealed:a.revealed,awarded:a.awarded}:({text:'',points:0,revealed:false,awarded:false}));const teams=(g.teams||[]).map(t=>({id:t.id,name:t.name,score:t.score,players:(t.players||[]).map(p=>({id:p.id,name:p.name,online:p.online!==false}))}));const out={...g,answers,teams,players:(g.players||[]).map(p=>({id:p.id,name:p.name,team:p.team,online:p.online!==false})),scores:g.scores,questionStats:{listed:(g.answers||[]).length,traps:(g.answers||[]).filter(a=>a.trap).length,extra:(g.extra||[]).length,round:g.round}};if(!isHost){out.extra=undefined;out.used=undefined}return out}
function emitBombState(g,sid){if(g&&sid&&io.sockets.sockets.has(sid))io.to(sid).emit('state',bombPublicState(g,sid))}
function broadcastBomb(g){const room=io.sockets.adapter.rooms.get(g.code);if(!room)return;for(const sid of room)emitBombState(g,sid)}
function emitBombStateToSocket(g,s){if(!g||g.type!=='bomb'||!s)return;const isHost=s.data?.role==='presenter';const answers=(g.answers||[]).map(a=>isHost||a.revealed?{text:a.text,points:a.points,trap:a.revealed?a.trap:undefined,revealed:a.revealed,awarded:a.awarded}:{text:'',points:0,revealed:false,awarded:false});const teams=(g.teams||[]).map(t=>({id:t.id,name:t.name,score:t.score,players:(t.players||[]).map(p=>({id:p.id,name:p.name,online:p.online!==false}))}));const out={...g,answers,teams,players:(g.players||[]).map(p=>({id:p.id,name:p.name,team:p.team,online:p.online!==false})),scores:g.scores,questionStats:{listed:(g.answers||[]).length,traps:(g.answers||[]).filter(a=>a.trap).length,extra:(g.extra||[]).length,round:g.round}};if(!isHost){out.extra=undefined;out.used=undefined}s.emit('state',out)}
function broadcastGuess(g){const room=io.sockets.adapter.rooms.get(g.code);if(!room)return;for(const sid of room){const sock=io.sockets.sockets.get(sid);const viewer=sock?.data?.pid;const out={...g,secret:undefined,players:g.players.map(p=>({...p,revealedWord:g.revealedBy?.[viewer]?.[p.id]||null,guessed:!!g.guessed[p.id],score:g.scores[p.id]||0}))};io.to(sid).emit('state',out)}}
function addPlayer(g,s,name,team,token){const cleanToken=String(token||'');const existing=cleanToken&&g.players.find(p=>p.sessionToken===cleanToken);if(existing){return restorePlayerIdentity(g,existing,s)}if(g.players.some(p=>p.socketId===s.id&&p.online!==false))return g.players.find(p=>p.socketId===s.id);let chosen=team==='B'?'B':'A';const p={id:'P'+crypto.randomBytes(10).toString('hex'),name:String(name||'').trim().slice(0,24)||'لاعب',team:chosen,sessionToken:sessionToken(),online:true,disconnectedAt:null,socketId:s.id};g.players.push(p);if(g.type==='family'||g.type==='bomb')g.teams.find(t=>t.id===p.team).players.push(p);if(g.type==='guess')g.scores[p.id]=0;if(g.type==='bomb')g.scores[p.id]=0;if(g.type==='million')millionInitPlayer(g,p);s.join(g.code);s.data={game:g.code,role:'player',pid:p.id,team:p.team,sessionToken:p.sessionToken};persistGames();return p}
function startFF(g,incrementRound=true){let choices=g.bank.map((_,i)=>i).filter(i=>!g.usedQuestionIndexes.includes(i));if(!choices.length){g.usedQuestionIndexes=[];choices=g.bank.map((_,i)=>i)}const idx=choices[Math.floor(Math.random()*choices.length)];g.usedQuestionIndexes.push(idx);const q=g.bank[idx];if(incrementRound||g.currentRound<1)g.currentRound++;g.questionIndex=idx;g.question=q.q;g.answers=q.a.map(x=>({text:x[0],points:x[1],revealed:false,awarded:false}));g.phase='countdown';g.countdownUntil=Date.now()+3000;g.lock=null;g.answerLock=null;g.teams.forEach(t=>{t.strikes=0;t.doubleActive=false;t.doublePlayer=''});broadcast(g);const round=g.currentRound,until=g.countdownUntil;setTimeout(()=>{if(g.phase==='countdown'&&g.currentRound===round&&g.countdownUntil===until&&Date.now()>=until){g.phase='question';g.countdownUntil=0;broadcast(g)}},3100)}
function ffHost(s,g){return s.data?.game===g.code&&s.data.role==='presenter'&&['1','2'].includes(g.mode)}
const bombQs=[
{q:'اذكر دولة بحرف الميم',p:20,list:[['مصر',false,20],['مالي',false,20],['مالطا',false,20],['ماليزيا',false,20],['مدغشقر',false,20],['المكسيك',true,-30]],extra:['موناكو','موريتانيا','موزمبيق']},
{q:'اذكر اسمًا بحرف الباء',p:20,list:[['بدر',false,20],['باسم',false,20],['بندر',false,20],['بسام',false,20],['براء',false,20],['بلال',true,-30]],extra:['بشير','بشار','بدران']},
{q:'اذكر حيوانًا يبدأ بحرف الألف',p:20,list:[['أسد',false,20],['أرنب',false,20],['أخطبوط',false,20],['أوزة',false,20],['أيل',false,20],['أفعى',true,-30]],extra:['أرنب بري','أسماك','أبو بريص']},
{q:'اذكر فاكهة لونها أحمر',p:20,list:[['تفاح',false,20],['فراولة',false,20],['كرز',false,20],['بطيخ',false,20],['رمان',false,20],['توت',true,-30]],extra:['عنب أحمر','برقوق','تين']},
{q:'اذكر شيئًا تجده في المدرسة',p:20,list:[['كتاب',false,20],['قلم',false,20],['دفتر',false,20],['سبورة',false,20],['حقيبة',false,20],['جرس',true,-30]],extra:['مقعد','معلم','مسطرة']},
{q:'اذكر شيئًا تأخذه معك إلى البحر',p:20,list:[['منشفة',false,20],['ماء',false,20],['نظارة شمسية',false,20],['واقي شمس',false,20],['كرة',false,20],['مظلة',true,-30]],extra:['كرسي','قبعة','شبشب']},
{q:'اذكر شيئًا موجودًا في المطبخ',p:20,list:[['ثلاجة',false,20],['فرن',false,20],['ملعقة',false,20],['قدر',false,20],['مقلاة',false,20],['غسالة',true,-30]],extra:['كوب','سكين','صحن']},
{q:'اذكر شيئًا تستخدمه قبل النوم',p:20,list:[['فرشاة أسنان',false,20],['جوال',false,20],['وسادة',false,20],['منبه',false,20],['بطانية',false,20],['مكنسة',true,-30]],extra:['كتاب','ماء','إطفاء الأنوار']},
{q:'اذكر شيئًا تجده في السيارة',p:20,list:[['مقود',false,20],['مقعد',false,20],['مكيف',false,20],['شاحن',false,20],['مناديل',false,20],['ثلاجة',true,-30]],extra:['ماء','راديو','عجلة احتياط']},
{q:'اذكر لونًا يبدأ بحرف الألف',p:20,list:[['أحمر',false,20],['أزرق',false,20],['أخضر',false,20],['أصفر',false,20],['أبيض',false,20],['أسود',true,-30]],extra:['أرجواني','أزرق سماوي','أصفر فاتح']},
{q:'اذكر دولة عربية',p:20,list:[['السعودية',false,20],['مصر',false,20],['الإمارات',false,20],['الكويت',false,20],['قطر',false,20],['الأردن',true,-30]],extra:['البحرين','عمان','لبنان']},
{q:'اذكر شيئًا تشتريه من السوبرماركت',p:20,list:[['حليب',false,20],['خبز',false,20],['ماء',false,20],['بيض',false,20],['أرز',false,20],['تلفزيون',true,-30]],extra:['عصير','مناديل','جبن']},
{q:'اذكر شيئًا موجودًا في غرفة النوم',p:20,list:[['سرير',false,20],['وسادة',false,20],['خزانة',false,20],['مرآة',false,20],['مصباح',false,20],['فرن',true,-30]],extra:['بطانية','تلفزيون','ستارة']},
{q:'اذكر رياضة مشهورة',p:20,list:[['كرة قدم',false,20],['كرة سلة',false,20],['تنس',false,20],['سباحة',false,20],['جري',false,20],['شطرنج',true,-30]],extra:['ملاكمة','دراجات','كرة طائرة']},
{q:'اذكر شيئًا تشربه في الصباح',p:20,list:[['قهوة',false,20],['ماء',false,20],['شاي',false,20],['حليب',false,20],['عصير',false,20],['شوربة',true,-30]],extra:['كابتشينو','نسكافيه','مشروب ساخن']},
{q:'اذكر شيئًا موجودًا في الحمام',p:20,list:[['مرآة',false,20],['منشفة',false,20],['صابون',false,20],['شامبو',false,20],['فرشاة أسنان',false,20],['تلفزيون',true,-30]],extra:['دش','مغسلة','معجون أسنان']},
{q:'اذكر شيئًا تحمله في حقيبتك',p:20,list:[['جوال',false,20],['محفظة',false,20],['مفاتيح',false,20],['شاحن',false,20],['مناديل',false,20],['مقلاة',true,-30]],extra:['قلم','عطر','سماعات']},
{q:'اذكر شيئًا تراه في السماء',p:20,list:[['شمس',false,20],['قمر',false,20],['سحاب',false,20],['طائرة',false,20],['نجوم',false,20],['سمكة',true,-30]],extra:['طير','برق','قوس قزح']},
{q:'اذكر شيئًا يفعله الناس في العيد',p:20,list:[['زيارة العائلة',false,20],['لبس الجديد',false,20],['العيدية',false,20],['الصلاة',false,20],['الحلويات',false,20],['الامتحان',true,-30]],extra:['التصوير','المعايدة','الضيافة']},
{q:'اذكر شيئًا تضعه في حقيبة السفر',p:20,list:[['ملابس',false,20],['جواز السفر',false,20],['شاحن',false,20],['حذاء',false,20],['فرشاة أسنان',false,20],['ثلاجة',true,-30]],extra:['عطر','منشفة','سماعات']},
{q:'اذكر شيئًا يستخدمه الناس لتنظيف البيت',p:20,list:[['مكنسة',false,20],['ممسحة',false,20],['منظف',false,20],['إسفنجة',false,20],['قفازات',false,20],['ملعقة',true,-30]],extra:['مكنسة كهربائية','مناديل','سائل تنظيف']},
{q:'اذكر شيئًا موجودًا في المكتب',p:20,list:[['كمبيوتر',false,20],['قلم',false,20],['أوراق',false,20],['كرسي',false,20],['طابعة',false,20],['ثلاجة',true,-30]],extra:['هاتف','دفتر','دباسة']},
{q:'اذكر وسيلة نقل',p:20,list:[['سيارة',false,20],['طائرة',false,20],['قطار',false,20],['حافلة',false,20],['دراجة',false,20],['مصعد',true,-30]],extra:['سفينة','تاكسي','دراجة نارية']},
{q:'اذكر شيئًا تحبه الأطفال',p:20,list:[['ألعاب',false,20],['حلويات',false,20],['كرة',false,20],['آيس كريم',false,20],['رسوم متحركة',false,20],['فاتورة',true,-30]],extra:['هدايا','حديقة','دراجة']},
{q:'اذكر شيئًا تفعله عندما تشعر بالملل',p:20,list:[['تصفح الجوال',false,20],['مشاهدة التلفزيون',false,20],['النوم',false,20],['اللعب',false,20],['الخروج',false,20],['تنظيف النوافذ',true,-30]],extra:['قراءة','الأكل','التحدث مع صديق']},
{q:'اذكر شيئًا موجودًا في الثلاجة',p:20,list:[['ماء',false,20],['حليب',false,20],['خضار',false,20],['عصير',false,20],['جبن',false,20],['صابون',true,-30]],extra:['فاكهة','بيض','لبن']},
{q:'اذكر شيئًا تأخذه معك إلى المدرسة',p:20,list:[['حقيبة',false,20],['كتاب',false,20],['دفتر',false,20],['قلم',false,20],['مقلمة',false,20],['مقلاة',true,-30]],extra:['مسطرة','ماء','وجبة']},
{q:'اذكر شيئًا تراه في الحديقة',p:20,list:[['شجرة',false,20],['عشب',false,20],['زهور',false,20],['أرجوحة',false,20],['مقعد',false,20],['ثلاجة',true,-30]],extra:['أطفال','كرة','نافورة']},
{q:'اذكر شيئًا يشتريه الناس في المول',p:20,list:[['ملابس',false,20],['أحذية',false,20],['عطر',false,20],['هدايا',false,20],['إلكترونيات',false,20],['خضار',true,-30]],extra:['إكسسوارات','ألعاب','حقائب']},
{q:'اذكر شيئًا تأكله في الفطور',p:20,list:[['بيض',false,20],['خبز',false,20],['جبن',false,20],['فول',false,20],['تمر',false,20],['بيتزا',true,-30]],extra:['مربى','فطائر','حبوب']},
{q:'اذكر شيئًا تستخدمه للكتابة',p:20,list:[['قلم',false,20],['رصاص',false,20],['قلم حبر',false,20],['طبشور',false,20],['قلم تلوين',false,20],['ملعقة',true,-30]],extra:['دفتر','ورق','لوح']},
{q:'اذكر شيئًا موجودًا في الصالة',p:20,list:[['كنبة',false,20],['تلفزيون',false,20],['طاولة',false,20],['سجادة',false,20],['مصباح',false,20],['فرن',true,-30]],extra:['كرسي','ستارة','وسائد']}
];
const lastQs=[
  {q:'اذكر فاكهة',a:['تفاح','موز','برتقال','عنب','فراولة','بطيخ']},
  {q:'اذكر دولة عربية',a:['السعودية','مصر','الإمارات','الكويت','قطر','البحرين']},
  {q:'اذكر لاعب كرة قدم مشهور',a:['ميسي','رونالدو','نيمار','مبابي','صلاح','هالاند']},
  {q:'اذكر شيئًا في المطبخ',a:['ثلاجة','فرن','قدر','ملعقة','مقلاة','كوب']},
  {q:'اذكر وسيلة نقل',a:['سيارة','طائرة','قطار','حافلة','سفينة','دراجة']},
  {q:'اذكر مشروبًا',a:['ماء','قهوة','شاي','عصير','حليب','مشروب غازي']},
  {q:'اذكر حيوانًا',a:['أسد','نمر','فيل','حصان','قرد','كلب']},
  {q:'اذكر شيئًا في غرفة النوم',a:['سرير','وسادة','خزانة','مرآة','مصباح','بطانية']},
  {q:'اذكر رياضة',a:['كرة قدم','كرة سلة','تنس','سباحة','جري','ملاكمة']},
  {q:'اذكر شيئًا تأخذه للسفر',a:['جواز السفر','ملابس','شاحن','حذاء','حقيبة','عطر']},
  {q:'اذكر وظيفة',a:['طبيب','مهندس','معلم','طيار','محاسب','شرطي']},
  {q:'اذكر شيئًا في السيارة',a:['مقود','مقعد','مكيف','شاحن','راديو','مناديل']},
  {q:'اذكر مدينة سعودية',a:['الرياض','جدة','مكة','الدمام','أبها','المدينة']},
  {q:'اذكر لونًا',a:['أحمر','أزرق','أخضر','أصفر','أبيض','أسود']},
  {q:'اذكر تطبيقًا مشهورًا',a:['واتساب','يوتيوب','إنستغرام','سناب شات','تيك توك','تلغرام']},
  {q:'اذكر شيئًا في المدرسة',a:['كتاب','دفتر','قلم','حقيبة','سبورة','مقعد']},
  {q:'اذكر شيئًا يفعله الناس قبل النوم',a:['تنظيف الأسنان','تصفح الجوال','قراءة','شرب ماء','مشاهدة التلفزيون','إطفاء الأنوار']},
  {q:'اذكر شيئًا في البحر',a:['ماء','سمك','رمل','موج','مرجان','قارب']},
  {q:'اذكر أكلة سعودية',a:['كبسة','مندي','جريش','قرصان','مرقوق','مضغوط']},
  {q:'اذكر شيئًا في المكتب',a:['كمبيوتر','قلم','ورق','كرسي','طابعة','هاتف']},
  {q:'اذكر شيئًا تشتريه من المول',a:['ملابس','أحذية','عطر','هدايا','إلكترونيات','حقائب']},
  {q:'اذكر شيئًا في الحمام',a:['مرآة','منشفة','صابون','شامبو','فرشاة أسنان','معجون أسنان']},
  {q:'اذكر شيئًا في الحفلة',a:['كيكة','موسيقى','طعام','هدايا','تصوير','زينة']},
  {q:'اذكر شيئًا يجعل الناس سعداء',a:['العائلة','الأصدقاء','المال','النجاح','السفر','الهدايا']},
  {q:'اذكر شيئًا يراه الناس في السماء',a:['شمس','قمر','سحاب','طائرة','نجوم','طيور']},
  {q:'اذكر شيئًا في الثلاجة',a:['ماء','حليب','خضار','عصير','جبن','فاكهة']},
  {q:'اذكر شيئًا تستخدمه للكتابة',a:['قلم','قلم رصاص','قلم حبر','طبشور','قلم تلوين','لوح']},
  {q:'اذكر شيئًا في الصالة',a:['كنبة','تلفزيون','طاولة','سجادة','مصباح','ستارة']},
  {q:'اذكر شيئًا يفعله الناس في العيد',a:['زيارة العائلة','لبس الجديد','العيدية','الصلاة','الحلويات','التصوير']},
  {q:'اذكر شيئًا يشتريه الناس كهدية',a:['عطر','ساعة','ورد','شوكولاتة','ملابس','كتاب']}
];
const bankQs=[
['اذكر 3 عواصم عربية',['الرياض','القاهرة','أبوظبي','الكويت','الدوحة','مسقط']],['اذكر 3 فواكه',['تفاح','موز','برتقال','عنب','تفاح','مانجو']],['اذكر 3 أكلات سعودية',['كبسة','مندي','جريش','قرصان','مرقوق']],['اذكر 3 رياضات',['كرة قدم','تنس','سباحة','جري','ملاكمة']],['اذكر 3 أشياء في السيارة',['مقعد','مكيف','مقود','شاحن','راديو']],['اذكر 3 حيوانات',['أسد','فيل','حصان','نمر','دولفين']],['اذكر 3 وظائف',['طبيب','مهندس','معلم','طيار','محاسب']],['اذكر 3 مشروبات',['ماء','قهوة','شاي','عصير','حليب']],['اذكر 3 أشياء في المطبخ',['ثلاجة','فرن','قدر','ملعقة','مقلاة']],['اذكر 3 دول عربية',['السعودية','مصر','الإمارات','الكويت','قطر']],['اذكر 3 مدن سعودية',['الرياض','جدة','مكة','الدمام','أبها']],['اذكر 3 لاعبين كرة قدم',['ميسي','رونالدو','صلاح','مبابي','نيمار']],['اذكر 3 أشياء في المكتب',['كمبيوتر','قلم','ورق','طابعة','كرسي']],['اذكر 3 أشياء في البحر',['ماء','سمك','رمل','موج','مرجان']],['اذكر 3 أشياء للمدرسة',['كتاب','دفتر','قلم','حقيبة','مسطرة']],['اذكر 3 أشياء للشتاء',['معطف','بطانية','مدفأة','شال','قفازات']],['اذكر 3 حلويات',['كنافة','دونات','كيك','آيس كريم','قطايف']],['اذكر 3 وسائل نقل',['سيارة','طائرة','قطار','حافلة','سفينة']],['اذكر 3 أشياء في الحمام',['صابون','منشفة','مرآة','شامبو','فرشاة']],['اذكر 3 أشياء في السفر',['جواز','شنطة','شاحن','ملابس','حذاء']],['اذكر 3 ألوان',['أحمر','أزرق','أخضر','أصفر','بنفسجي']],['اذكر 3 أشياء غالية',['ذهب','ألماس','ساعة','سيارة','يخت']],['اذكر 3 أفلام أو شخصيات',['باتمان','سبايدرمان','شريك','إلسا','هاري بوتر']],['اذكر 3 تطبيقات',['واتساب','يوتيوب','انستقرام','سناب','تيك توك']],['اذكر 3 أشياء في المطار',['جواز','طائرة','بوابة','حقيبة','تذكرة']],['اذكر 3 أشياء في الحفلة',['كيكة','موسيقى','طعام','هدايا','تصوير']],['اذكر 3 أشياء تفعلها قبل النوم',['تصفح الجوال','تنظيف الأسنان','قراءة','شرب ماء','إطفاء الأنوار']],['اذكر 3 أشياء تشتريها من المول',['ملابس','أحذية','عطر','هدايا','إلكترونيات']],['اذكر 3 أشياء في غرفة النوم',['سرير','وسادة','خزانة','مرآة','مصباح']],['اذكر 3 أشياء تجعل الناس سعداء',['العائلة','الأصدقاء','المال','النجاح','السفر']]
];
function mafiaRoom(){return {type:'mafia',code:makeCode('mafia'),mode:'players',players:[],hostId:null,phase:'lobby',config:{maxPlayers:8,mafiaCount:2,detectiveCount:1,doctorCount:1,jesterCount:0,revealRole:true,tieMode:'none',nightSec:30,discussionSec:90,voteSec:30},rolesAssigned:false,nightActions:{},votes:{},investigationResults:{},lastNightResult:null,winnerText:null,round:0,phaseUntil:0,chat:[]}}
function miniRoom(game,mode,maxRounds){const g={type:game,code:makeCode(game,mode),mode:(game==='bomb'?'3':(['1','2','3'].includes(String(mode))?String(mode):'1')),players:[],hostId:null,phase:'lobby',scores:{},round:0,maxRounds:Math.max(1,Math.min(30,Number(maxRounds)||10)),question:'',answers:[],current:null,used:[],history:[],turnIndex:0,turnOrder:[],turnPlayer:null,answerUntil:0,selectedRisk:{},balances:{},secured:{}};if(game==='bomb')g.teams=[{id:'A',name:'الفريق الأحمر',score:0,players:[]},{id:'B',name:'الفريق الأزرق',score:0,players:[]}];return g}
function bombBuildTurnOrder(g){
  const a=(g.teams?.find(t=>t.id==='A')?.players||[]).filter(p=>p.online!==false);
  const b=(g.teams?.find(t=>t.id==='B')?.players||[]).filter(p=>p.online!==false);
  const order=[];
  const max=Math.max(a.length,b.length);
  for(let i=0;i<max;i++){
    if(a[i])order.push({id:a[i].id,name:a[i].name,team:'A'});
    if(b[i])order.push({id:b[i].id,name:b[i].name,team:'B'});
  }
  return order;
}
function bombSetTurnCountdown(g,nextTeam){
  const teams=['A','B'];
  g.teamPlayerCursor=g.teamPlayerCursor||{A:0,B:0};
  let desired=nextTeam||g.nextTeam||'A';
  let selected=null;
  for(let attempt=0;attempt<2;attempt++){
    const teamId=teams.includes(desired)?desired:'A';
    const list=(g.teams?.find(t=>t.id===teamId)?.players||[]).filter(p=>p.online!==false);
    if(list.length){
      const idx=(g.teamPlayerCursor[teamId]||0)%list.length;
      const p=list[idx];
      g.teamPlayerCursor[teamId]=(idx+1)%list.length;
      selected={id:p.id,name:p.name,team:teamId};
      break;
    }
    desired=teamId==='A'?'B':'A';
  }
  if(!selected){g.phase='lobby';g.current=null;broadcastBomb(g);return false}
  g.current=selected;
  g.turnTeam=selected.team;
  g.nextTeam=selected.team==='A'?'B':'A';
  g.turnOrder=bombBuildTurnOrder(g);
  g.turnIndex=g.turnOrder.findIndex(x=>x.id===selected.id);
  if(g.turnIndex<0)g.turnIndex=0;
  g.answerSeconds=10;
  g.answerUntil=Date.now()+g.answerSeconds*1000;
  g.phase='answer';
  g.submitted=null;
  g.lastSubmission=null;
  g.result=null;
  broadcastBomb(g);
  const round=g.round,playerId=g.current.id,until=g.answerUntil;
  setTimeout(()=>{
    if(g.phase==='answer'&&g.round===round&&g.current?.id===playerId&&g.answerUntil===until&&Date.now()>=until){
      const timeoutPenalty=-10;
      const timeoutTeam=g.teams.find(t=>t.id===g.current.team);
      if(timeoutTeam)timeoutTeam.score=(timeoutTeam.score||0)+timeoutPenalty;
      g.scores=g.scores||{};g.scores[g.current.id]=(g.scores[g.current.id]||0)+timeoutPenalty;
      g.result={kind:'timeout',delta:timeoutPenalty,answer:'',matched:null,team:g.current.team,player:g.current.name,timeout:true};
      g.history.push({round:g.round,player:g.current.name,team:g.current.team,question:g.question,answer:'',kind:'timeout',matched:null,delta:timeoutPenalty,auto:true});
      g.phase='result';g.answerUntil=0;broadcastBomb(g);
      setTimeout(()=>{if(g.phase==='result'&&g.result?.kind==='timeout'&&g.round===round){bombAdvanceTeam(g)}},700);
    }
  },g.answerSeconds*1000+120);
  return true;
}
function scheduleBombQuestion(g){
  const round=g.round, until=g.questionUntil;
  setTimeout(()=>{
    if(g.phase==='question'&&g.round===round&&until<=Date.now()) bombSetTurnCountdown(g,0);
  },3100);
}
function bombAdvanceTeam(g){
  if((g.answers||[]).length&&g.answers.every(a=>a.awarded)){
    if(g.round<g.maxRounds){
      g.round++;
      bombLoadQuestion(g);
      broadcastBomb(g);
      scheduleBombQuestion(g);
    }else{g.phase='finished';g.finishedAt=Date.now();broadcastBomb(g)}
    return;
  }
  bombSetTurnCountdown(g,g.nextTeam||'A');
}
function bombLoadQuestion(g){
  let pool=bombQs.filter((_,i)=>!g.used.includes(i));
  if(!pool.length){g.used=[];pool=bombQs}
  const q=pool[Math.floor(Math.random()*pool.length)];
  g.used.push(bombQs.indexOf(q));
  const source=(q.list||[]).slice(0,6);
  g.question=q.q;
  g.answers=source.map(x=>({text:x[0],trap:false,points:Number(x[2])||q.p,revealed:false,awarded:false}));
  const trapTarget=Math.min(g.answers.length,2+Math.floor(Math.max(0,g.round-1)/3));
  const shuffled=g.answers.slice().sort(()=>Math.random()-.5);
  const allIndexes=shuffled.map((_,i)=>i).sort(()=>Math.random()-.5),trapIndexes=[];
  if(trapTarget>=2){const later=allIndexes.filter(i=>i>=2);if(later.length)trapIndexes.push(later[0]);const rest=allIndexes.filter(i=>!trapIndexes.includes(i));trapIndexes.push(...rest.slice(0,trapTarget-trapIndexes.length));}else trapIndexes.push(allIndexes[0]);
  trapIndexes.forEach(i=>{const a=shuffled[i];a.trap=true;a.points=-[30,40,50,60][Math.min(trapTarget-1,3)]});
  g.answers=shuffled;
  g.extra=q.extra||[];g.points=q.p;g.result=null;g.submitted=null;g.revealIndex=-1;
  g.current=null;g.answerUntil=0;g.questionUntil=Date.now()+3000;g.phase='question';
}
function bombTeamsReady(g){
  return (g.teams||[]).every(t=>(t.players||[]).some(p=>p.online!==false));
}
function bombStartRound(g){
  if(g.type!=='bomb'||g.phase!=='lobby')return false;
  if(!bombTeamsReady(g))return false;
  const onlineTeams=(g.teams||[]).filter(t=>(t.players||[]).some(p=>p.online!==false));
  if(onlineTeams.length<2)return false;
  if(g.round>=g.maxRounds){g.phase='finished';g.finishedAt=Date.now();broadcastBomb(g);return true}
  g.round++;
  g.turnIndex=0;
  g.teamPlayerCursor={A:0,B:0};
  g.nextTeam='A';
  g.turnTeam=null;
  bombLoadQuestion(g);
  broadcastBomb(g);
  scheduleBombQuestion(g);
  return true;
}
function scheduleLastTurn(g){const id=g.turnPlayer;if(!id||g.phase!=='turn')return;g.answerUntil=Date.now()+10000;broadcast(g);setTimeout(()=>{if(g.phase==='turn'&&g.turnPlayer===id){const p=g.players.find(x=>x.id===id);if(p){g.roundAnswers[id]={id,name:p.name,answer:'',valid:false,timeout:true};g.scores[id]=(g.scores[id]||0)-1;g.history.push({round:g.round,player:p.name,answer:'',valid:false,timeout:true,delta:-1})}g.turnIndex++;g.turnPlayer=g.turnOrder[g.turnIndex]||null;if(!g.turnPlayer)g.phase='lastResult';else scheduleLastTurn(g);broadcast(g)}},10100)}
io.on('connection',s=>{
 s.on('room:inspect',({code}={})=>{const g=games.get(clean(code));if(g?.type==='bank')return s.emit('errorMsg','هذه اللعبة لم تعد متاحة');if(!g)return s.emit('errorMsg','رمز الغرفة غير صحيح');s.emit('room:info',{code:g.code,game:g.type,mode:g.mode||null,players:g.players.length,online:g.players.filter(p=>p.online!==false).length,maxRounds:g.maxRounds||null})});
 s.on('room:create',({game,mode,name,team,category,rounds,maxRounds,sessionToken:token}={})=>{let g;if(game==='family')g=ffRoom(mode||'1',rounds);else if(game==='mafia')g=mafiaRoom();else if(game==='guess'){g=guessRoom();g.maxRounds=Math.max(1,Math.min(30,Number(maxRounds)||5))}else if(game==='market')g=marketRoom(mode||'presenter',maxRounds);else if(game==='million')g=millionRoom(mode||'players');else g=miniRoom(game,mode,maxRounds);games.set(g.code,g);
  if(g.type==='bomb'){
    const p=addPlayer(g,s,name,team);g.hostId=p.id;s.emit('room:created',{code:g.code,role:'player',playerId:p.id,team:p.team,sessionToken:p.sessionToken});broadcast(g);return
  }
  if((game==='market'||game==='million'||game==='last'||game==='bank')&&mode==='presenter'){s.join(g.code);s.data={game:g.code,role:'presenter'};s.emit('room:created',{code:g.code,role:'presenter',mode});broadcast(g);return}
  if(g.type==='family' && ['1','2'].includes(g.mode) && (mode==='presenter'||mode==='verbal'||mode==='written'||mode==='1'||mode==='2')){s.join(g.code);s.data={game:g.code,role:'presenter'};s.emit('room:created',{code:g.code,role:'presenter',mode:g.mode});broadcast(g);return}
  const p=addPlayer(g,s,name,team);if(g.type==='mafia'){g.hostId=p.id;s.emit('room:created',{code:g.code,role:'player',playerId:p.id,team:p.team,sessionToken:p.sessionToken});broadcastMafia(g);return}if(g.type==='guess'){if(!g.hostId)g.hostId=p.id;if(category&&p.id===g.hostId)g.category=category} s.emit('room:created',{code:g.code,role:'player',playerId:p.id,team:p.team,sessionToken:p.sessionToken});broadcast(g)});
 s.on('room:join',({code,name,team,sessionToken:token}={})=>{const g=games.get(clean(code));if(g?.type==='bank')return s.emit('errorMsg','هذه اللعبة لم تعد متاحة');if(!g)return s.emit('errorMsg','رمز الغرفة غير صحيح أو انتهت الجلسة');if(g.type==='family'&&g.mode!=='3'&&g.players.filter(p=>p.online!==false).length>=20&&!token)return s.emit('errorMsg','الغرفة ممتلئة');if(g.type==='bomb'&&g.players.filter(p=>p.online!==false).length>=40&&!token)return s.emit('errorMsg','الغرفة ممتلئة');if(g.type==='mafia'&&g.phase!=='lobby'&&!token)return s.emit('errorMsg','اللعبة بدأت بالفعل');const p=addPlayer(g,s,name,team,token);s.join(g.code);s.data.game=g.code;s.data.role='player';s.data.pid=p.id;s.data.team=p.team;s.data.sessionToken=p.sessionToken;s.emit('joined',{code:g.code,playerId:p.id,team:p.team,sessionToken:p.sessionToken,reconnected:!!token});if(g.type==='bomb'){emitBombState(g,s.id);broadcastBomb(g)}else if(g.type==='mafia'){broadcastMafia(g)}else{broadcast(g)}persistGames()});
 s.on('room:sync',({code}={})=>{const g=games.get(clean(code));if(!g)return s.emit('errorMsg','الغرفة غير موجودة أو انتهت الجلسة');if(s.data?.game!==g.code){s.join(g.code);s.data.game=g.code}if(g.type==='bomb')emitBombState(g,s.id);else if(g.type==='mafia')s.emit('state',mafiaPublic(g,s.id));else emit('state',pub(g))});
 s.on('room:resume',({code,sessionToken:token,name,team}={})=>{const g=games.get(clean(code));if(!g)return s.emit('resumeFailed',{code:clean(code),message:'الغرفة غير موجودة',expired:true});if(g.phase==='finished')return s.emit('resumeFailed',{code:g.code,message:'انتهت اللعبة ولا يمكن إعادة الاتصال بها',finished:true});let p=String(token||'')?g.players.find(x=>x.sessionToken===String(token)):null;if(!p&&g.type==='bomb'&&name){p=g.players.find(x=>x.name===String(name).trim()&&x.team===(team==='B'?'B':'A')&&x.online===false&&x.sessionToken&&!String(x.sessionToken).startsWith('REVOKED-'));}if(!p)return s.emit('resumeFailed',{code:g.code,message:'تعذر استعادة الجلسة'});restorePlayerIdentity(g,p,s);s.emit('joined',{code:g.code,playerId:p.id,team:p.team,sessionToken:p.sessionToken,reconnected:true});if(g.type==='bomb'){emitBombState(g,s.id);broadcastBomb(g)}else if(g.type==='mafia'){broadcastMafia(g)}else broadcast(g);persistGames()});
 s.on('room:display',({code}={})=>{const g=games.get(clean(code));if(!g)return s.emit('errorMsg','رمز الغرفة غير صحيح');if((g.type==='family'&&g.mode==='3')||(g.type==='bomb'&&g.mode==='3')||(g.type==='market'&&g.mode!=='presenter'))return s.emit('errorMsg','هذا الكود لا يحتوي على شاشة عرض');s.join(g.code);s.data={game:g.code,role:'display'};s.emit('display:ok',{code:g.code});broadcast(g)});
 s.on('room:presenter',({code}={})=>{const g=games.get(clean(code));if(!g)return s.emit('errorMsg','رمز الغرفة غير صحيح');if(g.type==='family' ? !['1','2'].includes(g.mode) : g.type==='bomb' ? g.mode!=='1' : g.mode!=='presenter')return s.emit('errorMsg','هذا الكود لا يحتوي على شاشة مقدم.');s.join(g.code);s.data={game:g.code,role:'presenter'};s.emit('room:created',{code:g.code,role:'presenter',mode:g.mode});broadcast(g)});
 s.on('ff:start',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='family')return;const canStart=ffHost(s,g)||(g.mode==='3'&&s.data?.role==='player');if(!canStart)return;if(g.phase==='lobby'||g.phase==='question'&&g.currentRound<g.rounds)startFF(g)});
 s.on('ff:buzz',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||g.mode!=='1'||s.data.role!=='player'||g.phase!=='question'||g.lock||g.answerLock)return;const p=g.players.find(p=>p.id===s.id);if(!p)return;const t=g.teams.find(t=>t.id===p.team);if(!t||t.strikes>=3)return;g.lock={id:s.data.pid,name:p.name,team:p.team,until:Date.now()+3000};io.to(g.code).emit('ff:buzzed',{name:p.name,team:p.team});broadcast(g);setTimeout(()=>{if(g.lock?.id===s.data.pid){g.lock=null;broadcast(g)}},3000)});
 s.on('ff:answerReady',({double=false}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||g.phase!=='question'||g.answerLock)return;if(g.mode==='1'&&!double)return;if(!['1','2','3'].includes(g.mode))return;const t=g.teams.find(x=>x.id===s.data.team);const p=g.players.find(x=>x.id===s.data?.pid);if(!t||!p||t.strikes>=3||double&&t.doubleUsed)return;if(double)t.doubleUsed=true;g.lock=null;const until=Date.now()+10000;g.answerLock={id:s.data.pid,name:p.name,team:s.data.team,until,double};t.doubleActive=double;t.doublePlayer=p.name;if(double)io.to(g.code).emit('ff:double',{name:p.name,team:p.team});broadcast(g);setTimeout(()=>{if(g.answerLock?.id===s.data?.pid&&g.answerLock.until<=Date.now()){t.strikes=Math.min(3,t.strikes+1);g.answerLock=null;t.doubleActive=false;t.doublePlayer='';io.to(g.code).emit('ff:wrong',{team:t.id,strikes:t.strikes,timeout:true});broadcast(g)}},10100)});
 s.on('ff:judge',({correct=false}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||g.mode!=='presenter'||s.data?.role!=='presenter')return;const active=g.lock||g.answerLock;if(!active)return;const t=g.teams.find(x=>x.id===active.team);if(!correct&&t){t.strikes=Math.min(3,t.strikes+1);io.to(g.code).emit('ff:wrong',{team:t.id,strikes:t.strikes});}g.lock=null;g.answerLock=null;if(t){t.doubleActive=false;t.doublePlayer='';}broadcast(g)});

 s.on('ff:submit',({answer}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||g.mode==='1'||!g.answerLock||g.answerLock.id!==s.data?.pid)return;const t=g.teams.find(x=>x.id===s.data.team);if(Date.now()>g.answerLock.until){g.answerLock=null;t.doubleActive=false;return broadcast(g)}const idx=g.answers.findIndex(a=>!a.awarded&&smart(answer,a.text));if(idx<0){t.strikes=Math.min(3,t.strikes+1);g.answerLock=null;t.doubleActive=false;io.to(g.code).emit('ff:wrong',{team:t.id,strikes:t.strikes});return broadcast(g)}const a=g.answers[idx];const smartCorrect=norm(answer)!==norm(a.text);a.revealed=true;a.awarded=true;const pts=a.points*(g.answerLock.double?2:1);a.awardedPoints=pts;t.score+=pts;g.answerLock=null;t.doubleActive=false;io.to(g.code).emit('ff:correct',{team:t.id,index:idx,points:pts,smart:smartCorrect,submitted:String(answer||'').trim(),expected:a.text});broadcast(g)});
 s.on('ff:reveal',({index}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||!g.answers[index])return;const allowed=ffHost(s,g)||(g.mode==='3'&&s.data?.role==='player');if(!allowed)return;g.answers[index].revealed=true;io.to(g.code).emit('ff:revealFX',{index,text:g.answers[index].text,points:g.answers[index].points});broadcast(g)});
 s.on('ff:revealAll',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||g.mode!=='3'||s.data?.role!=='player')return;(g.answers||[]).forEach(a=>{a.revealed=true});broadcast(g)});
 s.on('ff:award',({index,team}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||!ffHost(s,g))return;const a=g.answers[index],t=g.teams.find(x=>x.id===team);if(!a||!t||a.awarded)return;a.revealed=true;a.awarded=true;a.awardedPoints=a.points*(t.doubleActive?2:1);t.score+=a.awardedPoints;io.to(g.code).emit('ff:points',{team:t.id,delta:a.awardedPoints});t.doubleActive=false;g.lock=null;broadcast(g)});
 s.on('ff:strike',({team}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||!ffHost(s,g))return;const t=g.teams.find(x=>x.id===team);if(t)t.strikes=Math.min(3,t.strikes+1);g.lock=null;g.answerLock=null;g.teams.forEach(x=>{x.doubleActive=false;x.doublePlayer=''});broadcast(g)});
 s.on('ff:resetStrikes',({team}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||s.data?.role!=='presenter')return;const t=g.teams.find(x=>x.id===team);if(!t)return;t.strikes=0;t.doubleActive=false;t.doublePlayer='';g.lock=null;g.answerLock=null;broadcast(g)});
 s.on('ff:next',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||!ffHost(s,g)||g.currentRound>=g.rounds)return;startFF(g)});
 s.on('ff:nextPlayer',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='family'||g.mode!=='3'||s.data?.role!=='player'||g.currentRound>=g.rounds||!g.teams.some(t=>t.strikes>=3))return;startFF(g)});
 s.on('ff:change',({newRound=false}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='family')return;const allowed=ffHost(s,g)||(g.mode==='3'&&s.data?.role==='player');if(!allowed)return;if(newRound&&g.currentRound>=g.rounds)return;startFF(g,!!newRound)});
 s.on('ff:setMode',()=>{});
 s.on('guess:category',({category}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='guess'||g.phase!=='lobby'||s.data?.pid!==g.hostId)return;if(!Object.prototype.hasOwnProperty.call(CATS,category))return;if((g.usedCategories||[]).includes(category))return;g.category=category;broadcast(g)});
 s.on('guess:setRounds',({rounds}={})=>{const g=games.get(s.data?.game);if(g?.type==='guess'&&g.phase==='lobby'&&!g.roundsLocked&&s.data?.pid===g.hostId){g.maxRounds=Math.max(1,Math.min(30,Number(rounds)||5));broadcast(g)}});
 s.on('guess:start',()=>{const g=games.get(s.data?.game);if(g?.type!=='guess'||g.players.length<2||s.data?.pid!==g.hostId||g.phase!=='lobby'||!g.category)return;if(g.round>0&&(g.usedCategories||[]).includes(g.category))return;g.roundsLocked=true;g.usedCategories=g.usedCategories||[];g.usedCategories.push(g.category);g.phase='round';g.round++;const arr=guessPool(g.category,g.round);const used=g.usedWords[g.category]||[];g.usedWords[g.category]=used;g.roundWinners=[];g.revealedBy={};g.players.forEach(p=>{g.guessed[p.id]=false;let word=pickUnused(arr,used);used.push(word);g.secret[p.id]=word});broadcast(g)});
 s.on('guess:reveal',({targetId}={})=>{const g=games.get(s.data?.game);const viewer=s.data?.pid;if(g?.type!=='guess'||g.phase!=='round'||!viewer||!g.players.some(p=>p.id===targetId)||targetId===viewer)return;g.revealedBy[viewer] ||= {};if(g.revealedBy[viewer][targetId]){delete g.revealedBy[viewer][targetId];s.emit('guess:hidden',{targetId});}else{g.revealedBy[viewer][targetId]=g.secret[targetId];s.emit('guess:revealed',{targetId,word:g.secret[targetId]});}broadcastGuess(g)});
 s.on('guess:guess',({answer}={})=>{const g=games.get(s.data?.game);if(g?.type!=='guess'||g.phase!=='round')return;const p=g.players.find(x=>x.id===s.data?.pid);if(!p||g.guessed[p.id])return;const ok=smart(answer,g.secret[p.id]);if(!ok)return io.to(g.code).emit('guess:wrong',{answer,player:p.name,playerId:p.id});const done=g.roundWinners.length;const pts=done===0?3:done===1?2:done===2?1:0;g.scores[p.id]=(g.scores[p.id]||0)+pts;g.guessed[p.id]=true;g.roundWinners.push(p.id);g.history.push({round:g.round,player:p.name,answer:String(answer||''),target:g.secret[p.id],correct:true,points:pts});io.to(g.code).emit('guess:correct',{points:pts,player:p.name,playerId:p.id,total:g.scores[p.id]});if(g.roundWinners.length>=g.players.length){g.phase=g.round>=g.maxRounds?'finished':'results'}broadcastGuess(g)});
 s.on('guess:next',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='guess'||s.data?.pid!==g.hostId||g.phase!=='results'||g.round>=g.maxRounds)return;g.phase='lobby';g.category=null;g.revealedBy={};g.roundWinners=[];g.guessed={};broadcast(g)});
 s.on('market:setRounds',({rounds}={})=>{const g=games.get(s.data?.game);if(g?.type==='market'&&g.phase==='lobby')g.maxRounds=Math.max(1,Math.min(30,Number(rounds)||10));broadcast(g)});
 s.on('market:start',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='market'||(g.mode==='presenter'&&s.data?.role!=='presenter')||(g.mode==='players'&&s.data?.role!=='player'))return;if((g.phase==='lobby'||g.phase==='results')&&g.players.length>= (g.mode==='players'?2:1))marketStart(g)});
 s.on('market:buzz',({double=false}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='market'||g.phase!=='buzz'||g.current||s.data?.role!=='player')return;if(g.buzzUntil&&Date.now()>g.buzzUntil)return;const p=g.players.find(x=>x.id===s.data?.pid);if(!p||p.online===false)return;if(double&&g.doubleUsed[p.id])return;if(double)g.doubleUsed[p.id]=true;g.doubleActive=!!double;g.current={id:p.id,name:p.name,double:!!double};g.votes={};g.buzzUntil=0;g.answerUntil=Date.now()+5000;g.phase='answer';if(double)io.to(g.code).emit('market:double',{name:p.name,playerId:p.id});broadcast(g);setTimeout(()=>{if(g.phase==='answer'&&g.current?.id===p.id&&g.answerUntil<=Date.now()){g.phase='vote';g.answerUntil=0;broadcast(g)}},5100)});
 s.on('market:answer',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='market'||g.phase!=='answer'||!g.current||g.current.id!==s.data?.pid)return;g.phase='vote';g.answerUntil=0;broadcast(g)});
 s.on('market:judge',()=>{});
 s.on('market:vote',({vote}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='market'||g.phase!=='vote'||!g.current||g.current.id===s.data?.pid||!['yes','no'].includes(vote)||g.votes[s.data.pid])return;g.votes[s.data.pid]=vote;broadcast(g);const eligible=g.players.filter(p=>p.id!==g.current.id&&p.online!==false);if(Object.keys(g.votes).length>=eligible.length){const yes=Object.values(g.votes).filter(v=>v==='yes').length;const no=Object.values(g.votes).filter(v=>v==='no').length;const good=yes>no;const tie=yes===no;const mult=g.current.double?2:1;const delta=tie?0:(good?g.points*mult:-g.points*mult);g.scores[g.current.id]=(g.scores[g.current.id]||0)+delta;g.history.push({round:g.round,player:g.current.name,question:g.question,points:g.points,double:!!g.current.double,votes:{yes,no},result:tie?'تعادل':(good?'صحيح':'غير صحيح'),delta});g.phase='results';g.answerUntil=0;g.current=null;g.doubleActive=false;broadcast(g)}});
 s.on('market:next',()=>{const g=games.get(s.data?.game);if(g?.type==='market'&&((g.mode==='presenter'&&s.data?.role==='presenter')||(g.mode==='players'&&s.data?.role==='player')))marketStart(g)});
 s.on('million:start',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='million'||(g.mode==='presenter'&&s.data?.role!=='presenter')||!g.players.length)return;g.started=true;g.phase='play';g.players.forEach(p=>millionInitPlayer(g,p));g.turnOrder=g.players.map(p=>p.id);g.turnIndex=-1;g.history=[];millionAdvance(g);broadcast(g)});
 s.on('million:answer',({index}={})=>{const g=games.get(s.data?.game);if(!g||g.type!=='million'||g.phase!=='play'||g.turnPlayer!==s.id)return;const st=g.playersState[s.id];if(!st||!st.active||!Number.isInteger(index)||index<0||index>3)return;const q=st.question;const correct=index===q.a;let amountBefore=st.bank,delta,securedUsed=false;if(correct){st.bank=g.ladder[st.level];if(g.guaranteed.includes(st.bank))st.guaranteed=st.bank;if(st.level<g.ladder.length-1){st.level++;st.question=millionPick(g,st,st.level);st.options=st.question.o.slice();}else{st.bank=1000000;st.active=false;io.to(g.code).emit('million:win',{name:g.players.find(p=>p.id===s.id)?.name})}}else{const fallback=st.secured!=null?st.secured:(st.guaranteed||0);securedUsed=st.secured!=null;st.bank=fallback;st.active=false;io.to(g.code).emit('million:wrong',{name:g.players.find(p=>p.id===s.id)?.name,bank:st.bank})}g.history.push({player:s.id,name:g.players.find(p=>p.id===s.id)?.name,question:q.q,options:q.o,chosen:index,chosenText:q.o[index],correct,amountBefore,amountAfter:st.bank,level:q.level});millionAdvance(g);broadcast(g)});
 s.on('million:walk',()=>{const g=games.get(s.data?.game);const st=g?.playersState[s.id];if(!g||g.type!=='million'||g.phase!=='play'||g.turnPlayer!==s.id||!st?.active)return;st.active=false;g.history.push({player:s.id,name:g.players.find(p=>p.id===s.id)?.name,question:st.question.q,chosen:null,correct:null,walk:true,amountAfter:st.bank,level:st.level});millionAdvance(g);broadcast(g)});
 s.on('million:secure',()=>{const g=games.get(s.data?.game);const st=g?.playersState[s.id];if(!g||g.type!=='million'||g.phase!=='play'||g.turnPlayer!==s.id||!st?.active||!st.lifelines.secure)return;st.lifelines.secure=false;st.secured=st.bank;broadcast(g)});
 s.on('million:lifeline',({type}={})=>{const g=games.get(s.data?.game);const st=g?.playersState[s.id];if(!g||g.type!=='million'||g.phase!=='play'||g.turnPlayer!==s.id||!st?.active||!st.lifelines[type])return;st.lifelines[type]=false;const q=st.question;if(type==='fifty'){const wrong=[0,1,2,3].filter(i=>i!==q.a).sort(()=>Math.random()-.5).slice(0,1);st.options=[q.a,...wrong].map(i=>q.o[i])}else if(type==='change'){st.question=millionPick(g,st,st.level);st.used.push(st.question.q);st.options=st.question.o.slice()}else if(type==='audience'){const right=55+Math.floor(Math.random()*21);let rem=100-right;let arr=[0,0,0,0];arr[q.a]=right;const others=[0,1,2,3].filter(i=>i!==q.a);others.forEach((i,n)=>arr[i]=n===others.length-1?rem:Math.floor(Math.random()*(rem+1)));io.to(s.id).emit('million:audience',{percent:arr})}broadcast(g)});
function finishBombTimeout(g){return false}
function scheduleBombTurn(g){}

 s.on('bomb:changeQuestion',()=>{
   const g=games.get(s.data?.game);
   if(!g||g.type!=='bomb'||s.data?.role!=='player')return;
   if(g.phase==='finished'||g.phase==='lobby')return;
   g.teamPlayerCursor=g.teamPlayerCursor||{A:0,B:0};
   bombLoadQuestion(g);broadcastBomb(g);scheduleBombQuestion(g);
 });
 s.on('bomb:start',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='bomb'||g.phase!=='lobby'||s.data?.role!=='player')return;if(!bombTeamsReady(g))return;bombStartRound(g);});
 s.on('bomb:buzz',()=>{});
 s.on('bomb:submit',({answer,sessionToken:submittedToken,playerId}={},ack)=>{
   const done=(x)=>{try{ack?.(x)}catch(e){}};
   const g=games.get(s.data?.game);
   if(!g||g.type!=='bomb')return done({ok:false,reason:'not-answering'});
   if(g.phase!=='answer'||!g.current)return done({ok:false,reason:'not-answering'});
   let linked=g.players.find(p=>p.sessionToken===String(submittedToken||''));
   if(!linked&&playerId)linked=g.players.find(p=>p.id===String(playerId));
   if(!linked&&s.data?.pid)linked=g.players.find(p=>p.id===s.data.pid);
   if(!linked||linked.id!==g.current.id)return done({ok:false,reason:'not-your-turn'});
   const submitted=String(answer||'').trim();
   if(!submitted)return done({ok:false,reason:'empty'});
   g.submitted=submitted;

   // النمط الأول: إجابة شفهية، والمقدم هو الحكم.
   if(String(g.mode)==='1'){
     g.lastSubmission={playerId:linked.id,sessionToken:linked.sessionToken,answer:submitted};
     g.phase='judge';
     g.answerUntil=0;
     broadcastBomb(g);
     return done({ok:true,kind:'pending'});
   }

   // النمطان 2 و3: تصحيح كتابي تلقائي.
   const p=linked, t=g.teams.find(x=>x.id===p.team);
   if(!t)return done({ok:false,reason:'team-not-found'});
   let kind='wrong',delta=-10,matched=null,revealIndex=-1,fuzzy=false;
   const available=(g.answers||[]).map((a,i)=>({a,i})).filter(x=>!x.a.awarded);
   const listed=available.find(x=>bombSmartMatch(submitted,x.a.text).ok);
   if(listed){
     const m=bombSmartMatch(submitted,listed.a.text);
     kind=listed.a.trap?'trap':'listed';
     delta=Number(listed.a.points)||0;
     matched=listed.a.text;revealIndex=listed.i;fuzzy=m.fuzzy;
     listed.a.awarded=true;
   }else{
     const extra=(g.extra||[]).find(x=>bombSmartMatch(submitted,x).ok);
     if(extra){
       const m=bombSmartMatch(submitted,extra);
       kind='outside';delta=Math.max(1,Math.floor((g.points||10)/2));matched=extra;fuzzy=m.fuzzy;
     }
   }
   t.score=(t.score||0)+delta;
   g.scores=g.scores||{};g.scores[p.id]=(g.scores[p.id]||0)+delta;
   g.result={kind,delta,answer:submitted,matched,team:t.id,player:p.name,fuzzy,auto:true};
   g.history.push({round:g.round,player:p.name,team:t.id,question:g.question,answer:submitted,kind,matched,delta,auto:true});
   g.revealIndex=revealIndex;
   g.revealUntil=Date.now()+3150;
   g.phase='reveal';
   g.answerUntil=0;
   broadcastBomb(g);
   done({ok:true,kind,delta,matched,auto:true});
   setTimeout(()=>{
     if(g.phase==='reveal'&&g.result?.player===p.name&&g.result?.answer===submitted){
       if(g.revealIndex>=0&&g.answers[g.revealIndex])g.answers[g.revealIndex].revealed=true;
       g.phase='result';g.current=null;g.answerUntil=0;broadcastBomb(g);
       setTimeout(()=>{
         if(g.phase==='result'&&g.result?.player===p.name&&g.result?.answer===submitted){
           if(g.round<g.maxRounds)bombAdvanceTeam(g);
           else{g.phase='finished';g.finishedAt=Date.now();broadcastBomb(g)}
         }
       },1800);
     }
   },3200);
 });
 s.on('bomb:judge',({index,outside=false,answer}={})=>{
   const g=games.get(s.data?.game);
   if(!g||g.type!=='bomb'||g.mode!=='1'||s.data?.role!=='presenter'||g.phase!=='judge'||!g.current)return;
   const p=g.players.find(x=>x.id===g.current.id),t=g.teams.find(x=>x.id===g.current.team);
   if(!p||!t)return;
   if(String(answer||'').trim())g.submitted=String(answer).trim();
   let kind='wrong',delta=-10,matched=null,revealIndex=-1;
   if(outside){
     kind='outside';delta=Math.max(1,Math.floor((g.points||10)/2));
     matched=String(answer||g.submitted||'إجابة صحيحة خارج اللائحة').trim();
   }else if(Number.isInteger(index)&&g.answers[index]){
     const a=g.answers[index];
     if(a.awarded)return;
     a.awarded=true;kind=a.trap?'trap':'listed';delta=a.points;matched=a.text;revealIndex=index;
   }else{
     // إجابة خاطئة: خصم نقاط فقط، بلا نظام استرايكات.
   }
   t.score=(t.score||0)+delta;
   g.scores=g.scores||{};g.scores[p.id]=(g.scores[p.id]||0)+delta;
   g.result={kind,delta,answer:g.submitted||'',matched,team:t.id,player:p.name};
   g.history.push({round:g.round,player:p.name,team:t.id,question:g.question,answer:g.submitted||'',kind,matched,delta});
   g.revealIndex=revealIndex;
   g.revealUntil=Date.now()+3150;
   g.phase='reveal';
   broadcastBomb(g);
   setTimeout(()=>{
     if(g.phase==='reveal'&&g.result?.player===p.name){
       if(g.revealIndex>=0&&g.answers[g.revealIndex])g.answers[g.revealIndex].revealed=true;
       g.phase='result';g.current=null;g.answerUntil=0;broadcastBomb(g);
       setTimeout(()=>{
         if(g.phase==='result'&&g.result?.player===p.name){
           if(g.round<g.maxRounds)bombAdvanceTeam(g);
           else{g.phase='finished';g.finishedAt=Date.now();broadcastBomb(g)}
         }
       },1800);
     }
   },3200);
 });
 s.on('bomb:reveal',({index}={})=>{
   const g=games.get(s.data?.game);
   if(!g||g.type!=='bomb'||g.mode!=='3'||g.phase!=='answer'||!Number.isInteger(index)||!g.answers[index])return;
   if(s.data?.role!=='player'||!g.current||s.data?.pid!==g.current.id)return;
   const a=g.answers[index];
   if(a.awarded)return;
   const revealRound=g.round;
   const player=g.current;
   a.awarded=true;
   a.revealed=true;
   g.revealIndex=index;
   g.result={kind:'revealed',delta:0,answer:'',matched:a.text,team:player.team,player:player.name,revealedOnly:true};
   g.revealUntil=0;
   g.phase='result';
   g.current=null;
   g.answerUntil=0;
   broadcastBomb(g);
   setTimeout(()=>{
     if(g.phase==='result'&&g.result?.kind==='revealed'&&g.round===revealRound){
       if(g.round<g.maxRounds)bombAdvanceTeam(g);
       else{g.phase='finished';g.finishedAt=Date.now();broadcastBomb(g)}
     }
   },900);
 });
 s.on('bomb:next',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='bomb')return;if(g.mode==='1'&&s.data?.role!=='presenter')return;if(g.mode!=='1'&&s.data?.role!=='player')return;if(g.round>=g.maxRounds){g.phase='finished';g.finishedAt=Date.now();return broadcastBomb(g)}g.phase='lobby';g.current=null;broadcastBomb(g)});
 s.on('mini:start',()=>{const g=games.get(s.data?.game);if(!g||!['last','bank'].includes(g.type)||!(s.data?.role==='presenter'||g.mode!=='presenter'))return;if(g.round>=g.maxRounds){g.phase='finished';return broadcast(g)}g.scores=g.scores||{};g.players.forEach(p=>{g.scores[p.id]=g.scores[p.id]||0;g.balances[p.id]=g.balances[p.id]??10000});g.round++;g.used=g.used||[];if(g.type==='bomb'){let pool=bombQs.filter((_,i)=>!g.used.includes(i));if(!pool.length){g.used=[];pool=bombQs}const q=pool[Math.floor(Math.random()*pool.length)],idx=bombQs.indexOf(q);g.used.push(idx);g.question=q.q;g.answers=q.list.map(x=>({text:x[0],trap:x[1],points:x[2]}));g.extra=q.extra;g.points=q.p;g.phase='question';g.current=null}else if(g.type==='last'){let pool=lastQs.filter((_,i)=>!g.used.includes(i));if(!pool.length){g.used=[];pool=lastQs}const q=pool[Math.floor(Math.random()*pool.length)],idx=lastQs.indexOf(q);g.used.push(idx);g.question=q.q;g.answers=q.a;g.turnOrder=g.players.filter(p=>g.scores[p.id]>-999).map(p=>p.id);g.turnIndex=0;g.turnPlayer=g.turnOrder[0]||null;g.phase='turn';g.current=null;g.roundAnswers={};scheduleLastTurn(g)}else{let pool=bankQs.filter((_,i)=>!g.used.includes(i));if(!pool.length){g.used=[];pool=bankQs}const q=pool[Math.floor(Math.random()*pool.length)],idx=bankQs.indexOf(q);g.used.push(idx);g.question=q[0];g.answers=q[1];g.phase='bank';g.current=null;g.selectedRisk={};g.roundDone={}}broadcast(g)});

 s.on('mafia:config',cfg=>{const g=games.get(s.data?.game);if(!g||g.type!=='mafia'||g.phase!=='lobby'||g.hostId!==s.data?.pid)return;const n=(v,d,min,max)=>Math.max(min,Math.min(max,Number(v)||d));const c={maxPlayers:n(cfg.maxPlayers,8,4,20),mafiaCount:n(cfg.mafiaCount,2,1,20),detectiveCount:n(cfg.detectiveCount,1,0,20),doctorCount:n(cfg.doctorCount,1,0,20),jesterCount:n(cfg.jesterCount,0,0,20),revealRole:!!cfg.revealRole,tieMode:cfg.tieMode==='revote'?'revote':'none',nightSec:n(cfg.nightSec,30,10,120),discussionSec:n(cfg.discussionSec,90,15,300),voteSec:n(cfg.voteSec,30,10,120)};if(c.mafiaCount+c.detectiveCount+c.doctorCount+c.jesterCount>c.maxPlayers)return s.emit('errorMsg','عدد الأدوار أكبر من عدد اللاعبين');if(g.players.length>c.maxPlayers)return s.emit('errorMsg','عدد اللاعبين الحالي أكبر من العدد المحدد');g.config=c;broadcastMafia(g)});
 s.on('mafia:start',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='mafia'||g.phase!=='lobby'||g.hostId!==s.data?.pid)return;const c=g.config;if(g.players.length!==c.maxPlayers)return s.emit('errorMsg','يجب اكتمال عدد اللاعبين أولًا');if(c.mafiaCount+c.detectiveCount+c.doctorCount+c.jesterCount>g.players.length)return s.emit('errorMsg','عدد الأدوار أكبر من عدد اللاعبين');let pool=[...g.players];for(let i=pool.length-1;i>0;i--){const j=crypto.randomInt(i+1);[pool[i],pool[j]]=[pool[j],pool[i]]}let k=0;pool.forEach(p=>{p.alive=true;p.role='citizen'});for(let i=0;i<c.mafiaCount;i++)pool[k++].role='mafia';for(let i=0;i<c.detectiveCount;i++)pool[k++].role='detective';for(let i=0;i<c.doctorCount;i++)pool[k++].role='doctor';for(let i=0;i<c.jesterCount;i++)pool[k++].role='jester';g.rolesAssigned=true;g.phase='role';g.phaseUntil=0;g.nightActions={};g.votes={};g.investigationResults={};broadcastMafia(g)});
 s.on('mafia:ackRole',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='mafia'||g.phase!=='role')return;const alive=g.players.filter(p=>p.alive!==false);const a=g.acks||(g.acks={});a[s.data.pid]=true;if(alive.every(p=>a[p.id]))mafiaNight(g);broadcastMafia(g)});
 s.on('mafia:nightAction',({targetId}={})=>{const g=games.get(s.data?.game),p=g?.players.find(x=>x.id===s.data?.pid);if(!g||g.type!=='mafia'||g.phase!=='night'||!p||p.alive===false||g.nightActions[p.id]?.submitted)return;const target=g.players.find(x=>x.id===targetId&&x.alive!==false&&x.id!==p.id);if(!target)return;g.nightActions[p.id]={submitted:true,targetId:target.id};if(p.role==='detective')g.investigationResults[p.id]=target.role==='mafia';broadcastMafia(g)});
 s.on('mafia:chat',({text}={})=>{const g=games.get(s.data?.game),p=g?.players.find(x=>x.id===s.data?.pid);if(!g||g.type!=='mafia'||g.phase!=='discussion'||!p||p.alive===false)return;const t=String(text||'').trim().slice(0,180);if(!t)return;g.chat=g.chat||[];g.chat.push({id:crypto.randomBytes(5).toString('hex'),playerId:p.id,name:p.name,text:t,at:Date.now()});if(g.chat.length>100)g.chat=g.chat.slice(-100);broadcastMafia(g)});
 s.on('mafia:vote',({targetId}={})=>{const g=games.get(s.data?.game),p=g?.players.find(x=>x.id===s.data?.pid);if(!g||g.type!=='mafia'||g.phase!=='vote'||!p||p.alive===false||g.votes[p.id])return;const target=g.players.find(x=>x.id===targetId&&x.alive!==false&&x.id!==p.id);if(!target)return;g.votes[p.id]=target.id;if(g.players.filter(x=>x.alive!==false).every(x=>g.votes[x.id]))mafiaResolveVote(g);broadcastMafia(g)});
 s.on('mafia:restart',()=>{const g=games.get(s.data?.game);if(!g||g.type!=='mafia'||g.hostId!==s.data?.pid||g.phase!=='finished')return;g.players.forEach(p=>{p.alive=true;p.role=undefined});g.rolesAssigned=false;g.phase='lobby';g.phaseUntil=0;g.nightActions={};g.votes={};g.investigationResults={};g.acks={};g.lastNightResult=null;g.winnerText=null;broadcastMafia(g)});
 function mafiaNight(g){g.phase='night';g.phaseUntil=Date.now()+g.config.nightSec*1000;g.nightActions={};g.votes={};g.investigationResults={};g.acks={};broadcastMafia(g);const until=g.phaseUntil;setTimeout(()=>{if(g.phase==='night'&&g.phaseUntil===until)mafiaResolveNight(g)},g.config.nightSec*1000+100)}
 function mafiaResolveNight(g){const alive=g.players.filter(p=>p.alive!==false),actions=g.nightActions||{};const kills=alive.filter(p=>p.role==='mafia').map(p=>actions[p.id]?.targetId).filter(Boolean);const targetIds=[...new Set(kills)];const victim=targetIds.length?g.players.find(p=>p.id===targetIds[0]&&p.alive!==false):null;const doctors=alive.filter(p=>p.role==='doctor').map(p=>actions[p.id]?.targetId).filter(Boolean);if(victim&&!doctors.includes(victim.id)){victim.alive=false;g.lastNightResult={victimId:victim.id,victimName:victim.name,victimRole:g.config.revealRole?victim.role:undefined}}else g.lastNightResult={victimId:null,victimName:null};if(mafiaCheckWin(g))return;g.phase='discussion';g.phaseUntil=Date.now()+g.config.discussionSec*1000;broadcastMafia(g);const until=g.phaseUntil;setTimeout(()=>{if(g.phase==='discussion'&&g.phaseUntil===until)mafiaStartVote(g)},g.config.discussionSec*1000+100)}
 function mafiaStartVote(g){g.phase='vote';g.phaseUntil=Date.now()+g.config.voteSec*1000;g.votes={};broadcastMafia(g);const until=g.phaseUntil;setTimeout(()=>{if(g.phase==='vote'&&g.phaseUntil===until)mafiaResolveVote(g)},g.config.voteSec*1000+100)}
 function mafiaResolveVote(g){if(g.phase!=='vote')return;const counts={};Object.values(g.votes||{}).forEach(id=>counts[id]=(counts[id]||0)+1);const max=Math.max(0,...Object.values(counts));const top=Object.keys(counts).filter(id=>counts[id]===max);const rows=g.players.filter(p=>p.alive!==false).map(p=>({name:p.name,id:p.id,count:counts[p.id]||0})).sort((a,b)=>b.count-a.count);g.voteResult={rows,tie:!max||top.length!==1,eliminatedId:null,eliminatedName:null,eliminatedRole:null};if(!max||top.length!==1){g.phase='voteResult';g.phaseUntil=Date.now()+3000;broadcastMafia(g);const until=g.phaseUntil;setTimeout(()=>{if(g.phase==='voteResult'&&g.phaseUntil===until){if(g.config.tieMode==='revote'){g.voteResult=null;mafiaStartVote(g)}else{g.voteResult=null;mafiaNight(g)}}},3100);return}const victim=g.players.find(p=>p.id===top[0]&&p.alive!==false);if(victim){victim.alive=false;g.voteResult.eliminatedId=victim.id;g.voteResult.eliminatedName=victim.name;g.voteResult.eliminatedRole=g.config.revealRole?victim.role:undefined;if(victim.role==='jester'){g.winnerText='🤡 المهرج فاز!';g.phase='voteResult';g.phaseUntil=Date.now()+3000;broadcastMafia(g);const until=g.phaseUntil;setTimeout(()=>{if(g.phase==='voteResult'&&g.phaseUntil===until){g.voteResult=null;g.phase='finished';g.finishedAt=Date.now();broadcastMafia(g)}},3100);return}}if(mafiaCheckWin(g))return;g.phase='voteResult';g.phaseUntil=Date.now()+3000;broadcastMafia(g);const until=g.phaseUntil;setTimeout(()=>{if(g.phase==='voteResult'&&g.phaseUntil===until){g.voteResult=null;mafiaNight(g)}},3100)}
 function mafiaCheckWin(g){const alive=g.players.filter(p=>p.alive!==false),m=alive.filter(p=>p.role==='mafia').length,other=alive.length-m;if(m===0){g.phase='finished';g.winnerText='👥 المواطنون فازوا!';g.finishedAt=Date.now();broadcastMafia(g);return true}if(m>=other){g.phase='finished';g.winnerText='🔪 المافيا فازت!';g.finishedAt=Date.now();broadcastMafia(g);return true}return false}
 s.on('last:submit',({answer}={})=>{
 const g=games.get(s.data?.game);if(!g||g.type!=='last'||g.phase!=='turn'||g.turnPlayer!==s.data?.pid)return;
 const p=g.players.find(x=>x.id===s.data?.pid);if(!p)return;const submitted=String(answer||'').trim();if(!submitted)return;
 const previous=Object.values(g.roundAnswers||{}).map(x=>norm(x.answer)).filter(Boolean);const matched=(g.answers||[]).find(a=>smart(submitted,a));
 const repeated=previous.includes(norm(submitted));const valid=!!matched&&!repeated;const delta=valid?1:-1;
 g.scores[p.id]=(g.scores[p.id]||0)+delta;g.roundAnswers[p.id]={id:p.id,name:p.name,answer:submitted,matched:matched||null,valid,repeated,delta};
 g.history.push({round:g.round,player:p.name,answer:submitted,matched:matched||null,valid,repeated,delta});io.to(g.code).emit('last:result',{player:p.name,answer:submitted,matched:matched||null,valid,repeated,delta});
 g.turnIndex++;g.turnPlayer=g.turnOrder[g.turnIndex]||null;if(!g.turnPlayer)g.phase='lastResult';else scheduleLastTurn(g);broadcast(g);
});
s.on('last:next',()=>{const g=games.get(s.data?.game);if(g?.type==='last'&&(s.data?.role==='presenter'||g.mode!=='presenter')){if(g.round<g.maxRounds){g.phase='lobby'}else g.phase='finished';broadcast(g)}});
 s.on('bank:risk',({amount}={})=>{const g=games.get(s.data?.game);if(g?.type!=='bank'||g.phase!=='bank'||!g.players.some(p=>p.id===s.id)||![500,1500,3000].includes(+amount))return;const bal=g.balances[s.id]??10000;if(bal<amount)return s.emit('errorMsg','رصيدك لا يكفي لهذا الرهان');g.selectedRisk[s.id]=+amount;broadcast(g)});
 s.on('bank:answer',({answer}={})=>{const g=games.get(s.data?.game);if(g?.type!=='bank'||g.phase!=='bank'||!g.selectedRisk[s.id])return;const qAnswers=g.answers||[];const ok=qAnswers.some(x=>smart(answer,x));const risk=g.selectedRisk[s.id];g.balances[s.id]=ok?(g.balances[s.id]??10000)+risk:Math.max(g.secured[s.id]||0,(g.balances[s.id]??10000)-risk);g.scores[s.id]=g.balances[s.id];g.roundDone[s.id]={ok,risk,answer:String(answer||'')};g.history.push({round:g.round,player:g.players.find(p=>p.id===s.id)?.name,question:g.question,answer:String(answer||''),risk,ok,delta:ok?risk:-risk,balance:g.balances[s.id]});if(Object.keys(g.roundDone).length>=g.players.length){g.phase='bankResult'}broadcast(g)});
 s.on('bank:deposit',()=>{const g=games.get(s.data?.game);if(g?.type!=='bank'||g.phase!=='bankResult'||g.round%3!==0)return;g.secured[s.id]=g.balances[s.id]||0;broadcast(g)});
 s.on('bank:next',()=>{const g=games.get(s.data?.game);if(g?.type==='bank'&&(s.data?.role==='presenter'||g.mode!=='presenter')){if(g.round<g.maxRounds)g.phase='lobby';else g.phase='finished';broadcast(g)}});
 s.on('room:checkSessions',({sessions=[]}={})=>{const result=(Array.isArray(sessions)?sessions:[]).map(x=>{const g=games.get(clean(x.code));const token=String(x?.token||'');const player=g?.players?.find(p=>String(p.sessionToken||'')===token);const valid=!!g&&g.phase!=='finished'&&!!player&&!token.startsWith('REVOKED-');return {...x,valid};});s.emit('room:sessionStatus',result);});
s.on('room:leave',({code}={})=>{const g=games.get(clean(code||s.data?.game));if(!g)return;s.leave(g.code);if(s.data?.role==='player'){const p=g.players?.find(p=>p.id===s.data?.pid||p.socketId===s.id);if(p){p.online=false;p.disconnectedAt=Date.now();p.socketId=null;/* Explicit exit is recoverable too: keep identity, token, team and progress. */if((g.type==='bomb'||g.type==='mafia')&&g.hostId===p.id){const next=g.players.find(x=>x.id!==p.id&&x.online!==false);g.hostId=next?.id||null;}}}s.emit('room:left',{code:g.code});broadcast(g);persistGames()});
 s.on('disconnect',()=>{const g=games.get(s.data?.game);if(!g)return;const p=g.players.find(p=>p.id===s.data?.pid||p.socketId===s.id);if(p){p.online=false;p.disconnectedAt=Date.now();p.socketId=null}broadcast(g);persistGames()});
});
try{if(fs.existsSync(SESSION_FILE)){const saved=JSON.parse(fs.readFileSync(SESSION_FILE,'utf8'));for(const g of saved){if(g?.code&&g?.players)games.set(g.code,g);}}}catch(e){console.error('session restore failed',e.message)}
setInterval(()=>{const now=Date.now();for(const [code,g] of games){const hasRecent=g.players?.some(p=>p.disconnectedAt&&now-p.disconnectedAt<SESSION_RETENTION_MS);if(g.phase==='finished'&&(!hasRecent||now-(g.finishedAt||now)>SESSION_RETENTION_MS)){games.delete(code)}}persistGames()},60000);
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Arena ready'));
