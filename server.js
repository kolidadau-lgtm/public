const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Backend Downloader Aktif!');
});

app.post('/api/download', async (req, res) => {
  try {
    let { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Sila masukkan URL video yang sah!" });
    }

    // Gunakan Enjin Awam Cobalt API
    const response = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: url,
        videoQuality: "max"
      })
    });

    const data = await response.json();

    if (data && (data.url || data.picker)) {
      const downloadLink = data.url || (data.picker && data.picker[0] ? data.picker[0].url : null);
      
      if (downloadLink) {
        return res.status(200).json({
          success: true,
          downloadUrl: downloadLink,
          message: "Video berjaya diproses!"
        });
      }
    }

    return res.status(400).json({
      error: "Gagal mengekstrak video. Pastikan pautan adalah daripada video/Reels awam (Public)."
    });

  } catch (err) {
    console.error("Ralat Pelayan:", err);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses pautan." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif pada port ${PORT}`);
});