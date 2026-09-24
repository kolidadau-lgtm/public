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

// Fungsi resolve URL pautan share
async function resolveFinalUrl(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

    url = url.replace("web.facebook.com", "www.facebook.com");
    if (url.includes("/share/") || url.includes("fb.watch")) {
      url = await resolveFinalUrl(url);
    }

    let downloadUrl = null;

    // Percubaan Enjin Direct Scraper
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
      console.warn("Enjin Scraper Gagal:", e.message);
    }

    // Jika berjaya dapat direct link video
    if (downloadUrl) {
      return res.status(200).json({
        downloadUrl: downloadUrl,
        message: "Video berjaya diproses!"
      });
    }

    // Jika enjin scraper disekat, hantar ke portal pemprosesan yang aktif (Tanpa ralat 404)
    const externalPortal = url.includes("facebook.com")
      ? `https://snapsave.app/`
      : `https://snapinst.app/`;

    return res.status(200).json({
      downloadUrl: externalPortal,
      message: "Proses lanjut di portal muat turun."
    });

  } catch (error) {
    console.error("Ralat pelayan:", error);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses video." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif dan berjalan di port ${PORT}`);
});