window.GuitarApp = window.GuitarApp || {};

GuitarApp.progressionAnalyzer = (function() {

  // --- Major and Minor Key Dictionaries ---
  const KEYS = {
    // Major keys
    "C":   ["C", "Dm", "Em", "F", "G", "Am", "Bdim"],
    "G":   ["G", "Am", "Bm", "C", "D", "Em", "F#dim"],
    "D":   ["D", "Em", "F#m", "G", "A", "Bm", "C#dim"],
    "A":   ["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"],
    "E":   ["E", "F#m", "G#m", "A", "B", "C#m", "D#dim"],
    "B":   ["B", "C#m", "D#m", "E", "F#", "G#m", "A#dim"],
    "F#":  ["F#", "G#m", "A#m", "B", "C#", "D#m", "E#dim"],
    "C#":  ["C#", "D#m", "E#m", "F#", "G#", "A#m", "B#dim"],
    "F":   ["F", "Gm", "Am", "Bb", "C", "Dm", "Edim"],
    "Bb":  ["Bb", "Cm", "Dm", "Eb", "F", "Gm", "Adim"],
    "Eb":  ["Eb", "Fm", "Gm", "Ab", "Bb", "Cm", "Ddim"],
    "Ab":  ["Ab", "Bbm", "Cm", "Db", "Eb", "Fm", "Gdim"],
    "Db":  ["Db", "Ebm", "Fm", "Gb", "Ab", "Bbm", "Cdim"],
    "Gb":  ["Gb", "Abm", "Bbm", "Cb", "Db", "Ebm", "Fdim"],
    "Cb":  ["Cb", "Dbm", "Ebm", "Fb", "Gb", "Abm", "Bbdim"],

    // Natural minor keys (aeolian)
    "Am":  ["Am", "Bdim", "C", "Dm", "Em", "F", "G"],
    "Em":  ["Em", "F#dim", "G", "Am", "Bm", "C", "D"],
    "Bm":  ["Bm", "C#dim", "D", "Em", "F#m", "G", "A"],
    "F#m": ["F#m", "G#dim", "A", "Bm", "C#m", "D", "E"],
    "C#m": ["C#m", "D#dim", "E", "F#m", "G#m", "A", "B"],
    "G#m": ["G#m", "A#dim", "B", "C#m", "D#m", "E", "F#"],
    "D#m": ["D#m", "E#dim", "F#", "G#m", "A#m", "B", "C#"],
    "A#m": ["A#m", "B#dim", "C#", "D#m", "E#m", "F#", "G#"],
    "Dm":  ["Dm", "Edim", "F", "Gm", "Am", "Bb", "C"],
    "Gm":  ["Gm", "Adim", "Bb", "Cm", "Dm", "Eb", "F"],
    "Cm":  ["Cm", "Ddim", "Eb", "Fm", "Gm", "Ab", "Bb"],
    "Fm":  ["Fm", "Gdim", "Ab", "Bbm", "Cm", "Db", "Eb"],
    "Bbm": ["Bbm", "Cdim", "Db", "Ebm", "Fm", "Gb", "Ab"],
    "Ebm": ["Ebm", "Fdim", "Gb", "Abm", "Bbm", "Cb", "Db"],
    "Abm": ["Abm", "Bbdim", "Cb", "Dbm", "Ebm", "Fb", "Gb"]
  };

  // Roman numeral mapping for major scale (minor keys handled separately later)
  const ROMANS_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
  const ROMANS_MINOR = ["i", "ii°", "III", "iv", "v", "VI", "VII"];

  // Enharmonic equivalents
  const ENHARMONICS = {
    "Cb":"B","B#":"C","E#":"F","Fb":"E",
    "Gb":"F#","F#":"Gb","Db":"C#","C#":"Db",
    "Ab":"G#","G#":"Ab","Eb":"D#","D#":"Eb",
    "Bb":"A#","A#":"Bb"
  };

  function normalizeChord(ch) {
    ch = ch.trim();
    // handle enharmonics
    if (ENHARMONICS[ch]) return ENHARMONICS[ch];
    return ch;
  }

  function parseProgression(input) {
    return input.split(/[ ,\\-]+/).map(normalizeChord).filter(Boolean);
  }

  function detectKey(chords) {
    let scores = {};
    for (const [key, scale] of Object.entries(KEYS)) {
      let matches = chords.filter(ch => scale.includes(ch));
      scores[key] = matches.length;
    }
    return Object.entries(scores).sort((a,b) => b[1]-a[1])[0][0];
  }

  function chordFunctions(key, chords) {
    const scale = KEYS[key];
    const romans = key.endsWith("m") ? ROMANS_MINOR : ROMANS_MAJOR;
    return chords.map(ch => {
      let idx = scale.indexOf(ch);
      return idx >= 0 ? romans[idx] : "borrowed";
    });
  }

  function renderAnalysis() {
    const input = document.getElementById("progressionInput").value;
    const chords = parseProgression(input);
    if (!chords.length) return;
    const key = detectKey(chords);
    const functions = chordFunctions(key, chords);

    document.getElementById("progressionResult").innerHTML = `
      <p><strong>Likely key:</strong> ${key}</p>
      <p><strong>Progression:</strong> ${chords.join(" - ")}</p>
      <p><strong>Functions:</strong> ${functions.join(" - ")}</p>
      <p><strong>Root:</strong> ${key.replace("m","")}</p>
    `;
  }

  // Quiz mode
  let quizChordSet = [];
  let quizKey = "";

  function startQuiz() {
    const keys = Object.keys(KEYS);
    quizKey = keys[Math.floor(Math.random()*keys.length)];
    quizChordSet = KEYS[quizKey].slice();
    shuffle(quizChordSet);
    quizChordSet = quizChordSet.slice(0,4);

    document.getElementById("quizArea").innerHTML = `
      <p>Guess the key of this progression:</p>
      <p>${quizChordSet.join(" - ")}</p>
      <input type="text" id="quizAnswer" placeholder="Enter key (e.g. C, Am)">
      <button onclick="GuitarApp.progressionAnalyzer.checkQuiz()">Submit</button>
    `;
  }

  function checkQuiz() {
    const ans = document.getElementById("quizAnswer").value.trim();
    let result = (ans.toUpperCase() === quizKey.toUpperCase()) 
      ? `✅ Correct! It was ${quizKey}` 
      : `❌ Nope. It was ${quizKey}`;
    document.getElementById("quizArea").innerHTML += `<p>${result}</p>`;
  }

  function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
  }

  function init() {
    const btn = document.getElementById("analyzeProgression");
    if (btn) btn.addEventListener("click", renderAnalysis);
    const quizBtn = document.getElementById("startQuiz");
    if (quizBtn) quizBtn.addEventListener("click", startQuiz);
  }

  return { init, renderAnalysis, startQuiz, checkQuiz };

})();
