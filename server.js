const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('Server Backend Downloader Aktif!');
});

// Fungsi untuk mendapatkan URL sebenar daripada pautan kongsi/Reels
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

    // 1. Bersihkan & Selesaikan Pautan URL
    url = url.replace("web.facebook.com", "www.facebook.com");
    if (url.includes("/share/") || url.includes("fb.watch")) {
      url = await resolveFinalUrl(url);
    }

    let downloadUrl = null;

    // 2. Percubaan Enjin 1: API Direct Scraper (SaveFrom/Snapsave Engine Compatible)
    try {
      const response = await fetch(`https://api.vkrdown.com/api/item?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.data && data.data.downloads) {
          const stream = data.data.downloads.find(d => d.extension === 'mp4') || data.data.downloads[0];
          if (stream && stream.url) {
            downloadUrl = stream.url;
          }
        }
      }
    } catch (e) {
      console.warn("Enjin 1 Gagal:", e.message);
    }

    // 3. Percubaan Enjin 2: Fallback Cobalt API
    if (!downloadUrl) {
      const instances = [
        "https://api.cobalt.tools/",
        "https://cobalt-api.koyeb.app/"
      ];

      for (let instanceUrl of instances) {
        try {
          const response = await fetch(instanceUrl, {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            body: JSON.stringify({
              url: url,
              videoQuality: "720"
            })
          });

          if (response.ok) {
            const data = await response.json();
            downloadUrl = data.url || data.path;
            if (downloadUrl) break;
          }
        } catch (e) {
          console.warn("Enjin 2 Cobalt Gagal:", e.message);
        }
      }
    }

    // Jika berjaya dapat pautan video
    if (downloadUrl) {
      return res.status(200).json({
        downloadUrl: downloadUrl,
        message: "Video berjaya diproses!"
      });
    } else {
      // Jika kedua-dua enjin gagal, hantar pautan fallback portal
      const fallbackPortal = url.includes("facebook.com")
        ? `https://fdown.net/downloadphp.php?URL=${encodeURIComponent(url)}`
        : `https://snapinst.app/`;

      return res.status(200).json({
        downloadUrl: fallbackPortal,
        isExternalPortal: true,
        message: "Video diproses menerusi portal muat turun."
      });
    }

  } catch (error) {
    console.error("Ralat pelayan:", error);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses video." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif dan berjalan di port ${PORT}`);
});