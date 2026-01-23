const express = require("express");
const path = require("path");

// Twilio setup (safe)
let twilioClient = null;
try {
  const twilio = require("twilio");
  const hasTwilio =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER;

  if (hasTwilio) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
} catch (e) {
  // If twilio isn't installed yet, app still runs (no crash)
  console.log("Twilio not ready:", e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/signup", async (req, res) => {
  const { name, email, phone } = req.body;
  console.log("New signup:", name, email, phone);

  // Send SMS confirmation
  try {
    if (!twilioClient) throw new Error("Twilio not configured.");

    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
      body: `Cutbook ✅ Thanks for joining! We’ll email you with instructions shortly.`
    });
  } catch (err) {
    console.error("Signup SMS error:", err.message);
  }

  // Bigger thank-you page
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Cutbook - Thank You</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f8f8f8;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .box {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 420px;
    }
    h1 { color: #ff0055; margin-bottom: 12px; }
    p { font-size: 1.1rem; color: #444; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Thank You for Signing Up!</h1>
    <p>We will email you with instructions shortly.</p>
  </div>
</body>
</html>
`);
});
