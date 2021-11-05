/* eslint-disable */
const path = require('path');
const cp = require('child_process');
const fs = require('fs');
const template = require('lodash.template');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, '.output');

cp.execSync('rm -rf ' + outputDir);
cp.execSync('mkdir -p ' + outputDir);

cp.execSync(`cp -r ${path.join(root, '/.nuxt/dist/client')} ${outputDir}/_nuxt`);
cp.execSync(`cp  ${path.join(root, 'public/*')} ${outputDir}`);

const tpl = template(fs.readFileSync(path.join(__dirname, 'index.template.html')));
const manifest = require(path.join(root, '.nuxt/dist/server/client.manifest.json'));

const html = tpl({ scripts: manifest.initial.map((filename) => `/_nuxt/${filename}`) });

fs.writeFileSync(path.join(outputDir, 'index.html'), html);

if (process.env.PUBLISH_DIRS) {
  cp.execSync(`cp -r .output/* ${process.env.PUBLISH_DIRS}`);
}

console.log('>>>> Copied to .output <<<<');
