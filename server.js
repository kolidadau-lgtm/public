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

// Fungsi menyelesaikan URL kongsi pendek Facebook
async function resolveUrl(inputUrl) {
  try {
    const res = await fetch(inputUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      }
    });
    return res.url || inputUrl;
  } catch (e) {
    return inputUrl;
  }
}

app.post('/api/download', async (req, res) => {
  try {
    // Menyokong kedua-dua nama pemboleh ubah dari frontend (url ATAU videoUrl)
    let targetUrl = req.body.url || req.body.videoUrl;

    if (!targetUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "Sila masukkan pautan video yang sah!" 
      });
    }

    // Kemaskini format URL Facebook
    targetUrl = targetUrl.replace("web.facebook.com", "www.facebook.com").replace("m.facebook.com", "www.facebook.com");

    if (targetUrl.includes("/share/") || targetUrl.includes("fb.watch")) {
      targetUrl = await resolveUrl(targetUrl);
    }

    let downloadLink = null;

    // STRATEGI 1: Pengekstrakan Rapid API (VKR Engine)
    try {
      const apiRes = await fetch(`https://api.vkrdown.com/api/item?url=${encodeURIComponent(targetUrl)}`);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data?.data?.downloads?.length > 0) {
          const videoObj = data.data.downloads.find(d => d.extension === 'mp4' || d.quality) || data.data.downloads[0];
          if (videoObj?.url) downloadLink = videoObj.url;
        }
      }
    } catch (e) {
      console.warn("Strategi 1 gagal:", e.message);
    }

    // STRATEGI 2: Fallback Scraper Direct Meta
    if (!downloadLink) {
      try {
        const fbRes = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
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
        console.warn("Strategi 2 gagal:", e.message);
      }
    }

    // Semakan Akhir Keputusan
    if (!downloadLink) {
      return res.status(400).json({ 
        success: false, 
        message: "Gagal mengekstrak video. Sila pastikan pautan adalah daripada video/Reels awam (Public)." 
      });
    }

    return res.json({ 
      success: true, 
      downloadUrl: downloadLink 
    });

  } catch (error) {
    console.error("Ralat Server:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Ralat dalaman pelayan." 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pelayan berjalan pada port ${PORT}`);
});