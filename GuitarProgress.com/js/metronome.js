
 /* -------------------------
   METRONOME MODULE
------------------------- */
GuitarApp.metronome = (function() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let bpm = 120, isRunning = false;
    let nextNoteTime = 0.0, currentBeat = 0;
    let beatsPerBar = 4;
    let timerID, lookahead = 25, scheduleAheadTime = 0.1;
    let metronomeVolume = 0.5;
  
    // UI elements
    const bpmSlider = document.getElementById("bpm-slider");
    const bpmDisplay = document.getElementById("bpm-display");
    const volumeSlider = document.getElementById("volume-slider");
    const timeSignature = document.getElementById("time-signature");
    const useDrumToggle = document.getElementById("use-drum-toggle");
    const metronomeToggle = document.getElementById("metronome-toggle");
  
    function isRunningFunc() { return isRunning; }

    /* ---- SOUND GENERATORS ---- */
    function playKick(time) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.3);
      gain.gain.setValueAtTime(metronomeVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + 0.3);
    }
  
    function playSnare(time) {
      const bufferSize = audioCtx.sampleRate * 0.2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(metronomeVolume * 0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      noise.connect(gain).connect(audioCtx.destination);
      noise.start(time);
      noise.stop(time + 0.2);
    }
  
    function playHiHat(time) {
      const bufferSize = audioCtx.sampleRate * 0.05;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(7000, time);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(metronomeVolume * 0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      noise.connect(filter).connect(gain).connect(audioCtx.destination);
      noise.start(time);
      noise.stop(time + 0.05);
    }
  
    /* ---- DRUM PATTERN ---- */
    const drumPattern = [
      { beat: 0, sounds: ["kick", "hi-hat"] },
      { beat: 1, sounds: ["hi-hat"] },
      { beat: 2, sounds: ["snare", "hi-hat"] },
      { beat: 3, sounds: ["hi-hat"] }
    ];
  
    function playDrumsForBeat(beatIndex, time) {
      const beatEvent = drumPattern[beatIndex % drumPattern.length];
      beatEvent.sounds.forEach(sound => {
        if (sound === "kick") playKick(time);
        if (sound === "snare") playSnare(time);
        if (sound === "hi-hat") playHiHat(time);
      });
    }
  
    /* ---- SIMPLE CLICK (fallback) ---- */
    function playClick(time, isAccent=false) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(isAccent ? 600 : 300, time);
      gain.gain.setValueAtTime(isAccent ? metronomeVolume : metronomeVolume * 0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + 0.2);
  
      // Visual pulse
      setTimeout(() => {
        const vis = document.getElementById("metronome-visual");
        vis.style.opacity = 1;
        vis.style.backgroundColor = isAccent ? "red" : "black";
        setTimeout(() => vis.style.opacity = 0, 100);
      }, (time - audioCtx.currentTime) * 1000);
    }
  
    /* ---- SCHEDULER ---- */
    function nextNote() {
      const secondsPerBeat = 60.0 / bpm;
      nextNoteTime += secondsPerBeat;
    }
  
    function scheduler() {
      while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        const isAccent = (currentBeat % beatsPerBar === 0);
        if (useDrumToggle.checked) {
          playDrumsForBeat(currentBeat, nextNoteTime);
        } else {
          playClick(nextNoteTime, isAccent);
        }
        nextNote();
        currentBeat = (currentBeat + 1) % beatsPerBar;
      }
      timerID = setTimeout(scheduler, lookahead);
    }
  
    /* ---- CONTROL ---- */
    function start() {
      const quickToggle = document.getElementById("quick-metronome-toggle");
      if (!isRunning) {
        nextNoteTime = audioCtx.currentTime + 0.05;
        scheduler();
        isRunning = true;
        metronomeToggle.textContent = "Stop Metronome";
        quickToggle.textContent = "Stop";
      }
    }
  
    function stop() {
      const quickToggle = document.getElementById("quick-metronome-toggle");
      if (isRunning) {
        clearTimeout(timerID);
        isRunning = false;
        metronomeToggle.textContent = "Start Metronome";
        quickToggle.textContent = "Start";
      }
    }
  
    /* ---- INIT ---- */
    function init() {
      bpmSlider.addEventListener("input", () => {
        bpm = parseInt(bpmSlider.value);
        bpmDisplay.textContent = `BPM: ${bpm}`;
      });
      volumeSlider.addEventListener("input", e => {
        metronomeVolume = e.target.value / 100;
      });
      timeSignature.addEventListener("change", e => {
        beatsPerBar = parseInt(e.target.value);
        currentBeat = 0;
      });
      metronomeToggle.addEventListener("click", () => {
        isRunning ? stop() : start();
      });
    }
  
    function startMetronome(customBpm) {
      if (customBpm) {
        bpm = customBpm;
        if (bpmSlider) bpmSlider.value = bpm;
        if (bpmDisplay) bpmDisplay.textContent = `BPM: ${bpm}`;
      }
      start();
    }

    function setBpm(newBpm) {
      bpm = newBpm;
      const quickBpm = document.getElementById("quick-bpm");
      const quickBpmDisplay = document.getElementById("quick-bpm-display");
      quickBpm.value = newBpm;
      quickBpmDisplay.textContent = newBpm;

      if (bpmSlider) bpmSlider.value = bpm;
      if (bpmDisplay) bpmDisplay.textContent = `BPM: ${bpm}`;
    }

return { init, start, stop, startMetronome, setBpm, isRunningFunc };

  })();