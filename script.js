

// Show Register form
function showRegister() {
  document.getElementById("login-box").style.display = "none";
  document.getElementById("register-box").style.display = "block";
}

// Show Login form
function showLogin() {
  document.getElementById("register-box").style.display = "none";
  document.getElementById("login-box").style.display = "block";
}

// Handle Register
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  console.log(username)
  console.log(password)
  console.log(email)
  const res = await fetch("http://localhost:5000/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await res.json();

  if (data.success) {
    alert("Registration Successful! Please Login."); 
    showLogin(); // ✅ After register, go back to login form
  } else {
    alert("❌ " + data.message);
  }
});

// Handle Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

try{
  const res = await fetch("http://localhost:5000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

   if (data.success) {
        // ✅ Save user data for web.html
        localStorage.setItem("loggedInUser", email); // emailInput.value
         // Optional: save additional user info if your backend returns it
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      alert("✅ Login successful!");

        // ✅ Redirect to web.html
        window.location.href = "web.html";
      } else {
        alert("❌" + data.message || "Invalid login");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("⚠️ Error connecting to server");
    } 
});





