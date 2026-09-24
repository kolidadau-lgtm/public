const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('Server Backend Downloader Aktif!');
});

// Fungsi untuk menyelesaikan URL pendek/share menjadi URL asli
async function resolveFinalUrl(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return response.url || targetUrl;
  } catch (e) {
    console.warn("Gagal resolve URL, menggunakan URL asli:", e.message);
    return targetUrl;
  }
}

app.post('/api/download', async (req, res) => {
  try {
    let { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Sila masukkan URL video yang sah!" });
    }

    console.log("URL Awal:", url);

    // 1. Bersihkan prefix web.facebook.com
    url = url.replace("web.facebook.com", "www.facebook.com");

    // 2. Resolve URL jika mengandung link share/shortlink
    if (url.includes("/share/") || url.includes("fb.watch")) {
      url = await resolveFinalUrl(url);
      console.log("URL Setelah Resolve:", url);
    }

    // List Public Cobalt Instances
    const instances = [
      "https://api.cobalt.tools/",
      "https://cobalt-api.koyeb.app/",
      "https://co.wuk.sh/"
    ];

    let downloadUrl = null;

    for (let instanceUrl of instances) {
      try {
        const response = await fetch(instanceUrl, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({
            url: url,
            videoQuality: "720",
            downloadMode: "auto"
          })
        });

        if (response.ok) {
          const data = await response.json();
          downloadUrl = data.url || data.path || (data.picker && data.picker[0]?.url);
          if (downloadUrl) break;
        } else {
          const errBody = await response.text();
          console.warn(`Instance ${instanceUrl} gagal (${response.status}):`, errBody);
        }
      } catch (e) {
        console.warn(`Instance ${instanceUrl} error:`, e.message);
      }
    }

    if (downloadUrl) {
      return res.status(200).json({
        downloadUrl: downloadUrl,
        message: "Video berjaya diproses!"
      });
    } else {
      return res.status(400).json({ 
        error: "Gagal mengambil video. Sila pastikan pautan adalah awam (Public) atau gunakan pautan direct video." 
      });
    }

  } catch (error) {
    console.error("Ralat pelayan:", error);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses video." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif dan berjalan di port ${PORT}`);
});