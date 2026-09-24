const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('API Downloader Aktif!');
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

    // ENJIN 1: SnapSave Public API Parser (Sangat Stabil Untuk Facebook Reels & Shorts)
    try {
      const params = new URLSearchParams();
      params.append('url', targetUrl);

      const snapRes = await fetch('https://snapsave.app/action.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Origin': 'https://snapsave.app',
          'Referer': 'https://snapsave.app/'
        },
        body: params
      });

      if (snapRes.ok) {
        const htmlText = await snapRes.text();
        
        // Ekstrak URL video daripada respon SnapSave
        const urlMatches = htmlText.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/i) || 
                           htmlText.match(/https:\/\/video[^\s"']+/i);
                           
        if (urlMatches && urlMatches[0]) {
          downloadLink = urlMatches[0].replace(/&amp;/g, '&').replace(/^href="/, '');
        }
      }
    } catch (e) {
      console.warn("Enjin SnapSave gagal:", e.message);
    }

    // ENJIN 2: TiklyDown Fallback (Instagram & Facebook)
    if (!downloadLink) {
      try {
        const altRes = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(targetUrl)}`);
        if (altRes.ok) {
          const altData = await altRes.json();
          if (altData?.video?.noWatermark || altData?.url) {
            downloadLink = altData.video?.noWatermark || altData.url;
          }
        }
      } catch (e) {
        console.warn("Enjin Fallback gagal:", e.message);
      }
    }

    // ENJIN 3: Direct Rapid Extractor
    if (!downloadLink) {
      try {
        const vkrRes = await fetch(`https://api.vkrdown.com/api/item?url=${encodeURIComponent(targetUrl)}`);
        if (vkrRes.ok) {
          const vkrData = await vkrRes.json();
          if (vkrData?.data?.downloads?.[0]?.url) {
            downloadLink = vkrData.data.downloads[0].url;
          }
        }
      } catch (e) {
        console.warn("Enjin VKR gagal:", e.message);
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