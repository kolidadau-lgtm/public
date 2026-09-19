console.log("Hello from root index.js");
const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.post("/", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Sila masukkan URL!" });

  exec(`yt-dlp -g -f "best" "${url}"`, (error, stdout) => {
    if (error) return res.status(500).json({ error: "Gagal mengekstrak video." });
    const downloadUrl = stdout.trim().split("\n")[0];
    res.json({ downloadUrl });
  });
});

app.listen(PORT, () => console.log(`Server aktif di port ${PORT}`));