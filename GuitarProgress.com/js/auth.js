/* -------------------------
   AUTH MODULE
------------------------- */
GuitarApp.auth = (function() {
    let currentUser = null;
  
    // Elements
    const userStatus = document.getElementById("user-status");
    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const userPanel = document.getElementById("user-panel");
  
    // Insert login form if not logged in
    function renderLoginForm() {
      userStatus.textContent = "";
      userStatus.innerHTML = `
        <input type="text" id="auth-username" placeholder="Username">
        <input type="password" id="auth-password" placeholder="Password">
        <button id="auth-login">Login</button>
        <button id="auth-register">Register</button>
      `;
      logoutBtn.style.display = "none";
    }
  
    // Show logged in state
    function renderLoggedIn() {
      userStatus.textContent = `Logged in as ${currentUser}`;
      logoutBtn.style.display = "inline-block";
    }
  
    // --- API CALLS ---
    async function register(username, password) {
      const res = await fetch("/api/register.php", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username, password})
      });
      return await res.json();
    }
  
    async function login(username, password) {
      const res = await fetch("/api/login.php", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username, password})
      });
      return await res.json();
    }
  
    async function logout() {
      await fetch("/api/logout.php", { method: "POST" });
      currentUser = null;
      renderLoginForm();
      attachLoginHandlers();
      document.getElementById("exerciseList").innerHTML = "";
      if (GuitarApp.todo) {
        document.getElementById("todo-list").innerHTML = "";
      }
      setUserSectionsVisible(false);
    }
  
    async function saveData(key, value) {
      const res = await fetch("/api/save.php", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({key, value})
      });
      return await res.json();
    }
  
    async function loadData(key) {
      const res = await fetch("/api/load.php", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({key})
      });
      return await res.json();
    }
  
    // --- Event handlers ---
    function attachLoginHandlers() {
      const loginButton = document.getElementById("auth-login");
      const registerButton = document.getElementById("auth-register");
  
      if (loginButton) {
        loginButton.addEventListener("click", async () => {
          const username = document.getElementById("auth-username").value;
          const password = document.getElementById("auth-password").value;
          const result = await login(username, password);
          if (result.success) {
            currentUser = username;
            renderLoggedIn();
            document.dispatchEvent(new CustomEvent("user:login", { detail: { username } }));
            setUserSectionsVisible(true);
          } else {
            alert(result.message || "Login failed");
          }
        });
      }
  
      if (registerButton) {
        registerButton.addEventListener("click", async () => {
          const username = document.getElementById("auth-username").value;
          const password = document.getElementById("auth-password").value;
          const result = await register(username, password);
          if (result.success) {
            alert("Registered! You can now log in.");
          } else {
            alert(result.message || "Registration failed");
          }
        });
      }
    }
  
    async function checkSession() {
        console.log("checkSession() called");
        const res = await fetch("/api/session.php");
        const data = await res.json();
        console.log("session.php returned", data);
      
        if (data.loggedIn) {
          currentUser = data.username;
          renderLoggedIn();
          setUserSectionsVisible(true);
      
          GuitarApp.exercises.init().then(() => {
            GuitarApp.routines.init();
            GuitarApp.todo.init();
          });
      
          // Now restore menu state
          document.dispatchEvent(new CustomEvent("user:login", { detail: { username: currentUser } }));
        } else {
          renderLoginForm();
          attachLoginHandlers();
          setUserSectionsVisible(false);
        }
      }
      
      


/*
function setUserSectionsVisible(isVisible) {
  const todo = document.getElementById("todo-section");
  const exercises = document.getElementById("exercise-section");
  const routines = document.getElementById("routine-section");

  if (isVisible) {
    todo.style.display = "block";
    exercises.style.display = "block";
    routines.style.display = "block";
  } else {
    todo.style.display = "none";
    exercises.style.display = "none";
    routines.style.display = "none";

    // also clear any old content
    document.getElementById("todo-list").innerHTML = "";
    document.getElementById("exerciseList").innerHTML = "";
    document.getElementById("routineList").innerHTML = "";
  }
}
*/
function setUserSectionsVisible(isVisible) {
    // Sections that require login
    const protectedSections = [
      "todo-section",
      "exercise-section",
      "routine-section",
      "metronome-section",
      "keyshuffle-section",
      "rhythm-section",
      "tuner-section",
      "eartraining-section",
      "earquiz-section",
      "rootnotes-section",
      "circle-section",
      "chords-section",
      "fretboard-section",
      "quiz-section",
      "daily-notes"
    ];
  
    // Sections always visible (even if not logged in)
    const publicSections = [
      "quiz-section",
      "timer-section",
      "shuffle-section"
    ];
  
    // Apply visibility
    protectedSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = isVisible ? "block" : "none";
    });
  
    // Clear content when logged out
    if (!isVisible) {
      const clears = ["todo-list", "exerciseList", "routineList"];
      clears.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
      });
    }
  
    // Always keep public sections visible
    publicSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "block";
    });
  }
  



    function init() {
      console.log("auth.init() called");   // 👈 add this
      checkSession();
  
      logoutBtn.addEventListener("click", () => logout());
    }
  
    return { init, login, register, saveData, loadData, setUserSectionsVisible, checkSession, getUser: () => currentUser };
  })();
  