const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Semakan laluan utama
app.get('/', (req, res) => {
  res.status(200).send('API Multi-Downloader Aktif!');
});

// Fungsi untuk menyelesaikan URL pautan kongsian Facebook (/share/r/)
async function resolveFacebookUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    return response.url || url;
  } catch (e) {
    return url;
  }
}

// Endpoint POST /api/download mengikut panggilan dari frontend
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

    // Selesaikan pautan shortlink /share/r/ sekiranya ada
    if (targetUrl.includes('/share/')) {
      targetUrl = await resolveFacebookUrl(targetUrl);
    }

    let downloadLink = null;

    // Cubaan 1: SnapSave API
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
        const urlMatches = htmlText.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/i) || 
                           htmlText.match(/https:\/\/video[^\s"']+/i);
                           
        if (urlMatches && urlMatches[0]) {
          downloadLink = urlMatches[0].replace(/&amp;/g, '&').replace(/^href="/, '');
        }
      }
    } catch (e) {
      console.warn("SnapSave gagal:", e.message);
    }

    // Cubaan 2: Cobalt API Fallback
    if (!downloadLink) {
      try {
        const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: targetUrl, vQuality: 'max' })
        });

        if (cobaltRes.ok) {
          const cobaltData = await cobaltRes.json();
          downloadLink = cobaltData.url || (cobaltData.picker && cobaltData.picker[0]?.url);
        }
      } catch (e) {
        console.warn("Cobalt gagal:", e.message);
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
    console.error("Ralat Pelayan:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Ralat dalaman pelayan semasa memproses pautan." 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pelayan berjalan pada port ${PORT}`);
});