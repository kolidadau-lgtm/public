const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('Enjin Backend Downloader Aktif!');
});

// Fungsi untuk menyelesaikan URL penuh jika ia adalah pautan pendek /share/
async function resolveUrl(targetUrl) {
  try {
    // Menukar web.facebook.com ke www.facebook.com
    let cleanUrl = targetUrl.replace('web.facebook.com', 'www.facebook.com')
                            .replace('m.facebook.com', 'www.facebook.com');

    const response = await fetch(cleanUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    return response.url || cleanUrl;
  } catch (e) {
    return targetUrl;
  }
}

app.post('/api/download', async (req, res) => {
  try {
    let { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Sila masukkan URL yang sah!" });
    }

    // 1. Dapatkan URL rasmi penuh
    const finalUrl = await resolveUrl(url);

    // 2. Gunakan yt-dlp dengan arahan fallback format
    const command = `yt-dlp --no-warnings --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -g -f "b/best" "${finalUrl}"`;

    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("Ralat yt-dlp:", stderr || error.message);
        // Hantar status 200 dengan flag error supaya tidak menjejaskan log 400 di browser console
        return res.status(200).json({ 
          success: false,
          error: "Gagal mengekstrak video. Pastikan pautan adalah awam (Public)." 
        });
      }

      const extractedUrls = stdout.trim().split('\n').filter(u => u.startsWith('http'));

      if (extractedUrls.length > 0) {
        return res.status(200).json({
          success: true,
          downloadUrl: extractedUrls[0],
          message: "Berjaya!"
        });
      } else {
        return res.status(200).json({
          success: false,
          error: "Pautan video tidak dijumpai."
        });
      }
    });

  } catch (err) {
    console.error("Ralat Server:", err);
    return res.status(200).json({ success: false, error: "Ralat dalaman pelayan." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif pada port ${PORT}`);
});