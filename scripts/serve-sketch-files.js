const os = require('os');

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const serveStatic = require('serve-static');
const app = require('express')();
const cors = require('cors');

app.use(cors());

let sketchFileDirs = [];
const dirEnv = process.env['SKETCH_DIRS'];
if (dirEnv) {
  dirEnv.split(':').forEach((path) => {
    if (path) {
      path = path.replace('~', os.homedir());
      sketchFileDirs.push(path);
    }
  });
}

sketchFileDirs = sketchFileDirs.filter((sketchDir) => {
  if (!fs.existsSync(sketchDir)) {
    console.error('Dir not exists', sketchDir);
    return false;
  }
  return true;
});

app.get('/docs', (req, res) => {
  let ret = [];
  sketchFileDirs.forEach((dir) => {
    const list = fs.readdirSync(dir, 'utf-8');
    ret = ret.concat(list);
  });

  res.json(
    ret.filter((file) => {
      return file.endsWith('.sketch');
    })
  );
});

sketchFileDirs.forEach((dir) => {
  app.use('/docs', serveStatic(dir));
});

const port = 3031;
app.listen(port, () => {
  console.log('Serve sketch folders: ', sketchFileDirs);
  console.log('Server at ' + port);
});
