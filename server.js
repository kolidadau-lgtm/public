const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('API Multi-Downloader Aktif!');
});

// Fungsi untuk menukar pautan shortlink /share/r/ kepada URL asal Facebook
async function expandUrl(shortUrl) {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    return response.url || shortUrl;
  } catch (e) {
    return shortUrl;
  }
}

app.post('/api/download', async (req, res) => {
  try {
    let rawUrl = req.body.url || req.body.videoUrl;

    if (!rawUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "Sila masukkan pautan video yang sah!" 
      });
    }

    // Standardkan domain Facebook
    let cleanUrl = rawUrl.trim()
      .replace("web.facebook.com", "www.facebook.com")
      .replace("m.facebook.com", "www.facebook.com");

    // Jika pautan jenis shortlink, dapatkan URL penuhnya dahulu
    if (cleanUrl.includes("/share/") || cleanUrl.includes("fb.watch")) {
      cleanUrl = await expandUrl(cleanUrl);
    }

    let downloadLink = null;

    // STRATEGI 1: Cobalt Official API
    try {
      const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({
          url: cleanUrl,
          vQuality: 'max'
        })
      });

      if (cobaltRes.ok) {
        const cobaltData = await cobaltRes.json();
        if (cobaltData.url) {
          downloadLink = cobaltData.url;
        } else if (cobaltData.picker && cobaltData.picker.length > 0) {
          downloadLink = cobaltData.picker[0].url;
        }
      }
    } catch (e) {
      console.warn("Cobalt API Gagal:", e.message);
    }

    // STRATEGI 2: FB Video Scraper Direct Stream
    if (!downloadLink) {
      try {
        const fbRes = await fetch(cleanUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });

        if (fbRes.ok) {
          const html = await fbRes.text();
          const hdMatch = html.match(/browser_native_hd_url":"([^"]+)"/i) || html.match(/og:video:secure_url"\s+content="([^"]+)"/i);
          const sdMatch = html.match(/browser_native_sd_url":"([^"]+)"/i) || html.match(/og:video"\s+content="([^"]+)"/i);

          if (hdMatch && hdMatch[1]) {
            downloadLink = JSON.parse(`"${hdMatch[1]}"`);
          } else if (sdMatch && sdMatch[1]) {
            downloadLink = JSON.parse(`"${sdMatch[1]}"`);
          }
        }
      } catch (e) {
        console.warn("Direct Scraping Gagal:", e.message);
      }
    }

    // Keputusan Akhir
    if (downloadLink) {
      return res.status(200).json({
        success: true,
        downloadUrl: downloadLink,
        message: "Video berjaya diproses!"
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Gagal mengekstrak video. Sila pastikan pautan adalah daripada video/Reels awam (Public)."
      });
    }

  } catch (err) {
    console.error("Ralat Pelayan Internal:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Ralat dalaman pelayan semasa memproses pautan." 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pelayan berjalan pada port ${PORT}`);
});