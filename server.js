const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('Enjin Facebook Direct Downloader Aktif!');
});

// Fungsi penukaran URL Share ke URL Sebenar Facebook
async function getFinalUrl(inputUrl) {
  try {
    const response = await fetch(inputUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      }
    });
    return response.url || inputUrl;
  } catch (e) {
    return inputUrl;
  }
}

app.post('/api/download', async (req, res) => {
  try {
    let { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Sila masukkan URL video yang sah!" });
    }

    // Standardkan domain Facebook
    url = url.replace("web.facebook.com", "www.facebook.com").replace("m.facebook.com", "www.facebook.com");

    // Selesaikan URL kongsi pendek (/share/r/ atau fb.watch)
    if (url.includes("/share/") || url.includes("fb.watch")) {
      url = await getFinalUrl(url);
    }

    let downloadUrl = null;

    // STRATEGI 1: Direct Facebook HTML Scraping (Membaca Meta Video MP4)
    try {
      const fbResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Dest': 'document'
        }
      });

      if (fbResponse.ok) {
        const html = await fbResponse.text();
        
        // Cari pautan HD atau SD menerusi og:video / meta tag Facebook
        const hdMatch = html.match(/browser_native_hd_url":"([^"]+)"/i) || html.match(/og:video:secure_url"\s+content="([^"]+)"/i);
        const sdMatch = html.match(/browser_native_sd_url":"([^"]+)"/i) || html.match(/og:video"\s+content="([^"]+)"/i);

        if (hdMatch && hdMatch[1]) {
          downloadUrl = JSON.parse(`"${hdMatch[1]}"`);
        } else if (sdMatch && sdMatch[1]) {
          downloadUrl = JSON.parse(`"${sdMatch[1]}"`);
        }
      }
    } catch (e) {
      console.warn("Direct Extraction Gagal:", e.message);
    }

    // STRATEGI 2: Publer API Fallback (Jika Direct Extraction Disekat)
    if (!downloadUrl) {
      try {
        const publerRes = await fetch('https://publer.io/api/v1/media/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          body: JSON.stringify({
            url: url,
            iphone: false
          })
        });

        if (publerRes.ok) {
          const publerData = await publerRes.json();
          if (publerData && publerData.payload && publerData.payload.length > 0) {
            downloadUrl = publerData.payload[0].path;
          }
        }
      } catch (e) {
        console.warn("Publer Fallback Gagal:", e.message);
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
        error: "Gagal mengekstrak video. Sila pastikan pautan adalah daripada video/Reels awam (Public)."
      });
    }

  } catch (err) {
    console.error("Ralat Pelayan Internal:", err);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses pautan." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif pada port ${PORT}`);
});