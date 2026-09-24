const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('Backend Downloader Aktif!');
});

app.post('/api/download', async (req, res) => {
  try {
    let { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Sila masukkan URL video yang sah!" });
    }

    // Tukar pautan web.facebook kepada www.facebook
    url = url.replace("web.facebook.com", "www.facebook.com");

    let downloadUrl = null;

    // STRATEGI 1: Gunakan Rapid API Scraper
    try {
      const response = await fetch(`https://api.vkrdown.com/api/item?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.data && data.data.downloads && data.data.downloads.length > 0) {
          const videoStream = data.data.downloads.find(d => d.extension === 'mp4' || d.quality) || data.data.downloads[0];
          if (videoStream && videoStream.url) {
            downloadUrl = videoStream.url;
          }
        }
      }
    } catch (e) {
      console.warn("API 1 Gagal:", e.message);
    }

    // STRATEGI 2: Alternate Service (Jika Strategi 1 Gagal)
    if (!downloadUrl) {
      try {
        const altResponse = await fetch(`https://social-downloader-api.vercel.app/api/facebook?url=${encodeURIComponent(url)}`);
        if (altResponse.ok) {
          const altData = await altResponse.json();
          if (altData && (altData.hd || altData.sd || altData.url)) {
            downloadUrl = altData.hd || altData.sd || altData.url;
          }
        }
      } catch (e) {
        console.warn("API 2 Gagal:", e.message);
      }
    }

    if (downloadUrl) {
      return res.status(200).json({
        success: true,
        downloadUrl: downloadUrl,
        message: "Video berjaya diproses!"
      });
    } else {
      return res.status(400).json({
        error: "Gagal mengekstrak video. Pastikan anda menggunakan pautan penuh video awam (Public) dan bukannya pautan kongsi pendek."
      });
    }

  } catch (err) {
    console.error("Ralat Pelayan:", err);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses pautan." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif pada port ${PORT}`);
});