const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('Enjin Private yt-dlp Backend Aktif!');
});

app.post('/api/download', (req, res) => {
  let { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Sila masukkan URL video yang sah!" });
  }

  // Menjalankan arahan yt-dlp secara terus dari pelayan anda
  // -g : mengambil URL media asal (direct mp4 link)
  // -f "b" : mengambil format video terperinci yang terbaik
  const command = `yt-dlp -g -f "b" "${url}"`;

  exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error("Ralat yt-dlp:", stderr || error.message);
      return res.status(500).json({ 
        error: "Gagal mengekstrak video. Pastikan pautan adalah awam (Public) atau cuba pautan lain." 
      });
    }

    const videoDirectUrl = stdout.trim().split('\n')[0];

    if (videoDirectUrl && videoDirectUrl.startsWith('http')) {
      return res.status(200).json({
        success: true,
        downloadUrl: videoDirectUrl,
        message: "Video berjaya diproses!"
      });
    } else {
      return res.status(400).json({
        error: "Pautan direct video tidak ditemui."
      });
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server yt-dlp aktif dan berjalan di port ${PORT}`);
});