(() => {
  // ---- DOM ----
  const devSel  = document.getElementById("quiz-device");
  const strSel  = document.getElementById("quiz-string");
  const fretSel = document.getElementById("quiz-frets");
  const trainCb = document.getElementById("quiz-training");
  const startBtn= document.getElementById("quiz-start");
  const stopBtn = document.getElementById("quiz-stop");
  const targetEl= document.getElementById("quiz-target");
  const histEl  = document.getElementById("quiz-history");

  // ---- Constants ----
  const NOTE_NAMES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const NOTE_CLASS = (name) => {
    const map = {
      "C":0,"B#":0,
      "C#":1,"Db":1,
      "D":2,
      "D#":3,"Eb":3,
      "E":4,"Fb":4,
      "F":5,"E#":5,
      "F#":6,"Gb":6,
      "G":7,
      "G#":8,"Ab":8,
      "A":9,
      "A#":10,"Bb":10,
      "B":11,"Cb":11
    };
    return map[name];
  };

  // Standard tuning fundamentals (Hz)
  const STRING_FREQ = {
    "E": 82.4069,  // E2
    "A": 110.000,  // A2
    "D": 146.832,  // D3
    "G": 196.000,  // G3
    "B": 246.942,  // B3
    "e": 329.628   // E4
  };

  const TWO_PWR_1_12 = Math.pow(2, 1/12);

  // ---- State ----
  let audioCtx = null;
  let mediaStream = null;
  let analyser = null;
  let source = null;

  const BUF_LEN = 4096;                   // long buffer for low notes
  let buffer = new Float32Array(BUF_LEN);

  // Quiz state
  let running = false;
  let selectedDeviceId = null;
  let selectedString = "E";
  let maxFrets = 22;
  let trainingMode = false;

  // round control
  let pitchClassesOrder = [];   // shuffled 12 pitch classes [0..11]
  let curIdx = 0;               // index into pitchClassesOrder
  let currentClass = null;      // current target pitch class number
  let occurrences = [];         // fret numbers of current target on the string
  let hits = new Set();         // which frets have been confirmed
  let roundStart = 0;
  let classStart = 0;

  // timing stats
  let fastest = null; // {noteClass, ms}
  let slowest = null; // {noteClass, ms}

  // stability / gating
  let lastHz = null;
  let hzMedianBuf = [];
  const HZ_MEDIAN_N = 5;

  let stableSince = 0;
  let lastFret = null;
  let cooldownUntil = 0;

  // UI helpers
  function setTargetLabel() {
    const name = NOTE_NAMES_SHARP[currentClass];
    const need = occurrences.length;
    const got = hits.size;
    const remain = need - got;
    targetEl.textContent =
      `Target: ${name} on ${selectedString} string — ${got}/${need} found${trainingMode ? ` (frets: ${occurrences.join(", ")})` : ""}`;
  }

  // Utility
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function median(arr) {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a,b)=>a-b);
    const m = Math.floor(sorted.length/2);
    return sorted.length % 2 ? sorted[m] : 0.5*(sorted[m-1]+sorted[m]);
  }
  function rms(arr) {
    let s=0;
    for (let i=0;i<arr.length;i++){ const v=arr[i]; s+=v*v; }
    return Math.sqrt(s/arr.length);
  }

  // Fret helpers
  function freqOfFret(stringHz, fret) {
    return stringHz * Math.pow(2, fret/12);
  }
  function centsDiff(fMeasured, fRef) {
    return 1200 * Math.log2(fMeasured / fRef);
  }
  function classOfFret(stringHz, fret) {
    // Compute absolute MIDI-ish number referencing C = 0..11 not needed.
    // We just want pitch class of (open-string class + fret) % 12.
    // Derive open string class from frequency vs A4? Easier: compute nearest note name of open string:
    const openClass = hzToClass(stringHz);
    return (openClass + (fret % 12)) % 12;
  }
  function hzToClass(hz) {
    // Map a frequency to nearest pitch class 0..11 (C..B), not caring octave.
    const A4 = 440;
    const n = Math.round(12 * Math.log2(hz / A4)) + 57; // 57 = A4's semitone index if C=0
    return ((n % 12) + 12) % 12;
  }

  // Build occurrences for current target on selected string
  function buildOccurrences(pitchClass, stringHz, maxFret) {
    const out = [];
    const openClass = hzToClass(stringHz);
    for (let f = 0; f <= maxFret; f++) {
      if (((openClass + f) % 12) === pitchClass) out.push(f);
    }
    return out;
  }

  // ---- YIN-like detector (compact) ----
  function yinDetectHz(buf, sampleRate, minHz, maxHz) {
    // window and difference function
    const size = buf.length;
    const yin = new Float32Array(Math.floor(size/2));
    // difference
    for (let tau = 1; tau < yin.length; tau++) {
      let sum = 0;
      for (let i = 0; i < yin.length; i++) {
        const d = buf[i] - buf[i+tau];
        sum += d * d;
      }
      yin[tau] = sum;
    }
    // cumulative mean normalized difference
    let runningSum = 0;
    yin[0] = 1;
    for (let tau = 1; tau < yin.length; tau++) {
      runningSum += yin[tau];
      yin[tau] = yin[tau] * tau / (runningSum || 1);
    }

    // restrict tau range by min/max Hz
    const tauMin = Math.max(2, Math.floor(sampleRate / (maxHz || 1000)));
    const tauMax = Math.min(yin.length-1, Math.ceil(sampleRate / (minHz || 50)));

    const THRESH = 0.10; // fairly permissive
    let bestTau = -1;

    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (yin[tau] < THRESH) {
        // local minimum search: parabolic interpolation
        while (tau+1 < yin.length && yin[tau+1] < yin[tau]) tau++;
        bestTau = tau;
        break;
      }
    }
    if (bestTau === -1) {
      // take global min in range
      let minVal = Infinity;
      for (let tau = tauMin; tau <= tauMax; tau++) {
        if (yin[tau] < minVal) { minVal = yin[tau]; bestTau = tau; }
      }
    }
    if (bestTau <= 2) return null;

    // parabolic interpolation around bestTau
    const x0 = (bestTau < 1) ? bestTau : bestTau - 1;
    const x2 = (bestTau + 1 < yin.length) ? bestTau + 1 : bestTau;
    const s0 = yin[x0], s1 = yin[bestTau], s2 = yin[x2];
    const denom = (s0 - 2*s1 + s2);
    const shift = denom !== 0 ? (s0 - s2) / (2*denom) : 0;
    const tauRefined = bestTau + shift;

    const hz = sampleRate / tauRefined;
    if (!isFinite(hz) || hz <= 0) return null;
    return hz;
  }

  // Loop
  function loop() {
    if (!running) return;

    analyser.getFloatTimeDomainData(buffer);

    // simple Hann window to reduce leakage
    for (let i = 0; i < buffer.length; i++) {
      const w = 0.5 * (1 - Math.cos((2*Math.PI*i)/(buffer.length-1)));
      buffer[i] *= w;
    }

    const sampleRate = audioCtx.sampleRate;

    // amplitude gate
    const level = rms(buffer);
    const isLowString = (selectedString === "E" || selectedString === "A");
    const rmsGate = isLowString ? 0.015 : 0.010; // slightly higher gate for lows
    if (level < rmsGate) {
      // silence -> reset stability timers
      stableSince = 0;
      lastHz = null;
      hzMedianBuf.length = 0;
      requestAnimationFrame(loop);
      return;
    }

    // expected frequency range for this string & fret range
    const sHz = STRING_FREQ[selectedString];
    const fMin = 0;
    const fMax = maxFrets;
    const minFreq = freqOfFret(sHz, fMin) * 0.9;
    const maxFreq = freqOfFret(sHz, fMax) * 1.1;

    // detect
    const estHzRaw = yinDetectHz(buffer, sampleRate, minFreq, maxFreq);
    if (!estHzRaw) {
      requestAnimationFrame(loop);
      return;
    }

    // median smooth a bit
    hzMedianBuf.push(estHzRaw);
    if (hzMedianBuf.length > HZ_MEDIAN_N) hzMedianBuf.shift();
    const estHz = median(hzMedianBuf);

    lastHz = estHz;

    // map to nearest fret on this string
    const fretEst = Math.round(12 * Math.log2(estHz / sHz));
    if (fretEst < 0 || fretEst > maxFrets) {
      requestAnimationFrame(loop);
      return;
    }
    const refHz = freqOfFret(sHz, fretEst);
    const diff = centsDiff(estHz, refHz);

    const lowTolerance = 70;   // cents
    const highTolerance = 50;  // cents
    const tol = (estHz < 120) ? lowTolerance : highTolerance;

    const now = performance.now();

    // cooldown to avoid counting the same pluck twice
    if (now < cooldownUntil) {
      requestAnimationFrame(loop);
      return;
    }

    // check if this fret matches target class
    const thisClass = classOfFret(sHz, fretEst);
    const okPitch = Math.abs(diff) <= tol;
    const okTarget = (thisClass === currentClass);
    const sameFret = (fretEst === lastFret);

    if (okPitch && okTarget) {
      if (!stableSince || !sameFret) {
        stableSince = now;
        lastFret = fretEst;
      } else {
        const needStableMs = (estHz < 120) ? 90 : 120; // low notes confirm a bit quicker
        if (now - stableSince > needStableMs) {
          // Confirmed hit
          hits.add(fretEst);

          // Mark UI (optionally show frets only in training)
          if (trainingMode) {
            targetEl.textContent += ` ✓${fretEst}`;
          }

          // prevent immediate double-hit from harmonic drift
          cooldownUntil = now + 300;
          stableSince = 0;
          lastFret = null;

          // done with this class?
          if (hits.size >= occurrences.length) {
            const classEnd = performance.now();
            const ms = classEnd - classStart;

            // update fastest/slowest
            if (!fastest || ms < fastest.ms) fastest = { noteClass: currentClass, ms };
            if (!slowest || ms > slowest.ms) slowest = { noteClass: currentClass, ms };

            // log line
            const name = NOTE_NAMES_SHARP[currentClass];
            const occText = trainingMode ? ` (frets ${occurrences.join(", ")})` : "";
            const div = document.createElement("div");
            div.textContent = `✓ ${name}${occText} — ${ms.toFixed(0)} ms`;
            histEl.appendChild(div);

            // move to next
            advanceNote();
          } else {
            setTargetLabel(); // update progress x/needed
          }
        }
      }
    } else {
      // different fret or pitch drift -> reset stability
      stableSince = 0;
      lastFret = null;
    }

    requestAnimationFrame(loop);
  }

  function advanceNote() {
    curIdx++;
    if (curIdx >= pitchClassesOrder.length) {
      // round complete
      running = false;
      stopBtn.disabled = true;
      startBtn.disabled = false;

      const roundMs = performance.now() - roundStart;
      const fName = fastest ? NOTE_NAMES_SHARP[fastest.noteClass] : "—";
      const sName = slowest ? NOTE_NAMES_SHARP[slowest.noteClass] : "—";

      const summary = document.createElement("div");
      summary.style.marginTop = "8px";
      summary.style.padding = "8px";
      summary.style.borderTop = "1px solid #444";
      summary.innerHTML =
        `<strong>Round complete</strong><br>
         Total time: ${roundMs.toFixed(0)} ms<br>
         Fastest: ${fName} — ${fastest ? fastest.ms.toFixed(0) : "—"} ms<br>
         Slowest: ${sName} — ${slowest ? slowest.ms.toFixed(0) : "—"} ms`;
      histEl.appendChild(summary);

      targetEl.textContent = "—";
      teardownAudio();
      return;
    }

    currentClass = pitchClassesOrder[curIdx];
    hits.clear();
    classStart = performance.now();
    occurrences = buildOccurrences(currentClass, STRING_FREQ[selectedString], maxFrets);
    // If maxFrets < 12, some classes might appear once only; otherwise usually twice
    setTargetLabel();
  }

  // ---- Start/Stop ----
  async function startQuiz() {
    if (running) return;
    running = true;

    // read controls
    selectedString = strSel.value || "E";
    maxFrets = parseInt(fretSel.value || "22", 10);
    trainingMode = !!trainCb.checked;

    // reset UI
    histEl.innerHTML = "";
    targetEl.textContent = "—";

    // build order of 12 pitch classes, shuffled
    pitchClassesOrder = [...Array(12).keys()];
    for (let i = pitchClassesOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pitchClassesOrder[i], pitchClassesOrder[j]] = [pitchClassesOrder[j], pitchClassesOrder[i]];
    }
    curIdx = -1;
    fastest = null;
    slowest = null;

    // audio
    await setupAudio();
    roundStart = performance.now();
    advanceNote();

    startBtn.disabled = true;
    stopBtn.disabled = false;

    requestAnimationFrame(loop);
  }

  function stopQuiz() {
    if (!running) return;
    running = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    targetEl.textContent = "—";
    teardownAudio();
  }

  async function setupAudio() {
    // Enumerate devices on first run if empty
    if (devSel.options.length === 0) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      devices
        .filter(d => d.kind === "audioinput")
        .forEach(d => {
          const opt = document.createElement("option");
          opt.value = d.deviceId;
          opt.textContent = d.label || `Input ${devSel.length + 1}`;
          devSel.appendChild(opt);
        });
    }
    selectedDeviceId = devSel.value || undefined;

    const constraints = {
      audio: {
        deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        channelCount: 1,
        sampleRate: 44100,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    };
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaStreamSource(mediaStream);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = BUF_LEN * 2; // gives timeDomain buffer = BUF_LEN
    analyser.smoothingTimeConstant = 0.0;

    source.connect(analyser);
  }

  function teardownAudio() {
    if (source) { try { source.disconnect(); } catch(e){} }
    if (analyser) { try { analyser.disconnect(); } catch(e){} }
    if (audioCtx) { try { audioCtx.close(); } catch(e){} }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
    }
    source = null;
    analyser = null;
    audioCtx = null;
    mediaStream = null;

    // reset stability
    stableSince = 0;
    lastFret = null;
    cooldownUntil = 0;
    hzMedianBuf.length = 0;
  }

  // ---- Events ----
  startBtn.addEventListener("click", startQuiz);
  stopBtn.addEventListener("click", stopQuiz);

  // First time: populate devices (label appears after permission once)
  (async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const inputs = devs.filter(d => d.kind === "audioinput");
      devSel.innerHTML = "";
      inputs.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.deviceId;
        opt.textContent = d.label || `Input ${devSel.length + 1}`;
        devSel.appendChild(opt);
      });
    } catch (e) {
      // ignore; will populate after permission
    }
  })();
})();
