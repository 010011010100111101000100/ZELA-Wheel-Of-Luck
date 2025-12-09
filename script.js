/* Full upgraded wheel script (final) */
/* NOTE: You MUST replace SIGNING_SERVER_URL with your signing server domain before using GRAND issuance. */
/* This code expects the signing server to expose POST /issue that returns JSON { token: '<signed-token>', expiresAt: <unix seconds> } */

/* CONFIG */
const SIGNING_SERVER_URL = "https://YOUR_SIGNING_SERVER_DOMAIN"; // << REPLACE
const DAILY_SPINS = 5;
const SEGMENTS = 100;
const EXTRA_SEGMENTS = 10;
const GRAND_SEGMENT_INDEX = 0;
const TOKEN_FILENAME_BASE = "ZELA_PRIZE_";

/* DOM */
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const spinsLeftEl = document.getElementById('spinsLeft');
const resultMsg = document.getElementById('resultMsg');
const downloadLink = document.getElementById('downloadLink');
const pointerEl = document.getElementById('pointer');

/* STATE */
const STORAGE_KEY = 'zela_wheel_state_v2';
let state = { date: null, spins: DAILY_SPINS };
let spinning = false;
let currentRotation = 0;

/* VISUALS */
let segments = new Array(SEGMENTS).fill('grey');
segments[GRAND_SEGMENT_INDEX] = 'grand';
let indices = Array.from({length:SEGMENTS}, (_,i)=>i).filter(i=>i!==GRAND_SEGMENT_INDEX);
shuffle(indices);
const extraIndices = indices.slice(0, EXTRA_SEGMENTS);
extraIndices.forEach(i=>segments[i]='extra');

/* Initialization */
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toDateString();
    if(!raw){
      state = { date: today, spins: DAILY_SPINS };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      const parsed = JSON.parse(raw);
      if(parsed.date !== today){
        state = { date: today, spins: DAILY_SPINS };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else state = parsed;
    }
  }catch(e){
    state = { date: new Date().toDateString(), spins: DAILY_SPINS };
  }
  updateSpinsUI();
}
function updateSpinsUI(){ spinsLeftEl.textContent = `Spins left today: ${state.spins}`; }
loadState();

