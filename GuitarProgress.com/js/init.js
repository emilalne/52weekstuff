console.log("Loading init script.");

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded event called");

  // --- init core modules
  GuitarApp.fretboard.init();
  GuitarApp.timer.init();
  GuitarApp.auth.init();
  GuitarApp.metronome.init();
  GuitarApp.shuffle.init();
    
  // hide user-only sections until login
  GuitarApp.auth.setUserSectionsVisible(false);
  GuitarApp.auth.checkSession();

  GuitarApp.todo.init();
  GuitarApp.routines.init();

  // --- init standalone modules
  GuitarApp.progressionAnalyzer.init();
  NoteTrainer.initTrainer();
  ChordVisualizer.init();
  EarTraining.init();
  CircleQuiz.newQuestion();

  document.getElementById("circle-quiz-start").addEventListener("click", () => {
    document.getElementById("circle-quiz-start").style.display = "none";
    document.getElementById("circle-quiz-container").style.display = "block";
    CircleQuiz.newQuestion();
  });

  if (window.RhythmVisualizer) RhythmVisualizer.init();
});

// --- stop button
document.getElementById("header-stop-btn").addEventListener("click", () => {
  GuitarApp.exercises.stopTimer();
});

// --- toggle menu handling
document.querySelectorAll('.menu-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    btn.classList.toggle('active');
    const target = btn.getAttribute('data-target');
    const section = document.getElementById(target);
    if (section) {
      section.style.display = btn.classList.contains("active") ? "block" : "none";
    }

    if (GuitarApp.auth.getUser()) {
      const visible = Array.from(document.querySelectorAll('.menu-btn.active'))
        .map(el => el.dataset.target);
      await GuitarApp.auth.saveData("visibleSections", visible);
    }
  });
});

// --- restore helper
async function restoreSections() {
  const res = await GuitarApp.auth.loadData("visibleSections");
  if (res.success && Array.isArray(res.value)) {
    const saved = res.value;
    console.log("Restoring sections:", saved);
    document.querySelectorAll('.menu-btn').forEach(btn => {
      const target = btn.dataset.target;
      const section = document.getElementById(target);
      if (!section) return;

      if (saved.includes(target)) {
        btn.classList.add("active");
        section.style.display = "block";
      } else {
        btn.classList.remove("active");
        section.style.display = "none";
      }
    });
  } else {
    console.log("No saved section state, showing all by default");
    // default: show all
    document.querySelectorAll('.menu-btn').forEach(btn => {
      const section = document.getElementById(btn.dataset.target);
      if (section) {
        btn.classList.add("active");
        section.style.display = "block";
      }
    });
  }
}

// --- run restore when login event fires
document.addEventListener("user:login", restoreSections);

// also try restore once after session check
GuitarApp.auth.checkSession().then(() => {
  if (GuitarApp.auth.getUser()) {
    restoreSections();
  }
});


(function() {
  const noteArea = document.getElementById("daily-note-text");
  const prevBtn = document.getElementById("toggle-previous-notes");
  const prevNotesContainer = document.getElementById("previous-notes");

  let saveTimeout;

  function todayStr() {
    return new Date().toISOString().slice(0,10);
  }

  async function loadNotes() {
    const res = await GuitarApp.auth.loadData("dailyNotes");
    const notes = res.success ? res.value : {};
    // load today's note
    noteArea.value = notes[todayStr()] || "";
    return notes;
  }

  async function saveNote(text) {
    const res = await GuitarApp.auth.loadData("dailyNotes");
    const notes = res.success ? res.value : {};
    notes[todayStr()] = text;
    await GuitarApp.auth.saveData("dailyNotes", notes);
  }

  noteArea.addEventListener("input", () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveNote(noteArea.value);
    }, 500);
  });

  prevBtn.addEventListener("click", async () => {
    if (prevNotesContainer.style.display === "none") {
      const res = await GuitarApp.auth.loadData("dailyNotes");
      const notes = res.success ? res.value : {};
      prevNotesContainer.innerHTML = Object.entries(notes)
        .sort((a,b) => b[0].localeCompare(a[0])) // newest first
        .map(([date, text]) => `
          <div class="note-entry">
            <strong>${date}</strong><br>
            <div>${text.replace(/\n/g,"<br>")}</div>
          </div>
        `).join("");
      prevNotesContainer.style.display = "block";
      prevBtn.textContent = "Hide previous notes";
    } else {
      prevNotesContainer.style.display = "none";
      prevBtn.textContent = "Read previous notes";
    }
  });

  // 🔥 Load notes on login
  document.addEventListener("user:login", async () => {
    await loadNotes();
  });

  if(GuitarApp.auth.getUser()) {
    loadNotes();
  }
})();

document.getElementById("help-btn").addEventListener("click", function() {
  const box = document.getElementById("help-box");
  box.style.display = (box.style.display === "block") ? "none" : "block";
});


const ghosts = document.querySelectorAll(".ghost");
const paths = ["fly-left-right", "fly-right-left", "fly-diagonal-up", "fly-wavy"];

function maybeShowGhost() {
  if (Math.random() < 1 / 3600) {
    const ghost = ghosts[Math.floor(Math.random() * ghosts.length)];
    const path = paths[Math.floor(Math.random() * paths.length)];

    // random animation duration (5–12 seconds)
    const duration = Math.floor(Math.random() * 12000) + 5000;

    ghost.style.top = `${Math.floor(Math.random() * 70) + 10}%`; // vertical offset
    ghost.style.animation = `${path} ${duration}ms linear forwards`;

    ghost.classList.remove("hidden");

    setTimeout(() => {
      ghost.classList.add("hidden");
      ghost.style.animation = ""; // reset
    }, duration);
  }
}

setInterval(maybeShowGhost, 3000);

