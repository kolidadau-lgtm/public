const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rute Ujian Utama
app.get('/', (req, res) => {
  res.status(200).send('Server Backend Downloader Aktif!');
});

// Endpoint Utama Muat Turun Video
app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Sila masukkan URL video yang sah!" });
    }

    console.log("Memproses permintaan URL:", url);

    // Senarai API Enjin Awam untuk memproses video FB & Instagram
    const instances = [
      "https://cobalt-api.koyeb.app/",
      "https://api.cobalt.tools/"
    ];

    let downloadUrl = null;

    for (let instanceUrl of instances) {
      try {
        const response = await fetch(instanceUrl, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: url,
            videoQuality: "720"
          })
        });

        if (response.ok) {
          const data = await response.json();
          downloadUrl = data.url || data.path;
          if (downloadUrl) break;
        }
      } catch (e) {
        console.warn("API instance gagal, mencuba pilihan seterusnya...", e.message);
      }
    }

    if (downloadUrl) {
      return res.status(200).json({
        downloadUrl: downloadUrl,
        message: "Video berjaya diproses!"
      });
    } else {
      return res.status(400).json({ 
        error: "Gagal mengambil video. Pastikan pautan adalah awam (Public) atau cuba semula." 
      });
    }

  } catch (error) {
    console.error("Ralat pelayan:", error);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses video." });
  }
});

// Jalankan Pelayan
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif dan berjalan di port ${PORT}`);
});