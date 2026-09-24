const express = require('express');
const cors = require('cors');

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

    // STRATEGI 1: Rapid VKR Downloader API
    try {
      const api1 = await fetch(`https://api.vkrdown.com/api/item?url=${encodeURIComponent(url)}`);
      if (api1.ok) {
        const data1 = await api1.json();
        if (data1?.data?.downloads?.length > 0) {
          const stream = data1.data.downloads.find(d => d.extension === 'mp4' || d.quality) || data1.data.downloads[0];
          if (stream?.url) downloadUrl = stream.url;
        }
      }
    } catch (e) {
      console.warn("API 1 Gagal:", e.message);
    }

    // STRATEGI 2: SaveFrom Backend API (Fallback)
    if (!downloadUrl) {
      try {
        const api2 = await fetch('https://worker.sf-tools.com/savefrom.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: new URLSearchParams({ url: url })
        });
        
        if (api2.ok) {
          const data2 = await api2.json();
          if (data2 && data2[0] && data2[0].url && data2[0].url[0]) {
            downloadUrl = data2[0].url[0].url;
          }
        }
      } catch (e) {
        console.warn("API 2 Gagal:", e.message);
      }
    }

    // Response Akhir
    if (downloadUrl) {
      return res.status(200).json({
        success: true,
        downloadUrl: downloadUrl,
        message: "Video berjaya diproses!"
      });
    } else {
      return res.status(400).json({
        error: "Tidak dapat mengekstrak video ini. Pastikan pautan adalah awam (Public) dan cuba sekali lagi."
      });
    }

  } catch (err) {
    console.error("Ralat Pelayan Internal:", err);
    return res.status(500).json({ error: "Ralat pemprosesan di pelayan." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif dan berjalan di port ${PORT}`);
});