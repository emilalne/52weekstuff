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
  