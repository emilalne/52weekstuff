GuitarApp.routines = (function() {
  let routines = []; // { name, tasks: [{ exIndex, todoIndex, timeGoal }], lastCompletedDate }

  function today() {
    return new Date().toISOString().slice(0,10);
  }

  async function save() {
    await GuitarApp.auth.saveData("routines", routines);
  }

  async function load() {
    console.log("Routines load() called");
    const res = await GuitarApp.auth.loadData("routines");
    routines = res.success ? res.value : [];
    renderList();
  }

  function addRoutine(name) {
    routines.push({ name, tasks: [], lastCompletedDate: null });
    save();
  }

  function addTask(routineIndex, exIndex, todoIndex, timeGoal, currentBpm) {
    routines[routineIndex].tasks.push({
      exIndex, todoIndex, timeGoal,
      useBpm: !!currentBpm,
      currentBpm
    });
    save();
  }
  

  function markTaskDone(rIndex, tIndex) {
    const routine = routines[rIndex];
    const task = routine.tasks[tIndex];
    const todayStr = today();
  
    task.doneDate = todayStr;
  
    // ✅ log exercise time
    if (task.timeGoal && task.exIndex !== undefined) {
      GuitarApp.exercises.logExerciseTime(
        task.exIndex,
        task.timeGoal * 60 // convert minutes to seconds
      );
    }
  
    if (!routine.doneDateList) routine.doneDateList = [];
    if (isRoutineTasksAllDone(rIndex) && !routine.doneDateList.includes(todayStr)) {
      routine.doneDateList.push(todayStr);
    }
  
    save();
  }
  

function isRoutineTasksAllDone(routineIndex) {
  const routine = routines[routineIndex];
  const todayStr = today();

  for (const task of routine.tasks) {
    if (task.doneDate !== todayStr) {
      return false;
    }
  }

  return true;
}

  function getTask(rIndex, tIndex) {
    return routines[rIndex]?.tasks[tIndex] || null;
  }

  function getDailyTodos() {
    let out = [];
    const allExTodos = GuitarApp.exercises.getAllExerciseTodos
      ? GuitarApp.exercises.getAllExerciseTodos()
      : [];

    routines.forEach((r, rIndex) => {
      r.tasks.forEach((t, tIndex) => {
        if (t.doneDate === today()) return;
        if (r.active !== false){
          const exTodos = allExTodos.filter(e => e.exIndex === t.exIndex);
          const exName = exTodos[0] ? exTodos[0].exName : "Exercise";
          const todo = exTodos.find(e => e.todoIndex === t.todoIndex);
          const text = todo ? todo.text : "";
          const bpmText = t.useBpm && t.currentBpm ? `, @${t.currentBpm}BPM` : "";

          out.push({
            rIndex,
            tIndex,
            text: `${r.name}: ${exName} – ${text} (${t.timeGoal} min${bpmText})`,
            html: `${r.name}: ${exName} – ${text} (${t.timeGoal} min${bpmText}) 
         <button class="start-timer-btn" onclick="GuitarApp.todo.startRoutineTask(${rIndex},${tIndex})">⏳</button>`
          });
        }
      });
    });
    return out;
  }

  function toggleActive(index) {
    routines[index].active = !routines[index].active;
    save();
    renderList();
    GuitarApp.todo.render();
  }

  function renderList() {
    const container = document.getElementById("routineList");
    if (!container) return;

    const allExTodos = GuitarApp.exercises.getAllExerciseTodos
      ? GuitarApp.exercises.getAllExerciseTodos()
      : [];

    container.innerHTML = routines.map((r, rIndex) => {
      if(r.hasOwnProperty('useBpm') === false) r.useBpm = false;
      if(r.hasOwnProperty('currentBpm') === false) r.currentBpm = 0;

      const exNames = {};
      
      allExTodos.forEach(t => { exNames[t.exIndex] = t.exName; });
      
      const exOptions = Object.entries(exNames).map(([exIndex, exName]) =>
        `<option value="${exIndex}">${exName}</option>`
      ).join("");

      return `
        <div class="routine-card">
          <div class="routine-header">
            <strong>${r.name} (${r.tasks.reduce((sum, t) => sum + (t.timeGoal || 0), 0)} min)</strong>
            <label class="routine-active-toggle">
    <input type="checkbox" onchange="GuitarApp.routines.toggleActive(${rIndex})" ${r.active !== false ? "checked" : ""}>
    Active
  </label>
            <button class="routine-delete" onclick="GuitarApp.routines.removeRoutine(${rIndex})">✖</button>
          </div>

          <div class="routine-add-task">
            <select id="routineEx-${rIndex}" class="routine-select">
              <option value="">-- Select Exercise --</option>
              ${exOptions}
            </select>

            <select id="routineTask-${rIndex}" class="routine-select">
              <option value="">-- Select Task --</option>
            </select>

            <input type="number" id="routineBpm-${rIndex}" class="routine-time" min="0" max="280" placeholder="BPM">

            <input type="number" id="routineTime-${rIndex}" class="routine-time" min="1" max="120" value="15"> min
            <button class="btn-small" onclick="GuitarApp.routines.handleAddTask(${rIndex})">Add Task</button>
          </div>

          <div class="routine-tasks">
            ${r.tasks.map((t, tIndex) => {
              const exTodos = allExTodos.filter(e => e.exIndex === t.exIndex);
              const exName = exTodos[0] ? exTodos[0].exName : "Exercise";
              const todo = exTodos.find(e => e.todoIndex === t.todoIndex);
              const text = todo ? todo.text : "";
              const bpmText = t.useBpm && t.currentBpm ? `, @ ${t.currentBpm} BPM` : "";
              return `
                <div class="routine-task" id="routine-task-${rIndex}-${tIndex}">
                  • ${exName} – ${text} (${t.timeGoal} min${bpmText})
                    <button class="task-edit" onclick="GuitarApp.routines.showEditTask(${rIndex},${tIndex})">✎</button>
                  <button class="task-delete" onclick="GuitarApp.routines.removeTask(${rIndex},${tIndex})">✖</button>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }).join("");

    routines.forEach((_, rIndex) => {
      const exSel = document.getElementById(`routineEx-${rIndex}`);
      const taskSel = document.getElementById(`routineTask-${rIndex}`);
      if (exSel && taskSel) {
        exSel.addEventListener("change", () => {
          const exIndex = parseInt(exSel.value);
          taskSel.innerHTML = `<option value="">-- Select Task --</option>`;
          if (!isNaN(exIndex)) {
            const exTodos = allExTodos.filter(e => e.exIndex === exIndex);
            taskSel.innerHTML += exTodos.map(t =>
              `<option value="${t.todoIndex}">${t.text}</option>`
            ).join("");
          }
        });
      }
    });
  }

  function showEditTask(rIndex, tIndex) {
    const task = routines[rIndex].tasks[tIndex];
    const container = document.getElementById(`routine-task-${rIndex}-${tIndex}`);
  
    container.innerHTML = `
      <div>
        <label>Time (min): 
          <input type="number" id="edit-time-${rIndex}-${tIndex}" value="${task.timeGoal}" min="1">
        </label>
        <label>BPM: 
          <input type="number" id="edit-bpm-${rIndex}-${tIndex}" value="${task.currentBpm || ""}" min="20" max="300">
        </label>
        <button class="btn-small" onclick="GuitarApp.routines.saveTaskEdit(${rIndex},${tIndex})">💾</button>
        <button class="btn-small" onclick="GuitarApp.routines.renderList()">✖</button>
      </div>
    `;
  }

  function saveTaskEdit(rIndex, tIndex) {
    const timeVal = parseInt(document.getElementById(`edit-time-${rIndex}-${tIndex}`).value);
    const bpmVal = parseInt(document.getElementById(`edit-bpm-${rIndex}-${tIndex}`).value);
  
    if (!isNaN(timeVal)) routines[rIndex].tasks[tIndex].timeGoal = timeVal;
    if (!isNaN(bpmVal)) {
      routines[rIndex].tasks[tIndex].currentBpm = bpmVal;
      routines[rIndex].tasks[tIndex].useBpm = true;
    } else {
      routines[rIndex].tasks[tIndex].currentBpm = null;
      routines[rIndex].tasks[tIndex].useBpm = false;
    }
  
    save();
    renderList();
  }

  
  function handleAddTask(rIndex) {
    const exSel = document.getElementById(`routineEx-${rIndex}`);
    const taskSel = document.getElementById(`routineTask-${rIndex}`);
    const timeInput = document.getElementById(`routineTime-${rIndex}`);

    const exIndex = parseInt(exSel.value);
    const todoIndex = parseInt(taskSel.value);
    const timeGoal = parseInt(timeInput.value);

    const bpmInput = document.getElementById(`routineBpm-${rIndex}`);
    const currentBpm = parseInt(bpmInput.value) || null;


    if (isNaN(exIndex) || isNaN(todoIndex) || isNaN(timeGoal)) {
      alert("Please select exercise, task, and time goal.");
      return;
    }

    addTask(rIndex, exIndex, todoIndex, timeGoal, currentBpm);
    renderList();
  }

  var thisAddButton = null;

  function init() {
    document.addEventListener("user:login", async () => {
      await load();
    });
  
    // wait until exercises are loaded before rendering
    document.addEventListener("exercises:loaded", () => {
      renderList();
    });
  
      
    thisAddButton = document.getElementById("routineAdd");
    if (thisAddButton && !thisAddButton.dataset.listenerAttached) thisAddButton.addEventListener("click", () => {
      const name = document.getElementById("routineName").value.trim();
      if (!name) return;
      addRoutine(name);
      renderList();
    });
    thisAddButton.dataset.listenerAttached = true
    
  }
  

  function removeRoutine(rIndex) {
    routines.splice(rIndex, 1);
    save();
    renderList();
  }

  function removeTask(rIndex, tIndex) {
    routines[rIndex].tasks.splice(tIndex, 1);
    save();
    renderList();
  }

  return { 
    init, load, save, addRoutine, addTask, markTaskDone, 
    getDailyTodos, handleAddTask, removeRoutine, removeTask, renderList, toggleActive, showEditTask, saveTaskEdit, getTask
  };

})();
