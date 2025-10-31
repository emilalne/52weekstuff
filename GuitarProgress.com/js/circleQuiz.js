(function() {
  const KEYS = [
    { name: "C", sharps: 0, flats: 0, relMinor: "A" },
    { name: "G", sharps: 1, flats: 0, relMinor: "E" },
    { name: "D", sharps: 2, flats: 0, relMinor: "B" },
    { name: "A", sharps: 3, flats: 0, relMinor: "F#" },
    { name: "E", sharps: 4, flats: 0, relMinor: "C#" },
    { name: "B", sharps: 5, flats: 0, relMinor: "G#" },
    { name: "F#", sharps: 6, flats: 0, relMinor: "D#" },
    { name: "C#", sharps: 7, flats: 0, relMinor: "A#" },
    { name: "F", sharps: 0, flats: 1, relMinor: "D" },
    { name: "Bb", sharps: 0, flats: 2, relMinor: "G" },
    { name: "Eb", sharps: 0, flats: 3, relMinor: "C" },
    { name: "Ab", sharps: 0, flats: 4, relMinor: "F" },
    { name: "Db", sharps: 0, flats: 5, relMinor: "Bb" },
    { name: "Gb", sharps: 0, flats: 6, relMinor: "Eb" },
    { name: "Cb", sharps: 0, flats: 7, relMinor: "Ab" },
  ];

  const questionEl = document.getElementById("circle-question");
  const optionsEl = document.getElementById("circle-options");
  const feedbackEl = document.getElementById("circle-feedback");
  const nextBtn = document.getElementById("circle-next");

  let currentAnswer = null;

  function newQuestion() {
    feedbackEl.textContent = "";
    optionsEl.innerHTML = "";

    const qType = Math.floor(Math.random() * 3); // 0=sharps/flats, 1=relative minor, 2=relative major
    let question = "";
    let answer = "";

    const key = KEYS[Math.floor(Math.random() * KEYS.length)];

    if (qType === 0) {
      if (key.sharps > 0) {
        question = `Which major key has ${key.sharps} sharps?`;
        answer = key.name + " major";
      } else if (key.flats > 0) {
        question = `Which major key has ${key.flats} flats?`;
        answer = key.name + " major";
      } else {
        question = `Which major key has no sharps or flats?`;
        answer = "C major";
      }
    } else if (qType === 1) {
      question = `What is the relative minor of ${key.name} major?`;
      answer = key.relMinor + " minor";
    } else {
      question = `What is the relative major of ${key.relMinor} minor?`;
      answer = key.name + " major";
    }

    questionEl.textContent = question;
    currentAnswer = answer;

    // Generate options
    const opts = new Set([answer]);
    while (opts.size < 4) {
      const randomKey = KEYS[Math.floor(Math.random() * KEYS.length)];
      let opt = "";

      if (qType === 1) {
        opt = randomKey.relMinor + " minor"; // distractors in minor
      } else {
        opt = randomKey.name + " major"; // distractors in major
      }
      opts.add(opt);
    }

    [...opts].sort(() => Math.random() - 0.5).forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.addEventListener("click", () => checkAnswer(opt));
      optionsEl.appendChild(btn);
    });
  }

  function checkAnswer(choice) {
    if (choice === currentAnswer) {
      feedbackEl.textContent = "✅ Correct!";
      feedbackEl.className = "correct";
    } else {
      feedbackEl.textContent = `❌ Nope! The correct answer was ${currentAnswer}`;
      feedbackEl.className = "wrong";
    }
  }

  nextBtn.addEventListener("click", newQuestion);

  window.CircleQuiz = { newQuestion };
})();
