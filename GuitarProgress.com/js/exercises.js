class Timer {
  constructor(updateCallback) {
    this.startTime = null;
    this.elapsed = 0;
    this.interval = null;
    this.updateCallback = updateCallback;
  }
  start() {
    if (this.interval) return;
    this.startTime = Date.now() - this.elapsed;
    this.interval = setInterval(() => {
      this.elapsed = Date.now() - this.startTime;
      if (this.updateCallback) this.updateCallback(this.elapsed);
    }, 1000);
  }
  stop() {
    if (!this.interval) return;
    clearInterval(this.interval);
    this.interval = null;
    this.elapsed = Date.now() - this.startTime;
  }
  reset() {
    this.stop();
    this.elapsed = 0;
    if (this.updateCallback) this.updateCallback(this.elapsed);
  }
  getSeconds() {
    return Math.floor(this.elapsed / 1000);
  }
}

GuitarApp.exercises = (function() {

  function saveExercises(exercises) {
    return fetch("api/save.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "exercises",
        value: exercises
      })
    });
  }

  async function loadExercises() {
    let response = await fetch("api/load.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "exercises" })
    });

    let data = await response.json();

    if (data.success) {
      let exercises = data.value || [];

      // Normalize structure so old entries won't break
      exercises = exercises.map(ex => ({
        name: ex.name || "",
        description: ex.description || "",
        active: ex.active || false,
        status: ex.status || "new",
        notes: ex.notes || "",
        log: ex.log || [],
        images: ex.images || [],
        todos: ex.todos || []   // ✅ ensure todos exists
      }));

        // 🔔 notify others that exercises are ready
  document.dispatchEvent(new CustomEvent("exercises:loaded", { detail: exercises }));


      return exercises;
    }

    return [];
  }

  let exercises = [];

  function removeExercise(index) {
    if (!confirm("Delete this exercise?")) return;
    exercises.splice(index, 1);
    saveExercises(exercises);
    renderExercises();
  }

  function editExercise(index) {
    const ex = exercises[index];
    const card = document.querySelectorAll("#exerciseList .exercise-card")[index];

    card.innerHTML = `
      <h3>Edit Exercise</h3>
      <label>Name: <input type="text" id="edit-name-${index}" value="${ex.name}"></label><br>
      <label>Description:<br>
        <textarea id="edit-desc-${index}">${ex.description}</textarea>
      </label><br>
      <label>Add Images: <input type="file" id="edit-images-${index}" accept="image/*" multiple></label>
      <div class="exercise-images">
        ${(ex.images || []).map((img, j) => `
          <div class="exercise-image">
            <img src="${img}" alt="Exercise image">
            <button onclick="GuitarApp.exercises.removeImage(${index}, ${j})">✖</button>
          </div>
        `).join("")}
      </div>
      <button onclick="GuitarApp.exercises.saveEdit(${index})">💾 Save</button>
      <button onclick="GuitarApp.exercises.renderExercises()">✖ Cancel</button>
    `;
  }

  async function saveEdit(index) {
    const name = document.getElementById(`edit-name-${index}`).value.trim();
    const desc = document.getElementById(`edit-desc-${index}`).value.trim();
    const files = document.getElementById(`edit-images-${index}`).files;

    const newImages = await Promise.all(
      Array.from(files).map(file => {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      })
    );

    exercises[index].name = name;
    exercises[index].description = desc;
    if (!exercises[index].images) {
      exercises[index].images = [];
    }
    exercises[index].images.push(...newImages);

    saveExercises(exercises);
    renderExercises();
  }

  var thisAddForm = null;

  async function init() {
    console.log("Exercises init() called");
    await this.loadExercises().then(exs => {
      exercises = exs;
      renderExercises();
    });
  
    // Make sure we don't attach multiple times

    // prevent multiple bindings
    thisAddForm = document.getElementById("exerciseForm");
    if (thisAddForm && !thisAddForm.dataset.listenerAttached) {
      thisAddForm.addEventListener("submit", async function handleSubmit(e) {
      e.preventDefault();
      const name = document.getElementById("exerciseName").value.trim();
      const desc = document.getElementById("exerciseDesc").value.trim();
      const files = document.getElementById("exerciseImages")?.files || [];
  
      if (!name) return alert("Please enter a name");
  
      const images = await Promise.all(
        Array.from(files).map(file => {
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        })
      );
  
      addExercise(name, desc, images);
      thisAddForm.reset();
    });
    thisAddForm.dataset.listenerAttached = "true";

    document.addEventListener("user:login", async () => {
      await this.loadExercises().then(exs => {
        exercises = exs;
        renderExercises();
      });
    });
    
    document.getElementById("includeInactive").addEventListener("click", () => {
      GuitarApp.exercises.renderExercises();
    });
    document.getElementById("toggle-exercise-form").addEventListener("click", () => {
      const wrapper = document.getElementById("exerciseFormWrapper");
      wrapper.style.display = wrapper.style.display === "none" ? "block" : "none";
    });
  }
}

