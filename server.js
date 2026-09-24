const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('Enjin Multi-Downloader Backend Aktif!');
});

// Selesaikan pautan pendek (/share/ atau fb.watch)
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

    // Bersihkan pautan
    url = url.replace("web.facebook.com", "www.facebook.com");
    if (url.includes("/share/") || url.includes("fb.watch")) {
      url = await resolveFinalUrl(url);
    }

    let downloadUrl = null;

    // STRATEGI 1: Gunakan API Scraper Terus (Paling Cepat & Elak Sekatan IP Render)
    try {
      const apiRes = await fetch(`https://api.vkrdown.com/api/item?url=${encodeURIComponent(url)}`);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.data && data.data.downloads && data.data.downloads.length > 0) {
          const stream = data.data.downloads.find(d => d.extension === 'mp4') || data.data.downloads[0];
          if (stream && stream.url) {
            downloadUrl = stream.url;
          }
        }
      }
    } catch (e) {
      console.warn("Strategi API 1 Gagal, meneruskan ke yt-dlp...", e.message);
    }

    // Jika Strategi 1 Berjaya
    if (downloadUrl) {
      return res.status(200).json({
        success: true,
        downloadUrl: downloadUrl,
        message: "Video berjaya diproses!"
      });
    }

    // STRATEGI 2: Jalankan yt-dlp Tempatan Jika API Utama Tersekat
    const command = `yt-dlp --no-check-certificates --referer "https://www.facebook.com/" --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -g -f "b" "${url}"`;

    exec(command, { timeout: 35000 }, (error, stdout, stderr) => {
      if (!error && stdout) {
        const directLink = stdout.trim().split('\n')[0];
        if (directLink && directLink.startsWith('http')) {
          return res.status(200).json({
            success: true,
            downloadUrl: directLink,
            message: "Video berjaya diproses!"
          });
        }
      }

      console.error("Gagal di kedua-dua strategi:", stderr || error?.message);
      return res.status(500).json({
        error: "Gagal mengekstrak video. Pastikan video tersebut adalah awam (Public) dan cuba semula."
      });
    });

  } catch (err) {
    console.error("Ralat Pelayan Internal:", err);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses pautan." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif dan berjalan di port ${PORT}`);
});