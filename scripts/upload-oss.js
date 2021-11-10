require('dotenv').config();
const OSS = require('ali-oss');
const glob = require('glob');
const path = require('path');
const fs = require('fs');

const store = new OSS({
  region: process.env['OS_REGION'],
  accessKeyId: process.env['OS_AccessKey_ID'],
  accessKeySecret: process.env['OS_AccessKey_Secret'],
  bucket: process.env['OS_BUCKET'],
});

const folder = path.resolve(__dirname, '..', '.output') + '/';

async function main() {
  glob(folder + '**/*', function (er, files) {
    files = files
      .filter((fileanme) => {
        return fs.statSync(fileanme).isFile();
      })
      .map((filename) => filename.replace(folder, ''));

    files.forEach(async (filename) => {
      try {
        await store.head(filename);
        console.log('>>> File already exist. Ignore >>>', filename);
      } catch (err) {
        console.log('>>> File not exist. Need upload >>>', filename);
        try {
          await store.put(filename, folder + filename);
          console.log('### put file success', filename);
        } catch (err) {
          console.error('!!! put file failed', filename);
        }
      }
    });
  });
}

main();
