
// ======================= MERGED SERVER ==========================
const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const socketio = require("socket.io");
// Optional SerialPort if using hardware SOS button
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const path = require("path"); // new line

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files (CSS, JS, images) from SmartF folder (new lines....)
app.use(express.static(path.join(__dirname, ".."))); // parent folder of backend is SmartF

// ---------- HTTP + Socket.IO ----------
const server = http.createServer(app);
const io = socketio(server, { cors: { origin: "*" } });

// ---------- MySQL Connection ----------
const db = mysql.createConnection({
  host: "localhost",
  user: "smartglo_user",
  password: "urs@123456789",
  database: "smartglo_db"
});

db.connect(err => {
  if (err) console.error("❌ MySQL Connection Failed:", err);
  else console.log("✅ Connected to MySQL");
});

// ---------- API Key ----------
const SERVER_API_KEY = "AIzaSyDLwuMaLAT3EHAekaEmdvcYNYy_HAV26pY";

// ======================= ROUTES =============================(new lines....)
// Serve index.html for home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Serve login.html
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "login.html"));
});

// Serve dashboard (web.html)
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "web.html"));
});


// ======================= USER ROUTES =============================

// Register
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ success: false, message: "All fields required" });

  const query = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
  db.query(query, [username, email, password], err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Error registering user" });
    }
    return res.json({ success: true, message: "User registered successfully" });
  });
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password required" });

  const query = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(query, [email, password], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Login error" });
    if (results.length > 0) res.json({ success: true, message: "Login successful" });
    else res.json({ success: false, message: "Invalid email or password" });
  });
});

// ======================= ALERT ROUTES ===========================

// ESP32 alert
app.post("/alert", (req, res) => {
  const key = req.header("x-api-key") || "";
  if (key !== SERVER_API_KEY) return res.status(401).json({ status: "error", message: "unauthorized" });

  const payload = req.body || {};
  const lat = payload.lat;
  const lon = payload.lon;
  const device = payload.device || "SmartGlo01";

  if (lat === undefined || lon === undefined)
    return res.status(400).json({ status: "error", message: "missing lat/lon" });

  const query = "INSERT INTO alerts (`device`, `lat`, `lon`) VALUES (?, ?, ?)";
  db.query(query, [device, parseFloat(lat), parseFloat(lon)], (err, result) => {
    const alertPayload = {
      id: result?.insertId || null,
      device,
      lat,
      lon,
      time: new Date().toISOString()
    };

    if (err) {
      console.error("DB insert error:", err);
      alertPayload.db_error = true;
    }

    io.emit("new_alert", alertPayload);  // Browser socket
    io.emit("alert", alertPayload);     // Browser sosSocket
    return res.json({ status: err ? "error" : "ok", alert: alertPayload });
  });
});

// PHP broadcast
app.post("/broadcast", (req, res) => {
  const key = req.header("x-api-key") || "";
  if (key !== SERVER_API_KEY) return res.status(401).json({ status: "error", message: "unauthorized" });

  const payload = req.body;
  if (!payload || payload.lat === undefined || payload.lon === undefined)
    return res.status(400).json({ status: "error", message: "invalid payload" });

  io.emit("alert", payload);  // sosSocket
  io.emit("new_alert", payload.device || "Device"); // socket
  return res.json({ status: "ok", emitted: payload });
});

app.post('/sos', (req, res) => {
   console.log("🚨 SOS Received:", req.body);
   io.emit("sosAlert", req.body);
   res.json({ success: true });
});


// ======================= SOCKET.IO(new) ==============================
io.on("connection", socket => {
  console.log("✅ Client connected:", socket.id);

  // --- Add this inside the connection handler ---
  socket.on('new_sos', data => {
    console.log("Received new_sos event:", data);
    io.emit('alert', data);          // triggers browser sosSocket.on('alert')
    io.emit('new_alert', data.device || "Device"); // triggers browser socket.on('new_alert')
  });

  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

// ======================= SERIAL PORT (optional) ==================
// Uncomment and set your COM port if using hardware SOS button

SerialPort.list().then(ports => {
  const comPort = ports.find(p => p.path === "COM4");
  if (!comPort) return console.log("⚠️ COM4 not found");

  const port = new SerialPort({ path: "COM4", baudRate: 9600 });
  const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

  parser.on("data", data => {
    console.log("Serial Data:", data);
    if (data.trim() === "ALERT_BUTTON_HELD_5S") {
      io.emit("new_alert", { message: "Hardware SOS Button held for 5s", time: new Date().toISOString() });
    }
  });

  port.on("error", err => console.error("Serial Error:", err.message));
}).catch(err => console.error("SerialPort list error:", err));


// ======================= START SERVER ==========================
const PORT = 5000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
