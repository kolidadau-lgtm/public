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

// Penukaran URL Share ke URL Asal
async function resolveFinalUrl(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
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

    // Standardkan URL Facebook
    url = url.replace("web.facebook.com", "www.facebook.com");
    if (url.includes("/share/") || url.includes("fb.watch")) {
      url = await resolveFinalUrl(url);
    }

    let downloadUrl = null;

    // STRATEGI 1: FDown Core Scraper
    try {
      const fdownRes = await fetch('https://fdown.net/download.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        body: new URLSearchParams({ URL: url })
      });

      if (fdownRes.ok) {
        const html = await fdownRes.text();
        const hdMatch = html.match(/id="hdlink"\s+href="([^"]+)"/i);
        const sdMatch = html.match(/id="sdlink"\s+href="([^"]+)"/i);

        if (hdMatch && hdMatch[1]) {
          downloadUrl = hdMatch[1].replace(/&amp;/g, '&');
        } else if (sdMatch && sdMatch[1]) {
          downloadUrl = sdMatch[1].replace(/&amp;/g, '&');
        }
      }
    } catch (e) {
      console.warn("FDown Scraper Gagal:", e.message);
    }

    // STRATEGI 2: FBDownloader API Fallback
    if (!downloadUrl) {
      try {
        const apiRes = await fetch(`https://api.vkrdown.com/api/item?url=${encodeURIComponent(url)}`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data?.data?.downloads?.length > 0) {
            const stream = data.data.downloads.find(d => d.extension === 'mp4' || d.quality) || data.data.downloads[0];
            if (stream?.url) downloadUrl = stream.url;
          }
        }
      } catch (e) {
        console.warn("API Fallback Gagal:", e.message);
      }
    }

    // Respons Hasil
    if (downloadUrl) {
      return res.status(200).json({
        success: true,
        downloadUrl: downloadUrl,
        message: "Video berjaya diproses!"
      });
    } else {
      return res.status(400).json({
        error: "Gagal mengekstrak pautan video ini. Sila pastikan pautan adalah video awam (Public)."
      });
    }

  } catch (err) {
    console.error("Ralat Pelayan Internal:", err);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses pautan." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif dan berjalan di port ${PORT}`);
});