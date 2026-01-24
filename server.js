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
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    console.log("Email ready ✅");
  } else {
    console.log("Email config vars missing — email disabled.");
  }
} catch (e) {
  console.log("Email failed to init — email disabled.", e.message);
}

// In-memory storage (MVP)
// NOTE: This resets if Heroku restarts. Later we’ll move to a database.
const businesses = []; // { slug, ownerName, businessName, ownerEmail, phone }
const bookings = [];   // { businessSlug, customerName, customerEmail, service, date, time, createdAt }

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function uniqueSlug(base) {
  let slug = base || "business";
  let i = 1;
  while (businesses.some(b => b.slug === slug)) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Business booking link page (their customers use this)
app.get("/b/:slug", (req, res) => {
  const { slug } = req.params;
  const biz = businesses.find(b => b.slug === slug);

  if (!biz) {
    return res.status(404).send("This booking link was not found.");
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Book with ${biz.businessName}</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f8f8f8; margin:0; }
    .wrap { max-width:520px; margin:60px auto; padding:20px; }
    .card { background:white; padding:24px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,.08); }
    h1 { margin:0 0 8px; }
    p { color:#444; margin:0 0 18px; }
    input, select { width:100%; padding:12px; margin:10px 0; border:1px solid #ccc; border-radius:8px; font-size:1rem; }
    button { width:100%; padding:14px; background:#ff0055; color:white; border:none; border-radius:8px; font-size:1rem; cursor:pointer; }
    .small { font-size:.9rem; color:#666; margin-top:10px; text-align:center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Book with ${biz.businessName}</h1>
      <p>Pick your service and time. You’ll get an email confirmation.</p>

      <form action="/book" method="POST">
        <input type="hidden" name="businessSlug" value="${biz.slug}" />

        <input name="customerName" placeholder="Your name" required />
        <input type="email" name="customerEmail" placeholder="Your email" required />

        <select name="service" required>
          <option value="Appointment">Appointment</option>
          <option value="Haircut">Haircut</option>
          <option value="Haircut + Beard">Haircut + Beard</option>
          <option value="Beard">Beard</option>
        </select>

        <input name="date" type="date" required />
        <input name="time" type="time" required />

        <button type="submit">Book Appointment</button>
      </form>

      <div class="small">Powered by Cutbook</div>
    </div>
  </div>
</body>
</html>
`);
});

// Signup (creates a business + gives them their booking link)
app.post("/signup", async (req, res) => {
  const { name, businessName, email, phone } = req.body;
  console.log("New signup:", name, businessName, email, phone);

  const base = slugify(businessName || name);
  const slug = uniqueSlug(base);

  businesses.push({
    slug,
    ownerName: name,
    businessName,
    ownerEmail: email,
    phone
  });

  const bookingLink = `${req.protocol}://${req.get("host")}/b/${slug}`;

  // Email the owner their booking link
  try {
    if (emailTransporter) {
      await emailTransporter.sendMail({
        from: `"Cutbook" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Cutbook booking link is ready",
        html: `
          <h2>You're set up, ${name} ✅</h2>
          <p><b>Your booking link:</b> <a href="${bookingLink}">${bookingLink}</a></p>
          <p>Put this link in your Instagram bio and send it to clients.</p>
          <p>– Cutbook</p>
        `
      });
      console.log("✅ Owner link email sent to", email);
    } else {
      console.log("Email skipped (not ready).");
    }
  } catch (err) {
    console.log("❌ Email error:", err.message);
  }

  // Thank-you page shows their link too
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Cutbook - You're Set</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body{font-family:Arial;background:#f8f8f8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
    .box{background:white;padding:40px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.1);text-align:center;max-width:520px}
    h1{color:#ff0055;margin:0 0 12px}
    p{font-size:1.05rem;color:#444}
    .link{display:block;margin:14px 0;padding:12px;border:1px solid #eee;border-radius:10px;background:#fafafa;word-break:break-all}
    a{color:#ff0055;font-weight:bold;text-decoration:none}
  </style>
</head>
<body>
  <div class="box">
    <h1>You're set up ✅</h1>
    <p>This is your booking link. Share it with clients:</p>
    <span class="link">${bookingLink}</span>
    <p><a href="${bookingLink}">Open your booking page</a></p>
    <p>We also emailed this link to you.</p>
  </div>
</body>
</html>
`);
});

// Booking submission (emails customer + business owner)
app.post("/book", async (req, res) => {
  const { businessSlug, customerName, customerEmail, service, date, time } = req.body;
  const biz = businesses.find(b => b.slug === businessSlug);

  if (!biz) {
    return res.status(404).send("Business not found.");
  }

  bookings.push({
    businessSlug,
    customerName,
    customerEmail,
    service,
    date,
    time,
    createdAt: new Date().toISOString()
  });

  // Email customer confirmation
  try {
    if (emailTransporter) {
      await emailTransporter.sendMail({
        from: `"${biz.businessName}" <${process.env.EMAIL_USER}>`,
        to: customerEmail,
        subject: `Booking confirmed: ${biz.businessName}`,
        html: `
          <h2>Booking confirmed ✅</h2>
          <p><b>Business:</b> ${biz.businessName}</p>
          <p><b>Service:</b> ${service}</p>
          <p><b>Date:</b> ${date}</p>
          <p><b>Time:</b> ${time}</p>
          <p>See you soon!</p>
        `
      });

      // Email owner notification
      await emailTransporter.sendMail({
        from: `"Cutbook" <${process.env.EMAIL_USER}>`,
        to: biz.ownerEmail,
        subject: `New booking for ${biz.businessName}`,
        html: `
          <h2>New booking ✅</h2>
          <p><b>Customer:</b> ${customerName} (${customerEmail})</p>
          <p><b>Service:</b> ${service}</p>
          <p><b>Date:</b> ${date}</p>
          <p><b>Time:</b> ${time}</p>
        `
      });

      console.log("✅ Booking emails sent");
    } else {
      console.log("Email skipped (not ready).");
    }
  } catch (err) {
    console.log("❌ Booking email error:", err.message);
  }

  res.send(`
<!DOCTYPE html>
<html>
<head><title>Booked</title><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="font-family:Arial;background:#f8f8f8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="background:white;padding:40px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.1);text-align:center;max-width:420px">
    <h1 style="color:#ff0055;margin:0 0 12px">Booked ✅</h1>
    <p style="font-size:1.05rem;color:#444;margin:0">Check your email for confirmation.</p>
  </div>
</body>
</html>
`);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
