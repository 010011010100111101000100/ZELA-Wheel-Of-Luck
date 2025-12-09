const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const statusTxt = document.getElementById("status");
const downloadBox = document.getElementById("downloadBox");
const downloadBtn = document.getElementById("downloadBtn");

const SEGMENTS = 100;
const ANGLE = 360 / SEGMENTS;
const EXTRA_COUNT = 10;
const DAILY_SPINS = 5;
const STORAGE_KEY = "zelaWheelData";

const GRAND_BINARY =
"01111001 01101111 01110101 00100000 01101000 01100001 01110110 01100101 00100000 01110111 01101111 01101110 00100000 01100001 00100000 01100110 01110010 01100101 01100101 00100000 01110000 01101000 01101111 01110100 01101111";

let spinning = false;
let rotation = 0;

// Load spins from storage
function loadSpins() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const today = new Date().toDateString();

  if (stored) {
    const data = JSON.parse(stored);
    if (data.date === today) return data.spins;
  }

  // reset if new day / no storage
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, spins: DAILY_SPINS }));
  return DAILY_SPINS;
}

let spinsLeft = loadSpins();

// Save spins
function saveSpins(n) {
  const today = new Date().toDateString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, spins: n }));
}

let segments = [];
let grandIndex = Math.floor(Math.random() * SEGMENTS);

// Pick 10 random extra-spin segments
let available = Array.from({ length: SEGMENTS }, (_, i) => i).filter(i => i !== grandIndex);
available.sort(() => Math.random() - 0.5);
let extraIndices = available.slice(0, EXTRA_COUNT);

for (let i = 0; i < SEGMENTS; i++) {
  if (i === grandIndex) segments[i] = "GRAND";
  else if (extraIndices.includes(i)) segments[i] = "EXTRA";
  else segments[i] = "LOSE";
}

function drawWheel() {
  const cx = 250, cy = 250, radius = 240;

  ctx.clearRect(0, 0, 500, 500);

  for (let i = 0; i < SEGMENTS; i++) {
    const start = (i * ANGLE - 90) * Math.PI / 180;
    const end = ((i + 1) * ANGLE - 90) * Math.PI / 180;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();

    if (segments[i] === "GRAND") {
      const g = ctx.createLinearGradient(0, 0, 500, 500);
      g.addColorStop(0, "#fff2cc");
      g.addColorStop(1, "#f59e0b");
      ctx.fillStyle = g;

    } else if (segments[i] === "EXTRA") {
      const g = ctx.createLinearGradient(0, 0, 500, 500);
      g.addColorStop(0, "#c4b5fd");
      g.addColorStop(1, "#7c3aed");
      ctx.fillStyle = g;

    } else {
      ctx.fillStyle = "#4b5563";
    }

    ctx.fill();
  }
}
drawWheel();

// Compute where the wheel stops
function computeRotationForIndex(i) {
  const segmentCenter = -90 + (i + 0.5) * ANGLE;
  const target = 90 - segmentCenter;

  const fullTurns = 8 * 360;
  return fullTurns + target + (Math.random() * 2 - 1) * (ANGLE / 3);
}

spinBtn.onclick = spin;

function spin() {
  if (spinning) return;
  if (spinsLeft <= 0) {
    statusTxt.textContent = "No spins left!";
    return;
  }

  spinning = true;
  downloadBox.classList.add("hidden");
  statusTxt.textContent = "";

  // decrement spins
  spinsLeft--;
  saveSpins(spinsLeft);

  const roll = Math.floor(Math.random() * 100);

  let type = "LOSE";
  if (roll === 0) type = "GRAND";
  else if (roll <= EXTRA_COUNT) type = "EXTRA";

  let index;
  if (type === "GRAND") index = grandIndex;
  else if (type === "EXTRA")
    index = extraIndices[Math.floor(Math.random() * extraIndices.length)];
  else {
    let loses = segments.map((t, i) => (t === "LOSE" ? i : null)).filter(i => i !== null);
    index = loses[Math.floor(Math.random() * loses.length)];
  }

  const targetRotation = computeRotationForIndex(index);
  animateSpin(targetRotation, type);
}

function animateSpin(target, type) {
  let start = rotation;
  let change = target - start;
  let duration = 4200;
  let startTime = performance.now();

  function animate(now) {
    let t = (now - startTime) / duration;
    if (t > 1) t = 1;

    // easeOutCubic
    let eased = 1 - Math.pow(1 - t, 3);

    rotation = start + change * eased;
    canvas.style.transform = `rotate(${rotation}deg)`;

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      finishSpin(type);
    }
  }
  requestAnimationFrame(animate);
}

function finishSpin(type) {
  spinning = false;

  if (type === "LOSE") {
    statusTxt.textContent = "Try again!";
  }

  else if (type === "EXTRA") {
    spinsLeft += 5;
    saveSpins(spinsLeft);
    statusTxt.textContent = "+5 spins bonus!";
  }

  else if (type === "GRAND") {
    statusTxt.textContent = "🎉 GRAND PRIZE! 🎉";
    downloadBox.classList.remove("hidden");
  }
}

downloadBtn.onclick = function () {
  const blob = new Blob([GRAND_BINARY], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "ZELA_PRIZE_TICKET.txt";
  a.click();

  URL.revokeObjectURL(url);
};
