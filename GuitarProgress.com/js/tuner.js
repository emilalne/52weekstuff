let audioCtx, analyser, sourceNode, rafId;
let buffer = new Float32Array(2048);
let running = false;
let smoothedHz = null;
let lastValidHz = null;
let lastNoteTime = 0;

// Standard tuning: E A D G B E
const STRINGS = [
  { name: "E", freq: 82.41 },  // E2
  { name: "A", freq: 110.00 }, // A2
  { name: "D", freq: 146.83 }, // D3
  { name: "G", freq: 196.00 }, // G3
  { name: "B", freq: 246.94 }, // B3
  { name: "E", freq: 329.63 }, // E4
];

// --- Pitch detection ---
function autoCorrelate(buf, sampleRate) {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) return null; // too quiet → ignore

  let c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] += buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;
  if (T0 <= 0) return null;

  return sampleRate / T0;
}

function centsOff(freq, ref) {
  return 1200 * Math.log2(freq / ref);
}

function closestString(freq) {
  if (!freq) return null;
  let closest = STRINGS.reduce((prev, cur) =>
    Math.abs(cur.freq - freq) < Math.abs(prev.freq - freq) ? cur : prev
  );
  return {
    name: closest.name,
    freq: closest.freq,
    cents: centsOff(freq, closest.freq)
  };
}

function smoothPitch(prev, next, alpha = 0.2) {
  if (!prev || !isFinite(prev)) return next;
  return prev + alpha * (next - prev);
}

// --- Draw needle ---
function drawNeedle(cents) {
  const needle = document.getElementById("tuner-needle");
  if (!needle) return;

  if (cents === null || !isFinite(cents)) {
    needle.style.left = "50%";
    needle.style.background = "gray";
    return;
  }

  let clamped = Math.max(-100, Math.min(100, cents));
  let pos = 50 + (clamped / 2); // -100 → 0%, 0 → 50%, +100 → 100%

  needle.style.left = pos + "%";
  needle.style.background = Math.abs(cents) < 5 ? "lime" : "orange";
}

// --- Update loop ---
function updateTuner(rawHz) {
  const freqEl  = document.getElementById("tuner-freq");
  const noteEl  = document.getElementById("tuner-note");
  const centsEl = document.getElementById("tuner-cents");

  if (!rawHz || !isFinite(rawHz)) {
    // too quiet → reset display
    smoothedHz = null;
    if (freqEl) freqEl.textContent = "—";
    if (noteEl) noteEl.textContent = "—";
    if (centsEl) centsEl.textContent = "—";
    drawNeedle(null);
    return;
  }

  smoothedHz = smoothPitch(smoothedHz, rawHz, 0.2);

  if (freqEl) freqEl.textContent = smoothedHz.toFixed(2);

  const cs = closestString(smoothedHz);
  if (!cs) return;

  // Ignore the first 400ms of a new note to avoid "jump"
  const now = performance.now();
  if (!lastValidHz || Math.abs(smoothedHz - lastValidHz) > 20) {
    lastNoteTime = now;
  }
  lastValidHz = smoothedHz;

  if (now - lastNoteTime < 400) {
    if (noteEl)  noteEl.textContent = cs.name;
    if (centsEl) centsEl.textContent = "—";
    drawNeedle(null);
    return;
  }

  if (noteEl)  noteEl.textContent = cs.name;
  if (centsEl) centsEl.textContent = cs.cents.toFixed(1);
  drawNeedle(cs.cents);
}

// --- Pitch loop ---
function updatePitch() {
  analyser.getFloatTimeDomainData(buffer);
  let pitch = autoCorrelate(buffer, audioCtx.sampleRate);
  updateTuner(pitch);
  if (running) rafId = requestAnimationFrame(updatePitch);
}

// --- Devices ---
async function initDevices() {
  const select = document.getElementById("tuner-device");
  if (!select) return;

  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter(d => d.kind === "audioinput");

  select.innerHTML = "";
  inputs.forEach((d, i) => {
    let opt = document.createElement("option");
    opt.value = d.deviceId;
    opt.textContent = d.label || `Input ${i+1}`;
    select.appendChild(opt);
  });
}

async function startTuner() {
  const select = document.getElementById("tuner-device");
  const deviceId = select?.value || undefined;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
  sourceNode = audioCtx.createMediaStreamSource(stream);
  sourceNode.connect(analyser);

  running = true;
  updatePitch();

  document.getElementById("tuner-start").disabled = true;
  document.getElementById("tuner-stop").disabled = false;
}

function stopTuner() {
  running = false;
  cancelAnimationFrame(rafId);
  if (sourceNode) sourceNode.disconnect();
  if (audioCtx) audioCtx.close();
  document.getElementById("tuner-start").disabled = false;
  document.getElementById("tuner-stop").disabled = true;
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  initDevices();
  document.getElementById("tuner-start")?.addEventListener("click", startTuner);
  document.getElementById("tuner-stop")?.addEventListener("click", stopTuner);
});
