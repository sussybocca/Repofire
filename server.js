// server.js
import express from 'express';
import fetch from 'node-fetch';
import JSZip from 'jszip';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Fetch GitHub repo files
app.post('/fetch-repo', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'repoUrl required' });

    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return res.status(400).json({ error: 'Invalid GitHub URL' });

    const [_, user, repo] = match;
    const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/`;

    const resp = await fetch(apiUrl);
    if (!resp.ok) throw new Error('Failed to fetch repo contents');

    const files = await resp.json();
    const siteFiles = {};

    for (const file of files) {
      if (file.type === 'file') {
        const fileResp = await fetch(file.download_url);
        const content = await fileResp.text();
        siteFiles[file.name] = content;
      }
    }

    res.json(siteFiles);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Deploy to Netlify
app.post('/deploy', async (req, res) => {
  try {
    const { netlifyToken, siteFiles } = req.body;
    if (!netlifyToken || !siteFiles) return res.status(400).json({ error: 'Missing token or files' });

    // Create Netlify site
    const createResp = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${netlifyToken}` }
    });
    const siteData = await createResp.json();
    if (!siteData.id) throw new Error('Failed to create Netlify site');
    const siteId = siteData.id;

    // Zip files
    const zip = new JSZip();
    for (const [name, content] of Object.entries(siteFiles)) {
      zip.file(name, content);
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Deploy zip
    const deployResp = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${netlifyToken}` },
      body: zipBuffer
    });
    const deployData = await deployResp.json();

    res.json(deployData);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