/* DRAWING */
function drawWheel(rotationDeg=0){
  const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2;
  const radius = Math.min(W,H)*0.45;
  ctx.clearRect(0,0,W,H);

  // outer glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx,cy,radius+8,0,Math.PI*2);
  ctx.fillStyle = 'rgba(124,58,237,0.02)';
  ctx.fill();
  ctx.restore();

  for(let i=0;i<SEGMENTS;i++){
    const start = ((i*(360/SEGMENTS))+rotationDeg-90)*Math.PI/180;
    const end = (((i+1)*(360/SEGMENTS))+rotationDeg-90)*Math.PI/180;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,radius,start,end);
    ctx.closePath();

    if(segments[i]==='grand'){
      const g = ctx.createLinearGradient(cx-radius,cy-radius,cx+radius,cy+radius);
      g.addColorStop(0,'#fff2cc'); g.addColorStop(1,'#f59e0b'); ctx.fillStyle = g;
    } else if(segments[i]==='extra'){
      const g = ctx.createLinearGradient(cx-radius,cy-radius,cx+radius,cy+radius);
      g.addColorStop(0,'#c4b5fd'); g.addColorStop(1,'#7c3aed'); ctx.fillStyle = g;
    } else { ctx.fillStyle = '#2f3742'; }
    ctx.fill();

    // separator
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(cx + radius*Math.cos(start), cy + radius*Math.sin(start));
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.6; ctx.stroke();
  }

  // inner circle
  ctx.beginPath(); ctx.arc(cx,cy,radius*0.76,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fill();

  // labels
  for(let i=0;i<SEGMENTS;i++){
    if(segments[i] !== 'grey'){
      const mid = ((i+0.5)*(360/SEGMENTS)+rotationDeg-90)*Math.PI/180;
      const x = cx + (radius*0.62)*Math.cos(mid), y = cy + (radius*0.62)*Math.sin(mid);
      ctx.save(); ctx.translate(x,y); ctx.rotate(mid + Math.PI/2);
      ctx.fillStyle = segments[i]==='grand' ? '#4b2b00' : '#fff';
      ctx.font = `${Math.max(10, Math.round(radius*0.06))}px bold sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(segments[i]==='grand' ? 'GRAND' : '+5', 0, 0);
      ctx.restore();
    }
  }
}

/* initial draw */
resizeCanvas(); drawWheel(0);

/* AUDIO (WebAudio synth) */
let audioCtx = null;
function ensureAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ audioCtx=null; } } }
function playClick(){ ensureAudio(); if(!audioCtx) return; const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type='square'; o.frequency.value=880; g.gain.value=0; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(0.0001,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.05,audioCtx.currentTime+0.01); g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.12); o.start(); o.stop(audioCtx.currentTime+0.14); }
function playSweep(){ ensureAudio(); if(!audioCtx) return; const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type='sawtooth'; const now=audioCtx.currentTime; o.frequency.setValueAtTime(200,now); o.frequency.exponentialRampToValueAtTime(1600, now+1.7); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.08, now+0.08); g.gain.exponentialRampToValueAtTime(0.0001, now+1.7); o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now+1.75); }
function playWin(){ ensureAudio(); if(!audioCtx) return; const notes=[880,990,1320]; const now=audioCtx.currentTime; notes.forEach((n,i)=>{ const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type='sine'; o.frequency.setValueAtTime(n, now + i*0.08); g.gain.setValueAtTime(0.0001, now + i*0.08); g.gain.exponentialRampToValueAtTime(0.12, now + i*0.08 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + i*0.08 + 0.28); o.connect(g); g.connect(audioCtx.destination); o.start(now + i*0.08); o.stop(now + i*0.08 + 0.32); }); }

/* SPIN MATH */
function computeRotationForIndex(idx){
  const segCenter = -90 + (idx + 0.5) * (360/SEGMENTS);
  const base = 90 - segCenter;
  const fullRevs = 8 + Math.floor(Math.random()*3);
  const jitter = (Math.random()-0.5) * ((360/SEGMENTS) * 0.6);
  return fullRevs*360 + base + jitter;
}
function chooseOutcome(){
  const roll = Math.floor(Math.random()*100);
  if(roll === 0) return {type:'grand', roll};
  if(roll >=1 && roll <= EXTRA_SEGMENTS) return {type:'extra', roll};
  return {type:'lose', roll};
}
function pickIndexForType(type){
  if(type === 'grand') return GRAND_SEGMENT_INDEX;
  if(type === 'extra') return extraIndices[Math.floor(Math.random()*extraIndices.length)];
  const loses = []; for(let i=0;i<SEGMENTS;i++) if(segments[i]==='grey') loses.push(i);
  return loses[Math.floor(Math.random()*loses.length)];
}

/* SPIN ANIMATION */
async function spinOnce(){
  if(spinning) return;
  if(audioCtx && audioCtx.state === 'suspended') try{ await audioCtx.resume(); }catch(e){}
  if(state.spins <= 0){ resultMsg.textContent = 'No spins left today — come back tomorrow!'; return; }
  state.spins = Math.max(0, state.spins - 1); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateSpinsUI();
  playClick();
  spinning = true; spinBtn.disabled = true; resultMsg.textContent=''; downloadLink.style.display='none';
  const outcome = chooseOutcome(); const idx = pickIndexForType(outcome.type); const target = computeRotationForIndex(idx);
  const startRotation = currentRotation % 360; const endRotation = target; const duration = 4800; const start = performance.now();
  playSweep(); canvas.classList.add('neon-pulse');
  function frame(now){
    const t = Math.min(1, (now - start)/duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const cur = startRotation + (endRotation - startRotation) * eased;
    currentRotation = cur; canvas.style.transform = `rotate(${cur}deg)`; drawWheel(cur);
    if(t < 1) requestAnimationFrame(frame);
    else {
      canvas.classList.remove('neon-pulse');
      spinning = false; spinBtn.disabled = false; pointerEl.classList.add('pointer-wiggle'); setTimeout(()=>pointerEl.classList.remove('pointer-wiggle'),520);
      if(outcome.type === 'grand'){ handleGrandWin(); }
      else if(outcome.type === 'extra'){ state.spins += 5; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateSpinsUI(); playWin(); confetti({ particleCount:140, spread:90, origin:{ y:0.6 }}); resultMsg.textContent = '+5 spins!'; }
      else { resultMsg.textContent = 'Try again!'; }
    }
  }
  requestAnimationFrame(frame);
}

/* GRAND flow: call signing server to issue a signed token */
async function handleGrandWin(){
  resultMsg.textContent = '🎉 GRAND PRIZE! Generating prize file...'; playWin(); confetti({ particleCount:260, spread:150, origin:{ y:0.6 }});
  try{
    const issueUrl = SIGNING_SERVER_URL + '/issue';
    const resp = await fetch(issueUrl, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ prize:'GRAND' }) });
    if(!resp.ok) throw new Error('Issue failed '+resp.status);
    const data = await resp.json();
    if(!data.token) throw new Error('No token returned');
    const blob = new Blob([data.token], { type:'text/plain' });
    const url = URL.createObjectURL(blob);
    const name = TOKEN_FILENAME_BASE + Date.now() + '.zela';
    downloadLink.href = url; downloadLink.download = name; downloadLink.style.display='inline-block'; downloadLink.textContent = 'Download Prize File (.zela)';
    resultMsg.innerHTML = `Prize ready — expires ${data.expiresAt ? new Date(data.expiresAt*1000).toLocaleString() : 'unknown' }`;
  }catch(err){ console.error(err); resultMsg.textContent = 'Could not create prize file. Try again later.'; }
}

/* Helpers */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }
function resizeCanvas(){ const rect = canvas.parentElement.getBoundingClientRect(); const dpr = Math.max(1, window.devicePixelRatio || 1); const size = Math.min(rect.width, rect.height); canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr); canvas.style.width = `${size}px`; canvas.style.height = `${size}px`; canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0); drawWheel(currentRotation); }
window.addEventListener('resize', resizeCanvas);

/* attach events */
spinBtn.addEventListener('click', async ()=>{ if(audioCtx && audioCtx.state === 'suspended') try{ await audioCtx.resume(); }catch(e){} playClick(); spinOnce(); });

/* start */
resizeCanvas(); drawWheel(0);
