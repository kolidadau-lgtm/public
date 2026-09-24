const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. MIDDLEWARE (Musti di bahagian paling atas)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. RUTE UTAMA / UJIAN (GET)
app.get('/', (req, res) => {
  res.status(200).send('Server Backend Beroperasi Dengan Baik!');
});

// 3. WAJIB: ENDPOINT POST /api/download
app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Sila masukkan URL video yang sah!" });
    }

    console.log("Permintaan diterima untuk URL:", url);

    // LOGIK MUAT TURUN / PENGAMBILAN PAUTAN VIDEO
    // (Gantikan pautan ini dengan logik scraper/yt-dlp anda)
    const resultDownloadUrl = "https://pautan-video-hasil.com/video.mp4";

    return res.status(200).json({
      downloadUrl: resultDownloadUrl,
      message: "Video berjaya diproses!"
    });

  } catch (error) {
    console.error("Ralat pada backend:", error);
    return res.status(500).json({ error: "Ralat dalaman pelayan semasa memproses video." });
  }
});

// 4. PENANGKAP RALAT 404 (Untuk URL yang tidak wujud)
app.use((req, res) => {
  res.status(404).json({ error: `Laluan ${req.originalUrl} tidak dijumpai pada pelayan ini.` });
});

// 5. MULA PELAYAN (Guna '0.0.0.0' untuk Render)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif dan berjalan di port ${PORT}`);
});
