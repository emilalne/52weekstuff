
  console.log("Starting loading scripts...");

// Main app namespace
const GuitarApp = {
    fretboard: {},
    metronome: {},
    timer: {},
    auth: {},
    todo: {},
    exercises: {},
    routines: {},
    progressionAnalyzer: {}
  };
  
  

  /* -------------------------
     FRETBOARD MODULE
  ------------------------- */
  GuitarApp.fretboard = (function() {
    const tuning = ["E", "B", "G", "D", "A", "E"];
    const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const frets = 12;
  
    const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  // For nicer display, you could later map C# -> C#/Db, etc.
  const SCALE_PATTERNS = {
    major:        [0, 2, 4, 5, 7, 9, 11],
    minor:        [0, 2, 3, 5, 7, 8, 10],
    "major-pentatonic": [0, 2, 4, 7, 9],
    "minor-pentatonic": [0, 3, 5, 7, 10],
    dorian:       [0, 2, 3, 5, 7, 9, 10],
    phrygian:     [0, 1, 3, 5, 7, 8, 10],
    lydian:       [0, 2, 4, 6, 7, 9, 11], 
    locrian:      [0, 1, 3, 5, 6, 8, 10],
    mixolydian:   [0, 2, 4, 5, 7, 9, 10],
    blues:        [0, 3, 5, 6, 7, 10] // classic minor blues
  };

  // Helper: rotate NOTES array from given root
  function buildScale(root, type) {
    const rootIndex = NOTES.indexOf(root);
    if (rootIndex === -1) throw new Error(`Unknown root: ${root}`);
    return SCALE_PATTERNS[type].map(semi => NOTES[(rootIndex + semi) % 12]);
  }

    const scales = {};
    NOTES.forEach(root => {
      Object.keys(SCALE_PATTERNS).forEach(type => {
        const key = `${root}-${type}`;
        scales[key] = {
          root,
          type,
          notes: buildScale(root, type)
        };
      });
    });

    function buildFretboard() {
      const fretboardEl = document.getElementById("fretboard");
      fretboardEl.innerHTML = "";
      tuning.forEach(openNote => {
        const stringEl = document.createElement("div");
        stringEl.classList.add("string");
        let noteIndex = notes.indexOf(openNote);
        for (let fret=0; fret<=frets; fret++) {
          const fretEl = document.createElement("div");
          fretEl.classList.add("fret");
          let note = notes[(noteIndex + fret) % 12];
          fretEl.dataset.note = note;
          if (markerFrets.includes(fret)) {
            fretEl.classList.add("highlight");
          }
          stringEl.appendChild(fretEl);
        }
        fretboardEl.appendChild(stringEl);
      });
    }

    const markerFrets = [3,5,7,9,12];

    function buildFretNumbers() {
      const fretNums = document.getElementById("fret-numbers");
      fretNums.innerHTML = "";
      const openCol = document.createElement("div");
      openCol.textContent = "Open";
      fretNums.appendChild(openCol);

      for (let i = 1; i <= frets; i++) {
        const num = document.createElement("div");
        num.classList.add("fret-num");
        if (markerFrets.includes(i)) num.classList.add("highlight");
        num.textContent = i;
        fretNums.appendChild(num);
      }
    }

  
    function highlightScale(scaleKey) {
      const { root, notes: scaleNotes } = scales[scaleKey];
      document.querySelectorAll(".fret").forEach(fretEl => {
        fretEl.innerHTML = "";
        let note = fretEl.dataset.note;
        const dot = document.createElement("div");
        dot.classList.add("note");
        dot.textContent = note;
        if (note === root) dot.classList.add("root");
        else if (scaleNotes.includes(note)) dot.classList.add("scale");
        else dot.classList.add("dim");
        fretEl.appendChild(dot);
      });
    }
  
    function init() {
      buildFretboard();
      buildFretNumbers();
      const rootSelect = document.getElementById("root-select");
      const typeSelect = document.getElementById("scale-type");

      function updateScale() {
        const root = rootSelect.value;
        const type = typeSelect.value;
        const scaleKey = `${root}-${type}`;
        highlightScale(scaleKey); // or whatever your highlight function is
      }

      rootSelect.addEventListener("change", updateScale);
      typeSelect.addEventListener("change", updateScale);

      updateScale();
    }
  
    return { init, highlightScale };
  })();
  

  
  /* -------------------------
     TIMER MODULE
  ------------------------- */
  GuitarApp.timer = (function() {
    const display = document.getElementById("stopwatch-display");
    const startBtn = document.getElementById("start-btn");
    const stopBtn = document.getElementById("stop-btn");
    const resetBtn = document.getElementById("reset-btn");
    let intervalId = null, startTime = null, elapsed = 0;
  
    function formatTime(ms) {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const milliseconds = Math.floor((ms % 1000) / 10);
      return [minutes, seconds, milliseconds].map(n => String(n).padStart(2,"0")).join(":");
    }
  
    function updateDisplay() {
      const now = Date.now();
      display.textContent = formatTime(now - startTime + elapsed);
    }
  
    function start() {
      if (!intervalId) {
        startTime = Date.now();
        intervalId = setInterval(updateDisplay, 100);
      }
    }
  
    function stop() {
      if (intervalId) {
        elapsed += Date.now() - startTime;
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  
    function reset() {
      stop();
      elapsed = 0;
      display.textContent = "00:00:00";
    }
  
    function init() {
      startBtn.addEventListener("click", start);
      stopBtn.addEventListener("click", stop);
      resetBtn.addEventListener("click", reset);
    }
  
    return { init, start, stop, reset};
  })();
  
  
document.querySelectorAll(".menu-header").forEach(header => {
  header.addEventListener("click", () => {
    header.classList.toggle("open");
    const bar = header.nextElementSibling;
    bar.classList.toggle("open");
  });
});

(function() {
  let countdown;
  let endTime;
  let running = false;

  const startBtn = document.getElementById("start-timer");
  const minutesInput = document.getElementById("timer-minutes");
  const display = document.getElementById("timer-display");

  function updateDisplay() {
    const remaining = Math.max(0, endTime - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    display.textContent = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;

    if (remaining <= 0) {
      stopTimer();
      beepAlarm();
    }
  }

  function beepAlarm() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 6; i++) { // 6 beeps 
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.value = 810; // pitch
      gain.gain.value = 0.5;     // lower volume

      const startTime = ctx.currentTime + i * 0.4;
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    }
  }

  function startTimer(seconds = 0) {
    if(seconds == 0)
      var mins = parseInt(minutesInput.value, 10);
    else { 
      minutesInput.value = seconds;
      var mins = parseInt(seconds, 10);
    }

    if (isNaN(mins) || mins <= 0) return;

    endTime = Date.now() + mins * 60000;
    updateDisplay();
    countdown = setInterval(updateDisplay, 1000);
    running = true;

    // UI changes
    minutesInput.disabled = true;
    startBtn.textContent = "Stop";
    startBtn.style.background = "#dc3545"; // red stop button
  }

  function stopTimer() {
    clearInterval(countdown);
    countdown = null;
    running = false;

    // UI reset
    minutesInput.disabled = false;
    startBtn.textContent = "Start";
    startBtn.style.background = "#4caf50"; // green start button
  }

  startBtn.addEventListener("click", () => {
    if (running) {
      stopTimer();
    } else {
      startTimer();
    }
  });

    // 🔥 Expose to GuitarApp
  GuitarApp.timer.startCountdown = startTimer;
  GuitarApp.timer.stopCountdown = stopTimer;

})();




(function() {
  const quickBpm = document.getElementById("quick-bpm");
  const quickBpmDisplay = document.getElementById("quick-bpm-display");
  const quickToggle = document.getElementById("quick-metronome-toggle");
  let running = false;

  // Update BPM from quick slider
  quickBpm.addEventListener("input", () => {
    const value = parseInt(quickBpm.value);
    quickBpmDisplay.textContent = value;
    GuitarApp.metronome.setBpm(value);
  });

  // Sync quick slider with main metronome slider
  const mainBpmSlider = document.getElementById("bpm-slider");
  if (mainBpmSlider) {
    mainBpmSlider.addEventListener("input", () => {
      const value = parseInt(mainBpmSlider.value);
      quickBpm.value = value;
      quickBpmDisplay.textContent = value;
    });
  }

  // Start/stop toggle
  quickToggle.addEventListener("click", () => {

    if (!GuitarApp.metronome.isRunningFunc()) {
      GuitarApp.metronome.startMetronome(parseInt(quickBpm.value));
      quickToggle.textContent = "Stop";
    } else {
      GuitarApp.metronome.stop();
      quickToggle.textContent = "Start";
    }
  });
})();

