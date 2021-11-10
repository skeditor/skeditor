const path = require('path');
const cp = require('child_process');
const fs = require('fs');
const template = require('lodash.template');
require('dotenv').config();

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, '.output');

cp.execSync('rm -rf ' + outputDir);
cp.execSync('mkdir -p ' + outputDir);

cp.execSync(`cp -r ${path.join(root, '/.nuxt/dist/client')} ${outputDir}/_nuxt`);
cp.execSync(`cp -r ${path.join(root, 'public/*')} ${outputDir}`);

const tpl = template(fs.readFileSync(path.join(__dirname, 'index.template.html')));
const manifest = require(path.join(root, '.nuxt/dist/server/client.manifest.json'));

const html = tpl({ scripts: manifest.initial.map((filename) => `${process.env['PUBLIC_PATH']}_nuxt/${filename}`) });

fs.writeFileSync(path.join(outputDir, 'index.html'), html);

if (process.env.GITHUB_PAGE) {
  const githubPageProjectDir = path.resolve(process.env.GITHUB_PAGE);
  cp.execSync(`cp -r .output/index.html ${githubPageProjectDir}/index.html`);
  cp.execSync(`git commit -am "publish ${new Date().toISOString()}"`, { cwd: githubPageProjectDir });
  cp.execSync(`git push`, { cwd: githubPageProjectDir });
}

require('./upload-oss');

console.log('>>>> post build success <<<<');
