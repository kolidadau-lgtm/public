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

// Fungsi untuk tukar pautan kongsi /share/ kepada URL asal video
async function getFinalUrl(inputUrl) {
  try {
    const response = await fetch(inputUrl, {
      method: 'HEAD',
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

    // Standardkan domain
    url = url.replace("web.facebook.com", "www.facebook.com");

    // Jika pautan jenis /share/ atau fb.watch, cari pautan sebenar dulu
    if (url.includes("/share/") || url.includes("fb.watch")) {
      url = await getFinalUrl(url);
    }

    let downloadUrl = null;

    // STRATEGI 1: Cobalt API v10 Instance
    try {
      const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({
          url: url,
          vQuality: 'max'
        })
      });

      if (cobaltRes.ok) {
        const cobaltData = await cobaltRes.json();
        if (cobaltData.url) {
          downloadUrl = cobaltData.url;
        } else if (cobaltData.picker && cobaltData.picker.length > 0) {
          downloadUrl = cobaltData.picker[0].url;
        }
      }
    } catch (e) {
      console.warn("Cobalt API 1 Gagal:", e.message);
    }

    // STRATEGI 2: SnapSave Universal Fallback
    if (!downloadUrl) {
      try {
        const snapRes = await fetch('https://snapsave.app/action.php?lang=en', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          body: new URLSearchParams({ url: url })
        });

        if (snapRes.ok) {
          const htmlText = await snapRes.text();
          const match = htmlText.match(/href=\\"(https:\/\/[^\\]+)\\"/i) || htmlText.match(/(https?:\/\/[^\s"]+\.mp4[^\s"]*)/i);
          if (match && match[1]) {
            downloadUrl = match[1].replace(/\\/g, '');
          }
        }
      } catch (e) {
        console.warn("SnapSave Gagal:", e.message);
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
        error: "Tidak dapat mengekstrak video ini. Sila pastikan pautan adalah video awam (Public) dan bukannya akaun peribadi/kumpulan tertutup."
      });
    }

  } catch (err) {
    console.error("Ralat Pelayan Internal:", err);
    return res.status(500).json({ error: "Ralat pemprosesan di pelayan." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif pada port ${PORT}`);
});