const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Email (safe init)
let emailTransporter = null;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    emailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log("Email ready ✅");
  } else {
    console.log("Email config vars missing — email disabled.");
  }
} catch (e) {
  console.log("Email failed to init — email disabled.", e.message);
}

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Signup (email-only)
app.post("/signup", async (req, res) => {
  const { name, email, phone } = req.body; // phone can stay on the form even if we don’t text
  console.log("New signup:", name, email, phone);

  // Send confirmation email
  try {
    if (emailTransporter) {
      await emailTransporter.sendMail({
        from: `"Cutbook" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome to Cutbook!",
        html: `<h2>Thanks for signing up, ${name}!</h2>
               <p>We’ll email you with instructions shortly.</p>
               <p>– Cutbook</p>`
      });
      console.log("✅ Email sent to", email);
    } else {
      console.log("Email skipped (not ready).");
    }
  } catch (err) {
    console.log("❌ Email error:", err.message);
  }

  // Thank-you page
  res.send(`
<!DOCTYPE html>
<html>
<head><title>Cutbook - Thank You</title></head>
<body style="font-family:Arial;background:#f8f8f8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="background:white;padding:40px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,0.1);text-align:center;max-width:420px">
    <h1 style="color:#ff0055;margin:0 0 12px">Thank You for Signing Up!</h1>
    <p style="font-size:1.1rem;color:#444;margin:0">We will email you with instructions shortly.</p>
  </div>
</body>
</html>
`);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
