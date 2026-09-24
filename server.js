const express = require('express');
const cors = require('cors');
const { fbdown } = require('@ndraiki/facebook-downloader');
const instagramGetUrl = require('instagram-url-direct');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend Downloader Active!');
});

app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Sila masukkan URL video!" });
    }

    console.log("Memproses URL:", url);

    // 1. JIKA PAUTAN FACEBOOK
    if (url.includes("facebook.com") || url.includes("fb.watch")) {
      const fbData = await fbdown(url);
      
      // Ambil kualiti HD atau SD
      const finalUrl = fbData.hd || fbData.sd;

      if (finalUrl) {
        return res.json({ downloadUrl: finalUrl, message: "Video Facebook berjaya diproses!" });
      } else {
        return res.status(400).json({ error: "Gagal mengekstrak video Facebook ini." });
      }
    } 
    
    // 2. JIKA PAUTAN INSTAGRAM
    else if (url.includes("instagram.com")) {
      const igData = await instagramGetUrl(url);
      
      if (igData && igData.url_list && igData.url_list.length > 0) {
        return res.json({ downloadUrl: igData.url_list[0], message: "Video Instagram berjaya diproses!" });
      } else {
        return res.status(400).json({ error: "Gagal mengekstrak video Instagram ini." });
      }
    } 
    
    else {
      return res.status(400).json({ error: "Sila guna pautan Facebook atau Instagram yang sah." });
    }

  } catch (error) {
    console.error("Ralat pemprosesan:", error);
    return res.status(500).json({ error: "Ralat semasa mengekstrak video." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di port ${PORT}`);
});