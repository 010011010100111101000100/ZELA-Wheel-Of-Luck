// ------------------
// Daily Spins Storage
// ------------------

const MAX_SPINS = 5;
const spinsKey = "zela_spins_left";
const resetKey = "zela_daily_reset";

function loadDailySpins() {
    let today = new Date().toDateString();
    let storedDate = localStorage.getItem(resetKey);

    if (storedDate !== today) {
        localStorage.setItem(resetKey, today);
        localStorage.setItem(spinsKey, MAX_SPINS);
    }

    return Number(localStorage.getItem(spinsKey) || MAX_SPINS);
}

function saveSpins(value) {
    localStorage.setItem(spinsKey, value);
}

let spinsLeft = loadDailySpins();

document.getElementById("spins-left").innerText = "Spins left today: " + spinsLeft;


// ------------------
// Wheel Setup
// ------------------

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let totalSegments = 100;
let anglePerSegment = (2 * Math.PI) / totalSegments;

let segments = [];

for (let i = 0; i < totalSegments; i++) {
    if (i === 0) {
        segments.push("gold");      // GRAND PRIZE
    } else if (i <= 10) {
        segments.push("purple");    // +5 spins
    } else {
        segments.push("grey");      // Try again
    }
}

function drawWheel(rotation = 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < totalSegments; i++) {
        ctx.beginPath();
        ctx.moveTo(250, 250);
        ctx.arc(250, 250, 250, anglePerSegment * i + rotation, anglePerSegment * (i+1) + rotation);

        if (segments[i] === "gold") ctx.fillStyle = "#ffd700";
        else if (segments[i] === "purple") ctx.fillStyle = "#b600ff";
        else ctx.fillStyle = "#444";

        ctx.fill();
    }
}

drawWheel(0);


// ------------------
// Spin Logic
// ------------------

let spinning = false;
let currentRotation = 0;

const clickSfx = document.getElementById("sound-click");
const spinSfx = document.getElementById("sound-spin");
const winSfx = document.getElementById("sound-win");

document.getElementById("spin-btn").addEventListener("click", () => {
    if (spinning) return;
    if (spinsLeft <= 0) {
        alert("No spins left today.");
        return;
    }

    clickSfx.play();

    spinsLeft--;
    saveSpins(spinsLeft);
    document.getElementById("spins-left").innerText = "Spins left today: " + spinsLeft;

    startSpin();
});

function startSpin() {
    spinning = true;

    let spinPower = Math.random() * 5 + 8; // strong spin
    let spinDecay = 0.01;

    spinSfx.play();

    function animate() {
        currentRotation += spinPower;
        spinPower -= spinDecay;

        drawWheel(currentRotation / 30);

        if (spinPower > 0) {
            requestAnimationFrame(animate);
        } else {
            spinning = false;
            determinePrize();
        }
    }

    animate();
}

function determinePrize() {
    let pointerAngle = (Math.PI * 1.5); // bottom center

    let normalized = (pointerAngle - (currentRotation / 30)) % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;

    let index = Math.floor(normalized / anglePerSegment);

    let result = segments[index];

    if (result === "gold") {
        winSfx.play();
        giveGrandPrize();
    }
    else if (result === "purple") {
        winSfx.play();
        spinsLeft += 5;
        saveSpins(spinsLeft);
        document.getElementById("spins-left").innerText = "Spins left today: " + spinsLeft;
        alert("You won +5 spins!");
    }
    else {
        alert("Try again!");
    }
}

function giveGrandPrize() {
    const code = "01111001 01101111 01110101 00100000 01101000 01100001 01110110 01100101 00100000 01110111 01101111 01101110 00100000 01100001 00100000 01100110 01110010 01100101 01100101 00100000 01110000 01101000 01101111 01110100 01101111";

    let blob = new Blob([code], {type: "text/plain"});
    let url = URL.createObjectURL(blob);

    let a = document.getElementById("download-prize");
    a.href = url;
    a.download = "ZELA_Prize_Code.txt";
    a.style.display = "inline-block";

    alert("🎉 GRAND PRIZE! Download your prize code.");
}
