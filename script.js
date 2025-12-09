/* ===========================
   ZELA Wheel - script.js
   Canvas wheel (pointer at BOTTOM)
   =========================== */

/* ---------- CONFIG ---------- */
const DAILY_SPINS = 5;
const SECRET_SEQ = "9F0";
const TOKEN_PREFIX = "ZELA-";
const TOKEN_BODY_LEN = 20; // characters AFTER prefix
const TOKEN_MIN_DIGITS = 3;
const TOKEN_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/* ---------- SEGMENTS (edit labels/colors here) ---------- */
/* This array determines how many slices the wheel has and their order.
   The pointer is at the BOTTOM of the canvas; the math below makes
   sure the index that ends up under that bottom pointer is the winner. */
const SEGMENTS = [
  { color: "#FFD700", label: "GRAND" },    // gold
  { color: "#8000FF", label: "+5 Spins" }, // purple
  { color: "#B0B0B0", label: "Try Again" },
  { color: "#8000FF", label: "+5 Spins" },
  { color: "#B0B0B0", label: "Try Again" },
  { color: "#8000FF", label: "+5 Spins" },
  { color: "#B0B0B0", label: "Try Again" },
  { color: "#8000FF", label: "+5 Spins" },
  { color: "#B0B0B0", label: "Try Again" },
  { color: "#8000FF", label: "+5 Spins" },
  { color: "#B0B0B0", label: "Try Again" },
  { color: "#8000FF", label: "+5 Spins" }
];

/* ---------- DOM ---------- */
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const spinsLeftEl = document.getElementById("spinsLeft");
const resultMsg = document.getElementById("resultMsg");
const downloadLink = document.getElementById("downloadLink");
const pointerEl = document.getElementById("pointer");

/* ---------- STATE ---------- */
let spinning = false;
let currentRotationDeg = 0; // CSS rotation applied to canvas
let spinsState = { date: null, spins: DAILY_SPINS };

/* ---------- UTIL: localStorage spins ---------- */
function loadSpins() {
  try {
    const raw = localStorage.getItem("zela_wheel_state_v3");
    const today = new Date().toDateString();
    if (!raw) {
      spinsState = { date: today, spins: DAILY_SPINS };
      localStorage.setItem("zela_wheel_state_v3", JSON.stringify(spinsState));
    } else {
      const parsed = JSON.parse(raw);
      if (parsed.date !== today) {
        spinsState = { date: today, spins: DAILY_SPINS };
        localStorage.setItem("zela_wheel_state_v3", JSON.stringify(spinsState));
      } else spinsState = parsed;
    }
  } catch (e) {
    spinsState = { date: new Date().toDateString(), spins: DAILY_SPINS };
  }
  spinsLeftEl.textContent = `Spins left today: ${spinsState.spins}`;
}
function saveSpins() {
  localStorage.setItem("zela_wheel_state_v3", JSON.stringify(spinsState));
}

/* ---------- UTIL: token registry ---------- */
function saveTokenEntry(entry) {
  const arr = JSON.parse(localStorage.getItem("zela_tokens_v3") || "[]");
  arr.push(entry);
  localStorage.setItem("zela_tokens_v3", JSON.stringify(arr));
}
function findTokenEntry(token) {
  const arr = JSON.parse(localStorage.getItem("zela_tokens_v3") || "[]");
  return arr.find(t => t.token === token) || null;
}

/* ---------- RESIZE / DRAW ---------- */
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const size = Math.min(rect.width, rect.height);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawWheel(currentRotationDeg);
}
window.addEventListener("resize", resizeCanvas);

