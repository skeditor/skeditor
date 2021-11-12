import fs from 'fs-extra';
import path from 'path';
import invariant from 'ts-invariant';
import JSZip from 'jszip';
import { SkyModel } from '../lib/editor/model';
import { CanvaskitPromised } from '../lib/editor/util/canvaskit';

const testDir = process.env.TEST_SKETCH_DIRS;

async function loadCase(filename: string) {
  const p = path.join(__dirname, 'cases', filename);
  const file = await fs.readFile(p);
  const jszip = await JSZip.loadAsync(file);
  return jszip;
}

describe('Test against files', () => {
  beforeAll(() => CanvaskitPromised);
  test('There should have a sketch test folder', () => {
    invariant(testDir);
    // expect(fs.statSync(testDir).isDirectory()).toBeTruthy();
    // const testFiles = fs.readdirSync(testDir).filter((file) => file.endsWith('.sketch'));
    // expect(testFiles.length).toBeGreaterThan(0);
  });

  test('load zip file', async () => {
    const jszip = await loadCase('empty.sketch');
    const model = new SkyModel();
    await model.readZipFile(jszip);
    expect(model.pages.length).toBeGreaterThan(0);
    expect(model.isSupportedVersion).toBeTruthy();
  });
});
