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
  var sel = document.documentElement.classList.contains('easy-on') ? '.easy' : 'article.normal';
  var rootEl = document.querySelector(sel);
  if(!rootEl) return [];
  var root = rootEl.cloneNode(true);
  root.querySelectorAll('figure, .notice, table').forEach(function(el){ el.remove(); });
  var parts = [];
  var t = document.querySelector('h1'); if(t) parts.push(t.innerText);
  root.querySelectorAll('h2, h3, p, dt, dd').forEach(function(el){
    var s = el.innerText.trim(); if(s) parts.push(s);
  });
  var box = document.querySelector(sel === '.easy' ? '' : '.infobox');
  if(box){
    box.querySelectorAll('tr').forEach(function(tr){
      var th = tr.querySelector('th'), td = tr.querySelector('td');
      if(th && td) parts.push(th.innerText.trim() + ': ' + td.innerText.trim());
    });
  }
  return parts;
}
function ttsSpeakNext(){
  if(!ttsActive || ttsIdx >= ttsQueue.length){ ttsReset(); return; }
  var u = new SpeechSynthesisUtterance(ttsQueue[ttsIdx]);
  u.lang = 'ko-KR'; u.rate = 0.95;
  var ko = speechSynthesis.getVoices().filter(function(v){ return v.lang && v.lang.indexOf('ko') === 0; });
  if(ko.length) u.voice = ko[0];
  u.onend = function(){ ttsIdx++; ttsSpeakNext(); };
  u.onerror = function(){ ttsReset(); };
  speechSynthesis.speak(u);
}
function ttsToggle(){
  var btn = document.getElementById('tts-play'); if(!btn) return;
  if(!('speechSynthesis' in window)){
    btn.textContent = '이 브라우저는 음성을 지원하지 않아요'; btn.disabled = true; return;
  }
  if(!ttsActive){
    ttsQueue = ttsCollect(); ttsIdx = 0; ttsActive = true;
    speechSynthesis.cancel();
    ttsSpeakNext();
    btn.textContent = '⏸ 잠시 멈춤'; btn.classList.add('on');
    var st = document.getElementById('tts-stop'); if(st) st.hidden = false;
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
