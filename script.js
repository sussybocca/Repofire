const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.get('/fetch', (req, res) => {
    const repoUrl = req.query.repo;
    if (!repoUrl) return res.status(400).json({ error: 'No repo URL' });

    const projectName = repoUrl.split('/').pop().replace('.git', '');
    const projectPath = path.join(__dirname, projectName);

    // Clone or pull repo
    if (!fs.existsSync(projectPath)) {
        exec(`git clone ${repoUrl}`, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ localUrl: `http://localhost:4000/${projectName}` });
        });
    } else {
        exec(`git -C ${projectPath} pull`, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ localUrl: `http://localhost:4000/${projectName}` });
        });
    }
});

// Serve the cloned projects on port 4000
app.use('/',
  express.static(__dirname)
);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
