(function () {
  // -----------------------------
  // Tone.js synth setup
  // -----------------------------
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 1.2 }
  }).toDestination();

  // -----------------------------
  // Interval definitions
  // -----------------------------
  const intervals = {
    "Minor 2nd": 1,
    "Major 2nd": 2,
    "Minor 3rd": 3,
    "Major 3rd": 4,
    "Perfect 4th": 5,
    "Tritone": 6,
    "Perfect 5th": 7,
    "Minor 6th": 8,
    "Major 6th": 9,
    "Minor 7th": 10,
    "Major 7th": 11,
    "Octave": 12
  };

  let currentAnswer = null;

  // -----------------------------
  // Play interval
  // -----------------------------
  function playInterval(rootNote, semitones, mode = "asc") {
    const now = Tone.now();
    const rootMidi = Tone.Frequency(rootNote).toMidi();
    const secondNote = Tone.Frequency(rootMidi + semitones, "midi").toNote();

    if (mode === "asc") {
      synth.triggerAttackRelease(rootNote, "1n", now);
      synth.triggerAttackRelease(secondNote, "1n", now + 1);
    } else if (mode === "desc") {
      synth.triggerAttackRelease(secondNote, "1n", now);
      synth.triggerAttackRelease(rootNote, "1n", now + 1);
    } else if (mode === "harm") {
      synth.triggerAttack([rootNote, secondNote], now);
      synth.triggerRelease([rootNote, secondNote], now + 2);
    }
  }

  // -----------------------------
  // Quiz Logic
  // -----------------------------
  function playRandomInterval() {
    const names = Object.keys(intervals);
    const randomName = names[Math.floor(Math.random() * names.length)];
    currentAnswer = randomName;
    const semitones = intervals[randomName];
    const mode = document.getElementById("interval-mode").value;

    playInterval("C4", semitones, mode);

    renderOptions(names, randomName);
  }

  function renderOptions(allNames, correct) {
    const container = document.getElementById("interval-options");
    container.innerHTML = "";

    // Shuffle and pick 4 options including the correct one
    let options = [correct];
    while (options.length < 4) {
      const random = allNames[Math.floor(Math.random() * allNames.length)];
      if (!options.includes(random)) options.push(random);
    }
    options = options.sort(() => Math.random() - 0.5);

    options.forEach(name => {
      const btn = document.createElement("button");
      btn.textContent = name;
      btn.addEventListener("click", () => {
        checkAnswer(name);
      });
      container.appendChild(btn);
    });
  }

  function checkAnswer(choice) {
    const feedback = document.getElementById("interval-feedback");
    if (choice === currentAnswer) {
      feedback.textContent = `✅ Correct! It was ${currentAnswer}`;
    } else {
      feedback.textContent = `❌ Nope! It was ${currentAnswer}`;
    }
  }

  // -----------------------------
  // UI wiring
  // -----------------------------
  function init() {
    // Controlled ear training
    const intervalSelect = document.getElementById("interval-select");
    const modeSelect = document.getElementById("mode-select");
    const playBtn = document.getElementById("play-interval");

    for (let name in intervals) {
      const opt = document.createElement("option");
      opt.value = intervals[name];
      opt.textContent = name;
      intervalSelect.appendChild(opt);
    }

    playBtn.addEventListener("click", async () => {
      await Tone.start();
      const semitones = parseInt(intervalSelect.value);
      const mode = modeSelect.value;
      playInterval("C4", semitones, mode);
    });

    // Quiz module
    document
      .getElementById("play-random-interval")
      .addEventListener("click", async () => {
        await Tone.start();
        playRandomInterval();
      });
  }

  window.EarTraining = { init };
})();