function drawWheel(rotationDeg = 0, highlightIndex = -1) {
  const W = canvas.width / (window.devicePixelRatio || 1);
  const H = canvas.height / (window.devicePixelRatio || 1);
  const cx = W / 2, cy = H / 2;
  const radius = Math.min(W, H) * 0.48;
  ctx.clearRect(0, 0, W, H);

  // outer glow / background
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(124,58,237,0.03)";
  ctx.fill();
  ctx.restore();

  const segCount = SEGMENTS.length;
  const segAngle = (2 * Math.PI) / segCount;

  // draw slices
  for (let i = 0; i < segCount; i++) {
    const start = (i * segAngle) - Math.PI / 2 + rotationDeg * Math.PI / 180;
    const end = ((i + 1) * segAngle) - Math.PI / 2 + rotationDeg * Math.PI / 180;

    // highlight winner with slight radial expansion
    const isHighlight = (i === highlightIndex);
    const r = isHighlight ? radius * 1.04 : radius;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();

    // fill gradient for nicer neon look
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, SEGMENTS[i].color);
    g.addColorStop(1, shadeColor(SEGMENTS[i].color, -20));
    ctx.fillStyle = g;
    ctx.fill();

    // separator
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(start), cy + r * Math.sin(start));
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // inner circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  // labels (only draw for non-empty labels)
  ctx.fillStyle = "#fff";
  ctx.font = `${Math.max(12, Math.round(radius * 0.06))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < segCount; i++) {
    const mid = ((i + 0.5) * segAngle) - Math.PI / 2 + rotationDeg * Math.PI / 180;
    const tx = cx + (radius * 0.62) * Math.cos(mid);
    const ty = cy + (radius * 0.62) * Math.sin(mid);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = SEGMENTS[i].label === "GRAND" ? "#4b2b00" : "#fff";
    ctx.fillText(SEGMENTS[i].label, 0, 0);
    ctx.restore();
  }
}

/* small helper to darken a hex color */
function shadeColor(hex, percent) {
  try {
    // remove pound
    const h = hex.replace("#", "");
    const num = parseInt(h, 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00FF) + percent;
    let b = (num & 0x0000FF) + percent;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "#" + (r << 16 | g << 8 | b).toString(16).padStart(6, "0");
  } catch (e) { return hex; }
}

/* ---------- SOUND (WebAudio synth) ---------- */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
}
function clickSound() {
  ensureAudio();
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "square"; o.frequency.value = 900;
  g.gain.value = 0;
  o.connect(g); g.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  o.start(now); o.stop(now + 0.09);
}
function sweepSound(durationSec = 1.8) {
  ensureAudio();
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "sawtooth";
  const now = audioCtx.currentTime;
  o.frequency.setValueAtTime(200, now);
  o.frequency.exponentialRampToValueAtTime(1800, now + durationSec);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.08, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(now); o.stop(now + durationSec + 0.05);
}
function winMelody() {
  ensureAudio();
  if (!audioCtx) return;
  const notes = [880, 990, 1320];
  const now = audioCtx.currentTime;
  notes.forEach((n, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(n, now + i * 0.08);
    g.gain.setValueAtTime(0.0001, now + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.32);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now + i * 0.08);
    o.stop(now + i * 0.08 + 0.32);
  });
}

/* ---------- SPIN MATH ---------- */
/* We draw segments with their 0 position at the TOP ( -90deg ), then apply rotationDeg.
   The pointer sits at the BOTTOM (6 o'clock) visually. To calculate rotation so that
   segment idx is exactly under the bottom pointer, solve for rotationDeg:

   displayedAngleOfSegmentCenter = ( (idx + 0.5) * segAngleDeg - 90 ) + rotationDeg
   pointerAngle = +90 degrees  (bottom)
   => rotationDeg = 90 - ( (idx + 0.5) * segAngleDeg - 90 ) = 180 - (idx + 0.5)*segAngleDeg
*/
function computeRotationForIndex(idx) {
  const segCount = SEGMENTS.length;
  const segAngleDeg = 360 / segCount;
  const segCenterDeg = (idx + 0.5) * segAngleDeg;
  const alignToPointerDeg = 180 - segCenterDeg; // base rotation to put that center at bottom
  const fullRevs = 6 + Math.floor(Math.random() * 3); // spin 6-8 full revolutions
  const jitter = (Math.random() - 0.5) * (segAngleDeg * 0.6); // small jitter
  return fullRevs * 360 + alignToPointerDeg + jitter;
}

/* Randomly choose outcome with rare GRAND */
function chooseOutcome() {
  const roll = Math.floor(Math.random() * 100); // 0..99
  if (roll === 0) return { type: "grand", roll }; // 1-in-100
  if (roll < 11) return { type: "extra", roll }; // ~10% => extra
  return { type: "lose", roll };
}

function pickIndexForType(type) {
  if (type === "grand") {
    // pick a random index that is labeled GRAND
    const choices = SEGMENTS.map((s, i) => s.label === "GRAND" ? i : -1).filter(i => i >= 0);
    return choices[Math.floor(Math.random() * choices.length)];
  }
  if (type === "extra") {
    const choices = SEGMENTS.map((s, i) => s.label.includes("+5") || s.label.toLowerCase().includes("spin") ? i : -1).filter(i => i >= 0);
    return choices[Math.floor(Math.random() * choices.length)];
  }
  // pick a "lose" index
  const loses = SEGMENTS.map((s, i) => (s.label === "Try Again" ? i : -1)).filter(i => i >= 0);
  return loses[Math.floor(Math.random() * loses.length)];
}

/* ---------- SPIN ANIMATION ---------- */
async function spinOnce() {
  if (spinning) return;
  if (spinsState.spins <= 0) {
    resultMsg.textContent = "No spins left today — come back tomorrow!";
    return;
  }

  // resume audio if suspended (required in some browsers after user gesture)
  if (audioCtx && audioCtx.state === "suspended") try { await audioCtx.resume(); } catch (e) {}

  // consume a spin
  spinsState.spins = Math.max(0, spinsState.spins - 1);
  saveSpins();
  spinsLeftEl.textContent = `Spins left today: ${spinsState.spins}`;

  clickSound();
  spinning = true;
  spinBtn.disabled = true;
  resultMsg.textContent = "";
  downloadLink.style.display = "none";
  pointerEl.classList.remove("pointer-wiggle");

  const outcome = chooseOutcome();
  const idx = pickIndexForType(outcome.type);
  const targetDeg = computeRotationForIndex(idx);

  // animation loop
  const startRotation = currentRotationDeg % 360;
  const endRotation = targetDeg;
  const duration = 5200;
  const t0 = performance.now();
  playSweep();

  // neon pulse
  canvas.classList.add("neon-pulse");

  function frame(t) {
    const p = Math.min(1, (t - t0) / duration);
    const eased = easeOutCubic(p);
    const cur = startRotation + (endRotation - startRotation) * eased;
    currentRotationDeg = cur;
    canvas.style.transform = `rotate(${cur}deg)`;
    // draw with highlight when near finish
    const nearFinish = p > 0.98;
    drawWheel(cur, nearFinish ? idx : -1);

    if (p < 1) requestAnimationFrame(frame);
    else finishSpin(outcome, idx);
  }
  requestAnimationFrame(frame);
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function playSweep() { sweepSound(1.9); }

/* ---------- FINISH ---------- */
function finishSpin(outcome, idx) {
  canvas.classList.remove("neon-pulse");
  spinning = false;
  spinBtn.disabled = false;
  pointerEl.classList.add("pointer-wiggle");
  setTimeout(() => pointerEl.classList.remove("pointer-wiggle"), 520);

  // Guarantee final draw exactly aligned for clarity
  const finalAlign = computeRotationForIndex(idx);
  currentRotationDeg = finalAlign;
  canvas.style.transform = `rotate(${finalAlign}deg)`;
  drawWheel(finalAlign, idx);

  const seg = SEGMENTS[idx];
  const prizeLabel = seg.label;
  resultMsg.textContent = `You got: ${prizeLabel}`;

  if (outcome.type === "grand") {
    // Grand prize flow - generate token by rules, save to local registry, create .zela file
    const token = generateValidToken();
    const expires = Date.now() + (3 * 24 * 3600 * 1000); // 3 days expiry (editable)
    saveTokenEntry({ token, prize: "GRAND", issuedAt: Date.now(), expires, used: false });
    createZelaFile(token);
    winMelody();
    confetti({ particleCount: 220, spread: 160, origin: { y: 0.6 } });
    resultMsg.textContent = "🎉 GRAND PRIZE! Token generated!";
    // show small 3D highlight pulse
    animateHighlightPulse(idx);
  } else if (outcome.type === "extra") {
    spinsState.spins += 5;
    saveSpins();
    spinsLeftEl.textContent = `Spins left today: ${spinsState.spins}`;
    winMelody();
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    resultMsg.textContent = "+5 spins!";
  } else {
    // lose
    resultMsg.textContent = "Try again!";
  }
}

/* small highlight animation (visual flourish) */
function animateHighlightPulse(idx) {
  let t = 0;
  const steps = 30;
  function loop() {
    t++;
    drawWheel(currentRotationDeg, idx);
    if (t < steps) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/* ---------- TOKEN GENERATOR (meets rules) ---------- */
function generateValidToken() {
  // generate until passes validation (should be quick)
  let attempt = 0;
  while (attempt++ < 500) {
    let body = "";
    for (let i = 0; i < TOKEN_BODY_LEN; i++) {
      body += TOKEN_CHARSET.charAt(Math.floor(Math.random() * TOKEN_CHARSET.length));
    }
    // ensure secret seq
    if (!body.includes(SECRET_SEQ)) {
      const pos = Math.floor(Math.random() * (TOKEN_BODY_LEN - SECRET_SEQ.length + 1));
      body = body.slice(0, pos) + SECRET_SEQ + body.slice(pos + SECRET_SEQ.length);
      if (body.length > TOKEN_BODY_LEN) body = body.slice(0, TOKEN_BODY_LEN);
    }
    // ensure digits
    let digits = (body.match(/[0-9]/g) || []).length;
    let i = 0;
    while (digits < TOKEN_MIN_DIGITS && i < TOKEN_BODY_LEN) {
      const pos = Math.floor(Math.random() * TOKEN_BODY_LEN);
      const ch = String(Math.floor(Math.random() * 10));
      if (!/[0-9]/.test(body[pos])) {
        body = body.slice(0, pos) + ch + body.slice(pos + 1);
        digits++;
      }
      i++;
    }
    const token = TOKEN_PREFIX + body.toUpperCase();
    if (validateTokenFormat(token).valid) return token;
  }
  // fallback (very unlikely)
  return TOKEN_PREFIX + "9F0" + Array(TOKEN_BODY_LEN - 3).fill("0").join("");
}

/* Validate token format (same rules used by verifier) */
function validateTokenFormat(token) {
  if (typeof token !== "string") return { valid: false, reason: "not-a-string" };
  if (!token.startsWith(TOKEN_PREFIX)) return { valid: false, reason: "missing-prefix" };
  const body = token.slice(TOKEN_PREFIX.length);
  if (body.length !== TOKEN_BODY_LEN) return { valid: false, reason: `wrong-length (need ${TOKEN_BODY_LEN})` };
  if (!/^[A-Z0-9]+$/.test(body)) return { valid: false, reason: "invalid-chars" };
  if ((body.match(/[0-9]/g) || []).length < TOKEN_MIN_DIGITS) return { valid: false, reason: `need at least ${TOKEN_MIN_DIGITS} digits` };
  if (!body.includes(SECRET_SEQ)) return { valid: false, reason: "missing-secret-seq" };
  return { valid: true };
}

/* ---------- .ZELA file create ---------- */
function createZelaFile(token) {
  const payload = `TOKEN:${token}\nISSUED:${new Date().toISOString()}\nNOTE: Redeem on the ZELA Verify page (local only)\n`;
  const blob = new Blob([payload], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = `ZELA-${Date.now()}.zela`;
  downloadLink.style.display = "inline-block";
  downloadLink.textContent = "Download Prize File (.zela)";
}

/* ---------- INIT ---------- */
function init() {
  loadSpins();
  resizeCanvas();
  // initial draw with rotation 0
  drawWheel(0);

  // attach UI
  spinBtn.addEventListener("click", async () => {
    ensureAudio();
    // some browsers require user gesture to unlock audio; calling resume when needed
    if (audioCtx && audioCtx.state === "suspended") try { await audioCtx.resume(); } catch (e) {}
    clickSound();
    spinOnce();
  });

  // allow pressing space to spin (optional)
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      spinBtn.click();
    }
  });

  // neat pointer pulsing
  setInterval(() => pointerEl.classList.toggle("neon-pulse"), 3000);
}

// small helper to fire confetti (ensure library is loaded)
function confettiSafe(opts) {
  try { confetti(opts); } catch (e) {}
}

// alias
function fireConfetti(){ confettiSafe({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); }

/* ---------- START ---------- */
init();

/* ---------- END ---------- */
