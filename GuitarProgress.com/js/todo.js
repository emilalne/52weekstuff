GuitarApp.todo = (function() {
  const input = () => document.getElementById("todo-input");
  const addBtn = () => document.getElementById("todo-add");
  const listEl = () => document.getElementById("todo-list");

  let showExerciseTodos = false;

  let todos = []; // { text: string, done: bool }

  // --- Render ---
function render() {
  const ul = listEl();
  ul.innerHTML = "";


  // ✅ Daily practice routines
if (GuitarApp.routines && GuitarApp.routines.getDailyTodos) {
  const daily = GuitarApp.routines.getDailyTodos();
  daily.forEach(item => {
    const li = document.createElement("li");
    li.className = "todo-item daily-todo";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.addEventListener("change", () => {
      GuitarApp.routines.markTaskDone(item.rIndex, item.tIndex);
      render();
    });

    const span = document.createElement("span");
    //span.textContent = item.text;
    span.innerHTML = item.html;
    li.appendChild(cb);
    li.appendChild(span);
    ul.appendChild(li);
  });
}

  // ✅ Regular todos
  todos.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "todo-item";

    // checkbox
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = item.done;
    cb.addEventListener("change", () => {
      todos[idx].done = cb.checked;
      save();
    });

    // text
    const span = document.createElement("span");
    span.textContent = item.text;
    span.style.textDecoration = item.done ? "line-through" : "none";

    // delete button
    const del = document.createElement("button");
    del.textContent = "✖";
    del.className = "todo-delete";
    del.addEventListener("click", () => {
      todos.splice(idx, 1);
      save();
      render();
    });

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(del);
    ul.appendChild(li);
  });

  // ✅ Exercise todos
  if (showExerciseTodos && GuitarApp.exercises && GuitarApp.exercises.getAllExerciseTodos) {
    const exTodos = GuitarApp.exercises.getAllExerciseTodos();
    exTodos.forEach(todo => {
      const li = document.createElement("li");
      li.className = "todo-item exercise-todo";

      // checkbox (toggles in exercise)
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = todo.done;
      cb.addEventListener("change", () => {
        GuitarApp.exercises.toggleTodo(todo.exIndex, todo.todoIndex);
      });

      // text
      const span = document.createElement("span");
      span.textContent = `${todo.exName}: ${todo.text}`;
      span.style.textDecoration = todo.done ? "line-through" : "none";

      // delete button (removes from exercise)
      const del = document.createElement("button");
      del.textContent = "✖";
      del.className = "todo-delete";
      del.addEventListener("click", () => {
        GuitarApp.exercises.removeTodo(todo.exIndex, todo.todoIndex);
      });

      li.appendChild(cb);
      li.appendChild(span);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }
}


  // --- Save to server ---
  async function save() {
    console.log("saving...");
    console.log(todos);
    await GuitarApp.auth.saveData("todo-list", todos);
    render();
  }

  // --- Load from server ---
  async function load() {
    const res = await GuitarApp.auth.loadData("todo-list");
    if (res && res.success) {
      console.log("Todos load() called");
      todos = res.value;
    } else {
      console.log("call does not seem alright... in load()");
      todos = [];
    }
    render();
  }

  // --- Add new item ---
  function addTodo(text) {
    if (!text.trim()) return;
    todos.push({ text, done: false });
    input().value = "";
    save();
  }

  function init() {
    // set up input handlers
    addBtn().addEventListener("click", () => {
      addTodo(input().value);
    });
  
    input().addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        addTodo(input().value);
      }
    });
  
    // ✅ Toggle for exercise todos
    const toggleEl = document.getElementById("toggle-exercise-todos");
    if (toggleEl) {
      toggleEl.addEventListener("change", () => {
        showExerciseTodos = toggleEl.checked;
        render();
      });
    }
  
    // listen for login event
    document.addEventListener("user:login", () => {
      load();
    });
  
    document.addEventListener("exercises:loaded", () => {
      render();
    });
  }

  function startRoutineTask(rIndex, tIndex) {
    const task = GuitarApp.routines.getTask(rIndex, tIndex); // expose helper
    GuitarApp.timer.startCountdown(task.timeGoal);
  
    if (task.useBpm && task.currentBpm) {
      GuitarApp.metronome.setBpm(task.currentBpm);
      GuitarApp.metronome.startMetronome();
    }
  }

  
  return { init, load, save, render, startRoutineTask };
})();
