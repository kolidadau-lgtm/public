const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.post("/api/download", (req, res) => {
  let { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Sila masukkan pautan video!" });
  }

  // Bersihkan URL daripada parameter penjejak
  const cleanUrl = url.split("?")[0];

  // Arahan yt-dlp lengkap dengan User-Agent & Format Fallback
  const command = `npx -y yt-dlp-exec "${cleanUrl}" --dump-json --no-warnings --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"`;

  exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error || !stdout.trim()) {
      console.error("Exec Error:", stderr || error.message);
      return res.status(400).json({ 
        error: "Gagal mengekstrak video. Sila pastikan pautan adalah daripada video/Reels awam (Public) atau cuba pautan lain." 
      });
    }

    try {
      const videoData = JSON.parse(stdout.trim());
      // Ambil pautan direct video
      const downloadUrl = videoData.url || (videoData.formats && videoData.formats[0]?.url);

      if (downloadUrl) {
        return res.json({ downloadUrl });
      } else {
        throw new Error("Pautan direct tidak dijumpai.");
      }
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return res.status(500).json({ error: "Ralat memproses maklumat video." });
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif di port ${PORT}`);
});