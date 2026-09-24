const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('Enjin Private Downloader Backend Aktif!');
});

// Fungsi penukaran URL Share ke URL Asal
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

    // Bersihkan format URL Facebook
    url = url.replace("web.facebook.com", "www.facebook.com");
    if (url.includes("/share/") || url.includes("fb.watch")) {
      url = await resolveFinalUrl(url);
    }

    let downloadUrl = null;

    // STRATEGI 1: Cobalt Scraper Engine (Standard Utama untuk Facebook Reels)
    try {
      const cobaltRes = await fetch('https://co.wuk.sh/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          url: url,
          vCodec: 'h264',
          vQuality: 'max'
        })
      });

      if (cobaltRes.ok) {
        const cobaltData = await cobaltRes.json();
        if (cobaltData && (cobaltData.url || cobaltData.picker)) {
          downloadUrl = cobaltData.url || (cobaltData.picker && cobaltData.picker[0] ? cobaltData.picker[0].url : null);
        }
      }
    } catch (e) {
      console.warn(" Cobalt API Gagal:", e.message);
    }

    // STRATEGI 2: SnapSave Direct API
    if (!downloadUrl) {
      try {
        const snapRes = await fetch('https://snapsave.app/action.php?lang=en', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: new URLSearchParams({ url: url })
        });

        if (snapRes.ok) {
          const htmlText = await snapRes.text();
          // Extract link mp4 daripada respon Snapsave
          const match = htmlText.match(/href=\\"(https:\/\/video[^\\]+)\\"/i) || htmlText.match(/https?:\/\/[^\s"]+\.mp4[^\s"]*/i);
          if (match && match[1]) {
            downloadUrl = match[1].replace(/\\/g, '');
          } else if (match && match[0]) {
            downloadUrl = match[0].replace(/\\/g, '');
          }
        }
      } catch (e) {
        console.warn("SnapSave Scraper Gagal:", e.message);
      }
    }

    // Response Hasil
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