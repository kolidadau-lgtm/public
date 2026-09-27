const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server Downloader Aktif!');
});

app.post('/api/download', (req, res) => {
  const targetUrl = req.body.url || req.body.videoUrl;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Sila masukkan pautan video!' });
  }

  // Menggunakan yt-dlp dengan sokongan pautan redirect / share
  const command = `./yt-dlp -j --no-playlist "${targetUrl}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Ralat yt-dlp:', stderr || error.message);
      return res.status(400).json({
        error: 'Gagal mengekstrak video. Sila pastikan pautan adalah daripada video/Reels awam (Public).'
      });
    }

    try {
      const info = JSON.parse(stdout);
      const downloadUrl = info.url || (info.formats && info.formats[info.formats.length - 1].url);

      if (downloadUrl) {
        return res.json({
          success: true,
          downloadUrl: downloadUrl
        });
      } else {
        throw new Error('Pautan tidak dijumpai');
      }
    } catch (parseError) {
      console.error('Ralat Parsing:', parseError);
      return res.status(400).json({
        error: 'Gagal mengekstrak video. Sila pastikan pautan adalah daripada video/Reels awam (Public).'
      });
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server beroperasi di port ${PORT}`);
});