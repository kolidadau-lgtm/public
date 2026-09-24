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

    // ENJIN 1: Publer Video Extractor API (Sangat Kuat Untuk Reels Facebook/Instagram)
    try {
      const publerRes = await fetch('https://publer.io/api/v1/job/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          url: targetUrl,
          iphone: false
        })
      });

      if (publerRes.ok) {
        const publerData = await publerRes.json();
        const jobId = publerData.job_id;

        // Semak status kerja
        if (jobId) {
          for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const statusRes = await fetch(`https://publer.io/api/v1/job/status/${jobId}`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === 'complete' && statusData.payload && statusData.payload.length > 0) {
                downloadLink = statusData.payload[0].path;
                break;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Enjin Publer gagal:", e.message);
    }

    // ENJIN 2: FBDownloader Alternative
    if (!downloadLink) {
      try {
        const altRes = await fetch('https://api.tiklydown.eu.org/api/download?url=' + encodeURIComponent(targetUrl));
        if (altRes.ok) {
          const altData = await altRes.json();
          if (altData?.video?.noWatermark || altData?.url) {
            downloadLink = altData.video?.noWatermark || altData.url;
          }
        }
      } catch (e) {
        console.warn("Enjin Alt gagal:", e.message);
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