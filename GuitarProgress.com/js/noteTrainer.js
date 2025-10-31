(function () {
  const notes = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];
  const openNotes = ["E","B","G","D","A","E"]; // high to low
  let currentString = 0;
  let currentNote = "";
  let correctFret = -1;

  // --- Build trainer fret numbers (like main fretboard) ---
  function buildTrainerFretNumbers() {
    const fretNums = document.getElementById("trainer-fret-numbers");
    fretNums.innerHTML = "";

    // Open string column header
    const openCol = document.createElement("div");
    openCol.textContent = "Open";
    fretNums.appendChild(openCol);

    for (let i = 1; i <= 12; i++) {
      const num = document.createElement("div");
      num.classList.add("fret-num");
      num.textContent = i;
      if ([3, 5, 7, 9, 12].includes(i)) {
        num.classList.add("highlight");
      }
      fretNums.appendChild(num);
    }
  }

  // --- Build trainer fretboard strings ---
  function buildTrainerFretboard() {
    const container = document.getElementById("trainer-fretboard");
    container.innerHTML = "";

    for (let s = 0; s < 6; s++) {
      const row = document.createElement("div");
      row.classList.add("string");

      // Open note cell
    const openCell = document.createElement("div");
    openCell.dataset.string = s;
    openCell.dataset.fret = 0; 
    openCell.classList.add("fret", "open");
    openCell.innerHTML = `<span class="open-label">${openNotes[s]}</span>`;
    row.appendChild(openCell);

    // Frets 1–12
    for (let f = 1; f <= 12; f++) {
    const cell = document.createElement("div");
    cell.classList.add("fret");
    cell.dataset.string = s;
    cell.dataset.fret = f;  // ✅ now consistent with calculation

    if ([3, 5, 7, 9, 12].includes(f)) {
        cell.classList.add("highlight");
    }

    cell.addEventListener("click", onFretClick);
    row.appendChild(cell);
    }

      container.appendChild(row);
    }
  }

  // --- Ask a new question ---
  function newQuestion() {
    currentString = Math.floor(Math.random() * 6);
    currentNote = notes[Math.floor(Math.random() * notes.length)];

    // Compute correct fret
    const openIndex = notes.indexOf(openNotes[currentString]);
    const target = notes.indexOf(currentNote);
    correctFret = (target - openIndex + 12) % 12;
    if (correctFret === 0) correctFret = 12; 

    // Update UI
    document.getElementById("trainer-question").innerHTML =
  `On string ${6 - currentString} (open ${openNotes[currentString]}), click where 
   <span class="trainer-note">${currentNote}</span> is!`;

    document.getElementById("trainer-feedback").textContent = "";

    // Highlight the active string
    document.querySelectorAll("#trainer-fretboard .fret").forEach(el =>
      el.classList.remove("string-highlight")
    );
    const rows = document.querySelectorAll("#trainer-fretboard .string");
    if (rows[currentString]) {
      rows[currentString].querySelectorAll(".fret").forEach(fret =>
        fret.classList.add("string-highlight")
      );
    }
  }

  // --- Handle click ---
function onFretClick(e) {
  const cell = e.target.closest(".fret"); // ensures we get the parent div
  if (!cell || cell.classList.contains("open")) return; // skip open cells

  const string = parseInt(cell.dataset.string);
  const fret = parseInt(cell.dataset.fret);

  if (string === currentString && fret === correctFret) {
    const fb = document.getElementById("trainer-feedback");
    fb.textContent = "✅ Correct!";
    fb.className = "correct";
  } else {
    const fb = document.getElementById("trainer-feedback");
    fb.textContent = `❌ Nope! ${currentNote} is at fret ${correctFret}.`;
    fb.className = "wrong";
  }
}


  function initTrainer() {
    buildTrainerFretNumbers();
    buildTrainerFretboard();
    newQuestion();
    document.getElementById("trainer-next").addEventListener("click", newQuestion);
  }

  window.NoteTrainer = { initTrainer };
})();
