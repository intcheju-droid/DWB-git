/* 더불어 함께 — 공용 스크립트: 글자크기·고대비·쉬운글·소리로 듣기 */
function setFs(mode){
  document.documentElement.classList.remove('big','bigger');
  if(mode) document.documentElement.classList.add(mode);
  ['fs1','fs2','fs3'].forEach(function(id,i){
    var el = document.getElementById(id); if(!el) return;
    var on = (mode==='' && i===0) || (mode==='big' && i===1) || (mode==='bigger' && i===2);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  try{ localStorage.setItem('fs', mode); }catch(e){}
}
function toggleHc(){
  var on = document.documentElement.classList.toggle('contrast');
  var el = document.getElementById('hc');
  if(el) el.setAttribute('aria-pressed', on ? 'true' : 'false');
  try{ localStorage.setItem('hc', on ? '1' : ''); }catch(e){}
}
function setEasy(on){
  ttsStop();
  document.documentElement.classList.toggle('easy-on', on);
  var n = document.getElementById('btn-normal'), e = document.getElementById('btn-easy');
  if(n) n.setAttribute('aria-pressed', on ? 'false' : 'true');
  if(e) e.setAttribute('aria-pressed', on ? 'true' : 'false');
}

/* 소리로 듣기 (브라우저 내장 음성합성) */
var ttsQueue = [], ttsIdx = 0, ttsActive = false;
function ttsCollect(){
  var easyMode = document.documentElement.classList.contains('easy-on');
  var sel = easyMode ? '.easy' : 'article.normal';
  var rootEl = document.querySelector(sel);
  if(!rootEl) return [];
  var root = rootEl.cloneNode(true);
  root.querySelectorAll('figure, .notice, table').forEach(function(el){ el.remove(); });
  var parts = [];
  if(!easyMode){
    var t = document.querySelector('h1'); if(t) parts.push(t.innerText);
  }
  root.querySelectorAll('h2, h3, p, dt, dd').forEach(function(el){
    var s = el.innerText.trim(); if(s) parts.push(s);
  });
  if(!easyMode){
    var box = document.querySelector('.infobox');
    if(box){
      box.querySelectorAll('tr').forEach(function(tr){
        var th = tr.querySelector('th'), td = tr.querySelector('td');
        if(th && td) parts.push(th.innerText.trim() + ': ' + td.innerText.trim());
      });
    }
  }
  return parts;
}
/* 한국어 음성 중 자연스러운 것을 우선 선택
   우선순위: 자연 음성(Edge Natural) > Google > 신경망/프리미엄 > 그 외 한국어 */
function pickKoreanVoice(){
  var vs = speechSynthesis.getVoices().filter(function(v){
    return v.lang && v.lang.replace('_','-').toLowerCase().indexOf('ko') === 0;
  });
  if(!vs.length) return null;
  var prefs = ['natural', 'google', 'neural', 'premium', 'siri', 'yuna'];
  for(var i = 0; i < prefs.length; i++){
    for(var j = 0; j < vs.length; j++){
      if(vs[j].name.toLowerCase().indexOf(prefs[i]) >= 0) return vs[j];
    }
  }
  return vs[0];
}
function ttsSpeakNext(){
  if(!ttsActive || ttsIdx >= ttsQueue.length){ ttsReset(); return; }
  var u = new SpeechSynthesisUtterance(ttsQueue[ttsIdx]);
  u.lang = 'ko-KR'; u.rate = 1.0; u.pitch = 1.0;
  var v = pickKoreanVoice();
  if(v) u.voice = v;
  u.onend = function(){ ttsIdx++; ttsSpeakNext(); };
  u.onerror = function(){ ttsReset(); };
  speechSynthesis.speak(u);
}
function ttsStart(){
  ttsQueue = ttsCollect(); ttsIdx = 0;
  if(!ttsQueue.length) return;
  ttsActive = true;
  speechSynthesis.cancel();
  ttsSpeakNext();
  var btn = document.getElementById('tts-play');
  if(btn){ btn.textContent = '⏸ 잠시 멈춤'; btn.classList.add('on'); }
  var st = document.getElementById('tts-stop'); if(st) st.hidden = false;
}
/* 음성 미지원 브라우저(카카오톡 등 인앱 브라우저) 안내 */
function ttsShowUnsupported(btn){
  var ua = navigator.userAgent || '';
  var inApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps/i.test(ua);
  var msg = inApp
    ? '카카오톡 등 앱 안의 브라우저는 음성을 지원하지 않아요. 화면 아래 메뉴(⋮)에서 "다른 브라우저로 열기"를 누르면 크롬·삼성인터넷에서 들을 수 있어요.'
    : '이 브라우저는 음성을 지원하지 않아요. 크롬·삼성인터넷·엣지 브라우저로 열면 들을 수 있어요.';
  var note = document.getElementById('tts-note');
  if(!note){
    note = document.createElement('p');
    note.id = 'tts-note';
    note.setAttribute('role', 'status');
    note.style.cssText = 'font-size:.85em;color:#595959;margin:.5rem 0 0;line-height:1.6;';
    var host = btn.closest ? (btn.closest('.meta') || btn.parentNode) : btn.parentNode;
    host.appendChild(note);
  }
  note.textContent = msg;
}
function ttsToggle(){
  var btn = document.getElementById('tts-play'); if(!btn) return;
  if(!('speechSynthesis' in window)){
    ttsShowUnsupported(btn);
    return;
  }
  if(!ttsActive){
    /* 음성 목록이 아직 로드 전이면 로드를 기다렸다가 시작 */
    if(!speechSynthesis.getVoices().length){
      var started = false;
      speechSynthesis.addEventListener('voiceschanged', function once(){
        speechSynthesis.removeEventListener('voiceschanged', once);
        if(!started){ started = true; ttsStart(); }
      });
      setTimeout(function(){ if(!started && !ttsActive){ started = true; ttsStart(); } }, 600);
    } else {
      ttsStart();
    }
  } else if(speechSynthesis.paused){
    speechSynthesis.resume(); btn.textContent = '⏸ 잠시 멈춤';
  } else {
    speechSynthesis.pause(); btn.textContent = '▶ 이어서 듣기';
  }
}
function ttsStop(){
  ttsActive = false;
  if('speechSynthesis' in window) speechSynthesis.cancel();
  ttsReset();
}
function ttsReset(){
  ttsActive = false; ttsIdx = 0;
  var btn = document.getElementById('tts-play');
  if(btn){ btn.textContent = '🔊 소리로 듣기'; btn.classList.remove('on'); }
  var st = document.getElementById('tts-stop'); if(st) st.hidden = true;
}
if('speechSynthesis' in window){ speechSynthesis.getVoices(); }
window.addEventListener('beforeunload', function(){ if('speechSynthesis' in window) speechSynthesis.cancel(); });

/* 초기화 */
try{
  var fs = localStorage.getItem('fs'); if(fs) setFs(fs);
  if(localStorage.getItem('hc')==='1') toggleHc();
}catch(e){}
if(location.hash === '#easy') setEasy(true);
