const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Membenarkan capaian dari frontend (Firebase / Laman Web)
app.use(cors());
app.use(express.json());

// Endpoint utama untuk ujian
app.get('/', (req, res) => {
  res.json({
    message: 'Backend Downloader API beroperasi!',
    timestamp: new Date().toISOString()
  });
});

// Endpoint untuk status Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});