const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/signup", (req, res) => {
  const { name, email } = req.body;
  console.log("New barber signup:", name, email);
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
      max-width: 400px;
    }
    h1 {
      color: #ff0055;
      margin-bottom: 15px;
    }
    p {
      font-size: 1.1rem;
      color: #444;
    }
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

