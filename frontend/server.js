const express = require('express');
const path = require('path');
const open = require('open');

const app = express();
const port = process.env.PORT || 8080;
const staticPath = path.join(__dirname, 'static');

app.use(express.static(staticPath));
app.get('/', (req, res) => res.sendFile(path.join(staticPath, 'standalone.html')));

app.listen(port, () => {
  console.log(`SkyShield frontend available at http://localhost:${port} (serving static/)`);
  open(`http://localhost:${port}`).catch(() => {});
});
