const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('Enjin Facebook Downloader Aktif!');
});

app.post('/api/download', async (req, res) => {
  try {
    // Terima kedua-dua pemboleh ubah 'url' atau 'videoUrl'
    let rawUrl = req.body.url || req.body.videoUrl;

    if (!rawUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "Sila masukkan pautan video yang sah!" 
      });
    }

    // Kemaskini format URL Facebook
    let cleanUrl = rawUrl.trim().replace("web.facebook.com", "www.facebook.com").replace("m.facebook.com", "www.facebook.com");

    let downloadLink = null;

    // ENJIN 1: API Direct Facebook Parser (AIO Engine)
    try {
      const api1 = await fetch(`https://api.vkrdown.com/api/item?url=${encodeURIComponent(cleanUrl)}`);
      if (api1.ok) {
        const data1 = await api1.json();
        if (data1 && data1.data && data1.data.downloads && data1.data.downloads.length > 0) {
          const videoObj = data1.data.downloads.find(d => d.extension === 'mp4' || d.quality) || data1.data.downloads[0];
          if (videoObj && videoObj.url) {
            downloadLink = videoObj.url;
          }
        }
      }
    } catch (e) {
      console.warn("Enjin 1 gagal:", e.message);
    }

    // ENJIN 2: Social Media Downloader API (Fallback)
    if (!downloadLink) {
      try {
        const api2 = await fetch(`https://social-downloader-api.vercel.app/api/facebook?url=${encodeURIComponent(cleanUrl)}`);
        if (api2.ok) {
          const data2 = await api2.json();
          if (data2 && (data2.hd || data2.sd || data2.url)) {
            downloadLink = data2.hd || data2.sd || data2.url;
          }
        }
      } catch (e) {
        console.warn("Enjin 2 gagal:", e.message);
      }
    }

    // ENJIN 3: FB Video Downloader Endpoint Alternative
    if (!downloadLink) {
      try {
        const api3 = await fetch(`https://a2zdownloader.com/api/get-video-info?url=${encodeURIComponent(cleanUrl)}`);
        if (api3.ok) {
          const data3 = await api3.json();
          if (data3 && data3.url) {
            downloadLink = data3.url;
          }
        }
      } catch (e) {
        console.warn("Enjin 3 gagal:", e.message);
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