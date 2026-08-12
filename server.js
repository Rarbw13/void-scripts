const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

// Helper membaca data dari JSON
const readDatabase = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initialData = { scripts: [] };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { scripts: [] };
  }
};

// Helper menulis data ke JSON
const writeDatabase = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    return false;
  }
};

// Middleware: Hanya izinkan metode GET & POST
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  next();
});

// Middleware: Proteksi Roblox User-Agent
const requireRobloxAgent = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  if (!/roblox/i.test(userAgent)) {
    return res.status(403).json({ 
      error: 'Access Denied. Only Roblox client/bot requests are allowed.' 
    });
  }
  next();
};

// Endpoint Search: /search?q=(nama script)
app.get('/search', requireRobloxAgent, (req, res) => {
  const query = (req.query.q || '').toLowerCase();
  const db = readDatabase();

  if (!query) {
    return res.status(200).json({ scripts: db.scripts });
  }

  const results = db.scripts.filter(item => 
    item.scriptName && item.scriptName.toLowerCase().includes(query)
  );

  res.status(200).json({
    query: query,
    total: results.length,
    scripts: results
  });
});

// Endpoint Upload Script (POST)
app.post('/api/upload', (req, res) => {
  const { scriptName, scriptSource, scriptUploader } = req.body;

  if (!scriptName || !scriptSource) {
    return res.status(400).json({ error: 'scriptName and scriptSource are required!' });
  }

  const db = readDatabase();

  const newScript = {
    scriptId: crypto.randomUUID(),
    scriptName: scriptName,
    scriptSource: scriptSource,
    scriptUploader: scriptUploader || 'Anonymous'
  };

  db.scripts.push(newScript);

  if (writeDatabase(db)) {
    res.status(201).json({
      message: 'Script successfully published!',
      script: newScript
    });
  } else {
    res.status(500).json({ error: 'Failed to save script to database.' });
  }
});

// Fallback Route
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Port & Listen untuk Railway/VPS (Memakai 0.0.0.0)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`VoidScripts API running on port ${PORT}`);
});
