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
  res.send("Thanks for signing up!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

