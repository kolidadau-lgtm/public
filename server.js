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

// Fungsi untuk mendapatkan URL rasmi penuh daripada pautan perkongsian (/share/)
async function resolveFinalUrl(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return response.url || targetUrl;
  } catch (e) {
    return targetUrl;
  }
}

app.post('/api/download', async (req, res) => {
  try {
    let { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Sila masukkan URL video yang sah!" });
    }

    // 1. Bersihkan domain dan selesaikan pautan /share/
    url = url.replace("web.facebook.com", "www.facebook.com");
    if (url.includes("/share/") || url.includes("fb.watch")) {
      url = await resolveFinalUrl(url);
    }

    // 2. Arahan yt-dlp dengan User-Agent & format pengekstrakan selamat
    const command = `yt-dlp --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -g -f "best" "${url}"`;

    exec(command, { timeout: 45000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("Ralat yt-dlp:", stderr || error.message);
        return res.status(500).json({ 
          error: "Gagal mengekstrak video. Pastikan pautan adalah awam (Public) dan cuba sekali lagi." 
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

  } catch (err) {
    console.error("Ralat pelayan:", err);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses video." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server yt-dlp aktif dan berjalan di port ${PORT}`);
});