function toggleActive(i) {
  if(!exercises[i].hasOwnProperty("active")) {
    exercises[i].active = true; 
  } else if(exercises[i].active === true || exercises[i].active === false) {
    exercises[i].active = !exercises[i].active;
  } else {
    active = true; // default to true if somehow not boolean
  }
  saveExercises(exercises);
  renderExercises();
}

  function addExercise(name, description, images = []) {
    exercises.push({
      name,
      description,
      status: "new",
      notes: "",
      log: [],
      images,
      todos: []   // ✅ new exercise always has todos
    });
    saveExercises(exercises);
    renderExercises();
  }

  function logExerciseTime(index, seconds) {
    const today = new Date().toISOString().slice(0, 10);
    const logEntry = exercises[index].log.find(l => l.date === today);
    if (logEntry) {
      logEntry.time += seconds;
    } else {
      exercises[index].log.push({ date: today, time: seconds });
    }
    saveExercises(exercises);
    renderExercises();
  }

  let noteSaveTimeout;
  function updateNotes(index, newNotes) {
    exercises[index].notes = newNotes;
    clearTimeout(noteSaveTimeout);
    noteSaveTimeout = setTimeout(() => {
      saveExercises(exercises);
    }, 1000);
  }

  function removeImage(exIndex, imgIndex) {
    exercises[exIndex].images.splice(imgIndex, 1);
    saveExercises(exercises);
    renderExercises();
  }

  function enlargeImage(src) {
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("modal-img");
    modal.style.display = "block";
    modalImg.src = src;
    modal.querySelector(".close").onclick = () => { modal.style.display = "none"; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
  }

  // ✅ Todos inside exercises
  function addTodo(exIndex) {
    const inp = document.getElementById(`ex-todo-input-${exIndex}`);
    const text = inp.value.trim();
    if (!text) return;
    exercises[exIndex].todos.push({ text, done: false });
    inp.value = "";
    saveExercises(exercises);
    renderExercises();
  }

  function toggleTodo(exIndex, todoIndex) {
    exercises[exIndex].todos[todoIndex].done = !exercises[exIndex].todos[todoIndex].done;
    saveExercises(exercises);
    renderExercises();
  }

  function removeTodo(exIndex, todoIndex) {
    exercises[exIndex].todos.splice(todoIndex, 1);
    saveExercises(exercises);
    renderExercises();
  }

  function toggleCollapse(i) {
    const body = document.getElementById(`ex-body-${i}`);
    const header = body.previousElementSibling; // h3
    const isOpen = body.classList.toggle("open");
    header.classList.toggle("open", isOpen); // ✅ rotates arrow via CSS
  }



function renderExercises() {
  const container = document.getElementById("exerciseList");

  const includeInactive = document.getElementById("includeInactive")?.checked ?? false;

  // ✅ remember which exercises + inner sections are open
  const state = Array.from(container.querySelectorAll(".exercise-card")).map(card => {
    return {
      bodyOpen: card.querySelector(".exercise-body")?.classList.contains("open"),
      notesOpen: card.querySelector(".exercise-notes .toggle-content")?.classList.contains("open"),
      tasksOpen: card.querySelector(".exercise-todos .toggle-content")?.classList.contains("open")
    };
  });

  container.innerHTML = "";
  let changedActiveDefault = false;
  exercises.forEach((ex, i) => {

    if(!ex.hasOwnProperty("active")) {
      ex.active = true; 
      changedActiveDefault = true;
    }
    if (!includeInactive && ex.active === false) return;

    let div = document.createElement("div");
    div.className = "exercise-card";

    div.innerHTML = `
      <h3 class="exercise-header toggle-header" onclick="GuitarApp.exercises.toggleCollapse(${i})">
        <span class="ex-arrow"></span> ${ex.name}
        <span id="ex-timer-inline-${i}" class="inline-timer"></span>
      </h3>
      <div class="exercise-body" id="ex-body-${i}">
        <p>${ex.description}</p>
        <p>Status: ${ex.status}</p>
        <label>
          <input type="checkbox" ${ex.active !== false ? "checked" : ""} 
            onchange="GuitarApp.exercises.toggleActive(${i})">
          Active
        </label>
        <!-- ✅ Notes toggle -->
        <div class="exercise-notes">
          <div class="toggle-header" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open')">
            Notes
          </div>
          <div class="toggle-content">
            <textarea oninput="GuitarApp.exercises.updateNotes(${i}, this.value)">${ex.notes}</textarea>
          </div>
        </div>

        <!-- Images -->
        <div class="exercise-images">
          ${(ex.images || []).map((img, j) => `
            <div class="exercise-image">
              <img src="${img}" alt="Exercise image" onclick="GuitarApp.exercises.enlargeImage('${img}')">
              <button class="btn-small" onclick="GuitarApp.exercises.removeImage(${i}, ${j})">✖</button>
            </div>
          `).join("")}
        </div>

        <!-- ✅ Tasks toggle -->
        <div class="exercise-todos">
          <div class="toggle-header" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open')">
            Tasks
          </div>
          <div class="toggle-content">
            <ul id="ex-todos-${i}">
              ${(ex.todos || []).map((t,j) => `
                <li>
                  <input type="checkbox" ${t.done ? "checked" : ""} onchange="GuitarApp.exercises.toggleTodo(${i}, ${j})">
                  ${t.text}
                  <button class="btn-small" onclick="GuitarApp.exercises.removeTodo(${i}, ${j})">✖</button>
                </li>
              `).join("")}
            </ul>
            <input type="text" id="ex-todo-input-${i}" placeholder="Add task...">
            <button class="btn-small" onclick="GuitarApp.exercises.addTodo(${i})">➕</button>
          </div>
        </div>

        <!-- Log -->
        <ul>
          ${ex.log.map(l => `<li>${l.date}: ${formatTime(l.time)}</li>`).join("")}
        </ul>

        <!-- Timer -->
        <div class="exercise-timer">
          <p><strong>Track time for this exercise:</strong></p>
          <button id="start-btn-${i}" class="btn-small" onclick="GuitarApp.exercises.startTimer(${i})">▶ Start</button>
          <button id="stop-btn-${i}" class="btn-small" onclick="GuitarApp.exercises.stopTimer(${i})" style="display:none;">⏹ Stop</button>
          <span id="timer-${i}" class="timer-display">0s</span>
        </div>

        <!-- Actions -->
        <div class="exercise-actions">
          <button class="btn-small" onclick="GuitarApp.exercises.editExercise(${i})">✎ Edit</button>
          <button class="btn-small" onclick="GuitarApp.exercises.removeExercise(${i})">🗑 Remove</button>
        </div>
      </div>
    `;

    container.appendChild(div);

    // ✅ restore open states
    const s = state[i] || {};
    if (s.bodyOpen) {
      div.querySelector(".exercise-body").classList.add("open");
      div.querySelector(".exercise-header").classList.add("open");
    }
    if (s.notesOpen) {
      div.querySelector(".exercise-notes .toggle-header").classList.add("open");
      div.querySelector(".exercise-notes .toggle-content").classList.add("open");
    }
    if (s.tasksOpen) {
      div.querySelector(".exercise-todos .toggle-header").classList.add("open");
      div.querySelector(".exercise-todos .toggle-content").classList.add("open");
    }
  });

  if (changedActiveDefault) {
    saveExercises(exercises);
  }
}





function getAllExerciseTodos() {
  let list = [];
  exercises.forEach((ex, exIndex) => {
    (ex.todos || []).forEach((t, todoIndex) => {
      list.push({
        exName: ex.name,
        exIndex,
        todoIndex,
        text: t.text,
        done: t.done
      });
    });
  });
  return list;
}



  let currentTimer = null;
  function startTimer(index) {
    if (currentTimer) currentTimer.stop();

    currentTimer = new Timer(elapsed => {
      const timeStr = formatTime(Math.round(elapsed / 1000));
      document.getElementById(`timer-${index}`).textContent = timeStr;
      document.getElementById(`ex-timer-inline-${index}`).textContent = timeStr;
      document.getElementById("active-timer").textContent =
        `Tracking time on ${exercises[index].name}: ${timeStr}`;
    });

    currentTimer.start();
    currentTimer.exerciseIndex = index;

    document.getElementById(`start-btn-${index}`).style.display = "none";
    document.getElementById(`stop-btn-${index}`).style.display = "inline-block";
    document.getElementById("header-stop-btn").style.display = "inline-block";
  }

  function stopTimer() {
    if (!currentTimer) return;
    currentTimer.stop();
    logExerciseTime(currentTimer.exerciseIndex, currentTimer.getSeconds());
    const idx = currentTimer.exerciseIndex;
    currentTimer = null;

    document.getElementById("active-timer").textContent = "";
    if (idx !== undefined) {
      document.getElementById(`start-btn-${idx}`).style.display = "inline-block";
      document.getElementById(`stop-btn-${idx}`).style.display = "none";
    }
    document.getElementById("header-stop-btn").style.display = "none";
  }

  function formatTime(sec) {
    sec = Math.round(sec);
    if (!sec) return "0s";
    let h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    let s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function toggleNotes(i) {
  const notesBody = document.getElementById(`ex-notes-${i}`);
  const toggle = notesBody.previousElementSibling;
  if (notesBody.style.display === "none") {
    notesBody.style.display = "block";
    toggle.textContent = "▼ Notes";
  } else {
    notesBody.style.display = "none";
    toggle.textContent = "▶ Notes";
  }
}
function getAllExercices() {
  return exercises;
}

  return {
    startTimer,
    stopTimer,
    renderExercises,
    init,
    addExercise,
    logExerciseTime,
    saveExercises,
    loadExercises,
    updateNotes,
    removeImage,
    removeExercise,
    editExercise,
    saveEdit,
    enlargeImage,
    addTodo,
    toggleTodo,
    removeTodo,
    toggleCollapse,
    toggleNotes,
    getAllExerciseTodos,
    toggleActive,
    getAllExercices
  };
})();
