const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ✅ Safe Twilio init (will NOT crash your app)
let twilioClient = null;
try {
  const twilio = require("twilio");

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (sid && token && from) {
    twilioClient = twilio(sid, token);
  } else {
    console.log("Twilio config vars missing — SMS disabled.");
  }
} catch (e) {
  console.log("Twilio not installed or failed to load — SMS disabled.", e.message);
}

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Signup (sends SMS if Twilio is ready)
app.post("/signup", async (req, res) => {
  const { name, email, phone } = req.body;
  console.log("New signup:", name, email, phone);

  // Try SMS (never crash if it fails)
  try {
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
        body: "Cutbook ✅ Thanks for joining! We’ll email you with instructions shortly."
      });
    } else {
      console.log("SMS skipped (Twilio not ready).");
    }
  } catch (err) {
    console.log("Signup SMS error:", err.message);
  }

  // Big thank-you page
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
