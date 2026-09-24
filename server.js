const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('API Video Downloader Aktif!');
});

app.post('/api/download', async (req, res) => {
  try {
    let rawUrl = req.body.url || req.body.videoUrl;

    if (!rawUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "Sila masukkan pautan video yang sah!" 
      });
    }

    let targetUrl = rawUrl.trim();
    let downloadLink = null;

    // ENJIN 1: Fast SaveFrom API Engine
    try {
      const response = await fetch('https://worker.sf-tools.com/savefrom.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        body: new URLSearchParams({ sf_url: targetUrl })
      });

      if (response.ok) {
        const textData = await response.text();
        const jsonMatch = textData.match(/({.*})/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.url?.[0]?.url) {
            downloadLink = parsed.url[0].url;
          }
        }
      }
    } catch (e) {
      console.warn("Enjin SaveFrom gagal:", e.message);
    }

    // ENJIN 2: Social Media Downloader Fallback
    if (!downloadLink) {
      try {
        const apiRes = await fetch('https://api.tiklydown.eu.org/api/download?url=' + encodeURIComponent(targetUrl));
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data?.video?.noWatermark || data?.url) {
            downloadLink = data.video?.noWatermark || data.url;
          }
        }
      } catch (e) {
        console.warn("Enjin Tiklydown gagal:", e.message);
      }
    }

    // ENJIN 3: Direct Facebook HTML Meta Scraper
    if (!downloadLink) {
      try {
        const cleanFbUrl = targetUrl.replace("web.facebook.com", "www.facebook.com").replace("m.facebook.com", "www.facebook.com");
        const fbRes = await fetch(cleanFbUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
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
        console.warn("Enjin Direct HTML gagal:", e.message);
      }
    }

    // Keputusan
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